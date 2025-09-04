import json
from datetime import datetime, timedelta
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash
from sqlalchemy import func, desc
from app import db
from models import User, MoodLog, DASS21Result, StudentMessage
from forms import LoginForm, RegisterForm, EmotionLogForm, ConsultationForm

# Create blueprints
main_bp = Blueprint('main', __name__)
auth_bp = Blueprint('auth', __name__)
api_bp = Blueprint('api', __name__)
admin_bp = Blueprint('admin', __name__)

# Main routes
@main_bp.route('/')
def index():
    if current_user.is_authenticated:
        if current_user.is_admin:
            return redirect(url_for('admin.dashboard'))
        return redirect(url_for('main.home'))
    
    login_form = LoginForm()
    register_form = RegisterForm()
    return render_template('index.html', login_form=login_form, register_form=register_form)

@main_bp.route('/home')
@login_required
def home():
    if current_user.is_admin:
        return redirect(url_for('admin.dashboard'))
    
    # Get recent mood logs for user
    recent_logs = MoodLog.query.filter_by(id=current_user.id).order_by(desc(MoodLog.log_date)).limit(5).all()
    
    # Get latest DASS-21 result
    latest_dass = DASS21Result.query.filter_by(user_id=current_user.id).order_by(desc(DASS21Result.created_at)).first()
    
    return render_template('home.html', recent_logs=recent_logs, latest_dass=latest_dass)

@main_bp.route('/profile')
@login_required
def profile():
    return render_template('profile.html', user=current_user)

@main_bp.route('/emotion-log', methods=['GET', 'POST'])
@login_required
def emotion_log():
    form = EmotionLogForm()
    
    if form.validate_on_submit():
        try:
            emotions_data = json.loads(form.emotions.data or '[]')
            
            # Create mood log entries for each selected emotion
            for emotion in emotions_data:
                mood_log = MoodLog()
                mood_log.id = current_user.id
                mood_log.emotion = emotion
                mood_log.sleep = form.sleep.data
                mood_log.energy = form.energy.data
                mood_log.triggers = form.triggers.data
                mood_log.coping = form.coping.data
                mood_log.gratitude = form.gratitude.data
                db.session.add(mood_log)
            
            db.session.commit()
            flash('Mood log saved successfully!', 'success')
            return redirect(url_for('main.home'))
            
        except json.JSONDecodeError:
            flash('Invalid emotion data. Please try again.', 'error')
        except Exception as e:
            db.session.rollback()
            flash('An error occurred while saving your log. Please try again.', 'error')
    
    return render_template('emotion_log.html', form=form)

@main_bp.route('/dass21-quiz')
@login_required
def dass21_quiz():
    # Get emotions from session if available
    emotions = session.get('emotions', [])
    
    # DASS-21 questions with their subscales
    dass21_questions = [
        {'id': 1, 'text': "I found it hard to wind down.", 'scale': 'S'},
        {'id': 2, 'text': "I was aware of dryness of my mouth.", 'scale': 'A'},
        {'id': 3, 'text': "I couldn't seem to experience any positive feeling at all.", 'scale': 'D'},
        {'id': 4, 'text': "I experienced breathing difficulty (e.g., excessively rapid breathing, shortness of breath for no reason).", 'scale': 'A'},
        {'id': 5, 'text': "I found it difficult to get started on things.", 'scale': 'D'},
        {'id': 6, 'text': "I tended to over-react to situations.", 'scale': 'S'},
        {'id': 7, 'text': "I experienced trembling (e.g., in the hands).", 'scale': 'A'},
        {'id': 8, 'text': "I felt that I was using a lot of nervous energy.", 'scale': 'S'},
        {'id': 9, 'text': "I was worried about situations in which I might panic and make a fool of myself.", 'scale': 'A'},
        {'id': 10, 'text': "I felt that I had nothing to look forward to.", 'scale': 'D'},
        {'id': 11, 'text': "I found myself getting agitated.", 'scale': 'S'},
        {'id': 12, 'text': "I found it difficult to relax.", 'scale': 'S'},
        {'id': 13, 'text': "I felt down-hearted and blue.", 'scale': 'D'},
        {'id': 14, 'text': "I was intolerant of anything that kept me from getting on with what I was doing.", 'scale': 'S'},
        {'id': 15, 'text': "I felt I was close to panic.", 'scale': 'A'},
        {'id': 16, 'text': "I was unable to experience any positive feeling at all.", 'scale': 'D'},
        {'id': 17, 'text': "I felt that I wasn't worth much as a person.", 'scale': 'D'},
        {'id': 18, 'text': "I felt that I was rather touchy.", 'scale': 'S'},
        {'id': 19, 'text': "I was aware of the action of my heart in the absence of physical exertion (e.g., sense of heart rate increase, heart missing a beat).", 'scale': 'A'},
        {'id': 20, 'text': "I felt scared without any good reason.", 'scale': 'A'},
        {'id': 21, 'text': "I felt that life was meaningless.", 'scale': 'D'}
    ]
    
    return render_template('dass21_quiz.html', questions=dass21_questions, emotions=emotions)

@main_bp.route('/process-dass21', methods=['POST'])
@login_required
def process_dass21():
    try:
        # DASS-21 item mappings
        depression_items = [3, 5, 10, 13, 16, 17, 21]
        anxiety_items = [2, 4, 7, 9, 15, 19, 20]
        stress_items = [1, 6, 8, 11, 12, 14, 18]
        
        # Initialize scores
        depression_score = 0
        anxiety_score = 0
        stress_score = 0
        
        # Calculate raw scores
        for i in range(1, 22):
            question_key = f'q{i}'
            if question_key in request.form:
                score = int(request.form[question_key])
                
                if i in depression_items:
                    depression_score += score
                elif i in anxiety_items:
                    anxiety_score += score
                elif i in stress_items:
                    stress_score += score
        
        # Multiply by 2 for DASS-21 final scores
        depression_final = depression_score * 2
        anxiety_final = anxiety_score * 2
        stress_final = stress_score * 2
        
        # Determine severity levels
        def get_severity(score, scale_type):
            thresholds = {
                'D': {'Normal': (0, 9), 'Mild': (10, 13), 'Moderate': (14, 20), 'Severe': (21, 27), 'Extremely Severe': (28, 100)},
                'A': {'Normal': (0, 7), 'Mild': (8, 9), 'Moderate': (10, 14), 'Severe': (15, 19), 'Extremely Severe': (20, 100)},
                'S': {'Normal': (0, 14), 'Mild': (15, 18), 'Moderate': (19, 25), 'Severe': (26, 33), 'Extremely Severe': (34, 100)}
            }
            
            for severity, (min_val, max_val) in thresholds[scale_type].items():
                if min_val <= score <= max_val:
                    return severity
            return 'N/A'
        
        depression_severity = get_severity(depression_final, 'D')
        anxiety_severity = get_severity(anxiety_final, 'A')
        stress_severity = get_severity(stress_final, 'S')
        
        # Save results to database
        dass_result = DASS21Result()
        dass_result.user_id = current_user.id
        dass_result.depression_score = depression_final
        dass_result.anxiety_score = anxiety_final
        dass_result.stress_score = stress_final
        dass_result.depression_severity = depression_severity
        dass_result.anxiety_severity = anxiety_severity
        dass_result.stress_severity = stress_severity
        
        db.session.add(dass_result)
        db.session.commit()
        
        return render_template('dass21_results.html', 
                             depression_score=depression_final,
                             anxiety_score=anxiety_final,
                             stress_score=stress_final,
                             depression_severity=depression_severity,
                             anxiety_severity=anxiety_severity,
                             stress_severity=stress_severity)
        
    except Exception as e:
        db.session.rollback()
        flash('An error occurred while processing your assessment. Please try again.', 'error')
        return redirect(url_for('main.dass21_quiz'))

@main_bp.route('/consultation', methods=['GET', 'POST'])
@login_required
def consultation():
    form = ConsultationForm()
    
    if form.validate_on_submit():
        message = StudentMessage()
        message.sender_user_id = current_user.id
        message.message_text = form.message_text.data
        db.session.add(message)
        db.session.commit()
        
        flash('Your message has been sent to the guidance office.', 'success')
        return redirect(url_for('main.consultation'))
    
    # Get user's previous messages
    messages = StudentMessage.query.filter_by(sender_user_id=current_user.id).order_by(desc(StudentMessage.created_at)).all()
    
    return render_template('consultation.html', form=form, messages=messages)

# Authentication routes
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.home'))
    
    form = LoginForm()
    
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        
        if user and user.check_password(form.password.data):
            login_user(user)
            flash(f'Welcome back, {user.firstname}!', 'success')
            
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)
            
            if user.is_admin:
                return redirect(url_for('admin.dashboard'))
            return redirect(url_for('main.home'))
        
        flash('Invalid email or password.', 'error')
    
    return render_template('index.html', login_form=form)

@auth_bp.route('/register', methods=['POST'])
def register():
    form = RegisterForm()
    
    if form.validate_on_submit():
        # Check if user already exists
        existing_user = User.query.filter_by(email=form.email.data).first()
        if existing_user:
            flash('Email already registered. Please use a different email.', 'error')
            return redirect(url_for('main.index'))
        
        # Create new user
        user = User()
        user.firstname = form.firstname.data
        user.lastname = form.lastname.data
        user.email = form.email.data
        user.gender = form.gender.data
        user.strand = form.strand.data
        user.grade_level = form.grade_level.data
        user.section = form.section.data
        user.set_password(form.password.data)
        
        db.session.add(user)
        db.session.commit()
        
        login_user(user)
        flash('Registration successful! Welcome to MindTrack.', 'success')
        return redirect(url_for('main.home'))
    
    # If form validation fails, flash errors
    for field, errors in form.errors.items():
        for error in errors:
            flash(f'{field}: {error}', 'error')
    
    return redirect(url_for('main.index'))

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out successfully.', 'info')
    return redirect(url_for('main.index'))

# API routes
@api_bp.route('/check-login-status')
def check_login_status():
    return jsonify({'isLoggedIn': current_user.is_authenticated})

@api_bp.route('/weekly-insights')
@login_required
def weekly_insights():
    # Get last 7 mood logs
    week_ago = datetime.utcnow() - timedelta(days=7)
    logs = MoodLog.query.filter(
        MoodLog.id == current_user.id,
        MoodLog.log_date >= week_ago
    ).all()
    
    if not logs:
        return jsonify({
            'emotion': 'No data',
            'average_sleep': 0,
            'sleep_advice': 'No sleep data available',
            'trigger': 'No data',
            'coping': 'No data',
            'gratitude': 'No gratitude entries yet'
        })
    
    # Calculate insights
    emotions = [log.emotion for log in logs]
    sleep_hours = [log.sleep for log in logs]
    triggers = [log.triggers for log in logs]
    copings = [log.coping for log in logs if log.coping]
    gratitudes = [log.gratitude for log in logs if log.gratitude]
    
    # Most common emotion
    most_common_emotion = max(set(emotions), key=emotions.count) if emotions else 'No data'
    
    # Average sleep
    average_sleep = sum(sleep_hours) / len(sleep_hours) if sleep_hours else 0
    
    # Sleep advice
    if average_sleep < 7:
        sleep_advice = "You need more sleep to maintain a healthy balance."
    elif average_sleep > 9:
        sleep_advice = "You might be oversleeping, try to regulate your sleep schedule."
    else:
        sleep_advice = "Your sleep pattern is within the healthy range."
    
    # Most common trigger and coping
    most_common_trigger = max(set(triggers), key=triggers.count) if triggers else 'No data'
    most_common_coping = max(set(copings), key=copings.count) if copings else 'No data'
    
    # Latest gratitude
    latest_gratitude = gratitudes[-1] if gratitudes else 'No gratitude entries yet'
    
    return jsonify({
        'emotion': most_common_emotion,
        'average_sleep': round(average_sleep, 1),
        'sleep_advice': sleep_advice,
        'trigger': most_common_trigger,
        'coping': most_common_coping,
        'gratitude': latest_gratitude
    })

@api_bp.route('/mood-logs')
@login_required
def get_mood_logs():
    logs = MoodLog.query.filter_by(id=current_user.id).order_by(desc(MoodLog.log_date)).limit(20).all()
    
    logs_data = []
    for log in logs:
        logs_data.append({
            'log_id': log.log_id,
            'emotion': log.emotion,
            'sleep': log.sleep,
            'energy': log.energy,
            'triggers': log.triggers,
            'coping': log.coping,
            'gratitude': log.gratitude,
            'log_date': log.log_date.strftime('%Y-%m-%d %H:%M')
        })
    
    return jsonify(logs_data)

@api_bp.route('/dass-insights')
@login_required
def get_dass_insights():
    latest_result = DASS21Result.query.filter_by(user_id=current_user.id).order_by(desc(DASS21Result.created_at)).first()
    
    if not latest_result:
        return jsonify({'success': False, 'message': 'No DASS-21 results found.'})
    
    return jsonify({
        'success': True,
        'data': {
            'depression_score': latest_result.depression_score,
            'anxiety_score': latest_result.anxiety_score,
            'stress_score': latest_result.stress_score,
            'depression_severity': latest_result.depression_severity,
            'anxiety_severity': latest_result.anxiety_severity,
            'stress_severity': latest_result.stress_severity
        }
    })

# Admin routes
@admin_bp.route('/dashboard')
@login_required
def dashboard():
    if not current_user.is_admin:
        flash('Access denied. Admin privileges required.', 'error')
        return redirect(url_for('main.home'))
    
    # Get statistics for admin dashboard
    total_users = User.query.filter_by(is_admin=False).count()
    total_logs = MoodLog.query.count()
    unread_messages = StudentMessage.query.filter_by(is_read=False).count()
    
    # Recent activity
    recent_logs = db.session.query(MoodLog, User).join(User, MoodLog.id == User.id).order_by(desc(MoodLog.log_date)).limit(10).all()
    
    # Get students with concerning DASS-21 scores
    concerning_students = db.session.query(DASS21Result, User).join(User, DASS21Result.user_id == User.id).filter(
        (DASS21Result.depression_severity.in_(['Severe', 'Extremely Severe'])) |
        (DASS21Result.anxiety_severity.in_(['Severe', 'Extremely Severe'])) |
        (DASS21Result.stress_severity.in_(['Severe', 'Extremely Severe']))
    ).order_by(desc(DASS21Result.created_at)).limit(10).all()
    
    return render_template('admin_dashboard.html',
                         total_users=total_users,
                         total_logs=total_logs,
                         unread_messages=unread_messages,
                         recent_logs=recent_logs,
                         concerning_students=concerning_students)

@admin_bp.route('/messages')
@login_required
def messages():
    if not current_user.is_admin:
        flash('Access denied. Admin privileges required.', 'error')
        return redirect(url_for('main.home'))
    
    messages = db.session.query(StudentMessage, User).join(User, StudentMessage.sender_user_id == User.id).order_by(desc(StudentMessage.created_at)).all()
    
    return render_template('admin_messages.html', messages=messages)

@admin_bp.route('/respond-message/<int:message_id>', methods=['POST'])
@login_required
def respond_message(message_id):
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Access denied'})
    
    message = StudentMessage.query.get_or_404(message_id)
    response_text = request.form.get('response_text')
    
    if response_text:
        message.admin_response = response_text
        message.is_read = True
        message.responded_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Response sent successfully'})
    
    return jsonify({'success': False, 'message': 'Response text is required'})
