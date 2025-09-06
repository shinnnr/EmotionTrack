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
                             stress_severity=stress_severity,
                             moment=datetime.now)
        
    except Exception as e:
        db.session.rollback()
        print(f"DASS-21 processing error: {str(e)}")  # For debugging
        flash(f'An error occurred while processing your assessment: {str(e)}', 'error')
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
    
    # Debug form validation
    print(f"Request method: {request.method}")
    print(f"Form errors: {form.errors}")
    print(f"Form data - email: {form.email.data}, password: {'***' if form.password.data else 'None'}")
    
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        print(f"Login attempt - Email: {form.email.data}")
        print(f"User found: {user is not None}")
        
        if user:
            print(f"User exists: {user.email}, Admin: {user.is_admin}")
            password_check = user.check_password(form.password.data)
            print(f"Password check result: {password_check}")
            
            if password_check:
                login_user(user)
                flash(f'Welcome back, {user.firstname}!', 'success')
                
                next_page = request.args.get('next')
                if next_page:
                    return redirect(next_page)
                
                if user.is_admin:
                    return redirect(url_for('admin.dashboard'))
                return redirect(url_for('main.home'))
        
        flash('Invalid email or password.', 'error')
    
    register_form = RegisterForm()
    return render_template('index.html', login_form=form, register_form=register_form)

@auth_bp.route('/register', methods=['POST'])
def register():
    form = RegisterForm()
    
    if form.validate_on_submit():
        print(f"Registration form validated successfully")
        print(f"Form data - Email: {form.email.data}, FirstName: {form.firstname.data}")
        
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
        
        print(f"User created successfully: {user.email}")
        login_user(user)
        flash('Registration successful! Welcome to EmotionTrack.', 'success')
        return redirect(url_for('main.home'))
    else:
        print(f"Form validation failed: {form.errors}")
    
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
    
    # Get all students who have sent messages, grouped by student
    students_with_messages = db.session.query(User).join(StudentMessage, User.id == StudentMessage.sender_user_id).distinct().all()
    
    # Get all students for the complete list
    all_students = User.query.filter_by(is_admin=False).all()
    
    student_conversations = []
    
    for student in all_students:
        # Get latest message for this student
        latest_message = StudentMessage.query.filter_by(sender_user_id=student.id).order_by(desc(StudentMessage.created_at)).first()
        
        # Count total messages
        message_count = StudentMessage.query.filter_by(sender_user_id=student.id).count()
        
        # Count unread messages
        unread_count = StudentMessage.query.filter_by(sender_user_id=student.id, is_read=False).count()
        
        conversation = {
            'user': student,
            'latest_message': latest_message,
            'message_count': message_count,
            'unread_count': unread_count,
            'has_unread': unread_count > 0
        }
        
        student_conversations.append(conversation)
    
    # Sort by latest activity (students with recent messages first)
    student_conversations.sort(key=lambda x: x['latest_message'].created_at if x['latest_message'] else datetime.min, reverse=True)
    
    return render_template('admin_messages.html', student_conversations=student_conversations)

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

@admin_bp.route('/student-chat/<int:user_id>')
@login_required
def student_chat(user_id):
    if not current_user.is_admin:
        flash('Access denied. Admin privileges required.', 'error')
        return redirect(url_for('main.home'))
    
    student = User.query.get_or_404(user_id)
    if student.is_admin:
        flash('Cannot chat with admin users.', 'error')
        return redirect(url_for('admin.messages'))
    
    # Get all messages for this student
    messages = StudentMessage.query.filter_by(sender_user_id=user_id).order_by(StudentMessage.created_at).all()
    
    # Mark all messages as read
    for message in messages:
        if not message.is_read:
            message.is_read = True
    db.session.commit()
    
    return render_template('admin_chat.html', student=student, messages=messages)

@admin_bp.route('/send-message/<int:user_id>', methods=['POST'])
@login_required
def send_message(user_id):
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Access denied'})
    
    student = User.query.get_or_404(user_id)
    if student.is_admin:
        return jsonify({'success': False, 'message': 'Cannot message admin users'})
    
    message_text = request.form.get('message_text')
    if not message_text:
        return jsonify({'success': False, 'message': 'Message text is required'})
    
    # Create a new message from admin to student
    # We'll use the same StudentMessage model but indicate it's from admin
    message = StudentMessage()
    message.sender_user_id = user_id  # Keep the student as the "sender" for filtering
    message.message_text = f"[ADMIN] {message_text}"  # Prefix to indicate admin message
    message.admin_response = message_text  # Also store in admin_response field
    message.is_read = True
    message.responded_at = datetime.utcnow()
    
    db.session.add(message)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Message sent successfully'})

# Admin API routes
@admin_bp.route('/api/unread-messages-count')
@login_required
def get_unread_messages_count():
    if not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403
    
    count = StudentMessage.query.filter_by(is_read=False).count()
    return jsonify({'count': count})

@admin_bp.route('/api/dashboard-stats')
@login_required  
def get_dashboard_stats():
    if not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403
    
    total_users = User.query.filter_by(is_admin=False).count()
    total_logs = MoodLog.query.count()
    unread_messages = StudentMessage.query.filter_by(is_read=False).count()
    
    # Count high risk students
    concerning_count = db.session.query(DASS21Result).join(User, DASS21Result.user_id == User.id).filter(
        (DASS21Result.depression_severity.in_(['Severe', 'Extremely Severe'])) |
        (DASS21Result.anxiety_severity.in_(['Severe', 'Extremely Severe'])) |
        (DASS21Result.stress_severity.in_(['Severe', 'Extremely Severe']))
    ).count()
    
    return jsonify({
        'total_users': total_users,
        'total_logs': total_logs,
        'unread_messages': unread_messages,
        'concerning_students': concerning_count
    })

@admin_bp.route('/api/export-data')
@login_required
def export_data():
    if not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        from flask import Response
        import csv
        import io
        
        # Get export type from query params
        export_type = request.args.get('type', 'all')
        
        output = io.StringIO()
        
        if export_type == 'users' or export_type == 'all':
            writer = csv.writer(output)
            writer.writerow(['ID', 'First Name', 'Last Name', 'Email', 'Gender', 'Strand', 'Grade Level', 'Section', 'Created At'])
            
            users = User.query.filter_by(is_admin=False).all()
            for user in users:
                writer.writerow([
                    user.id, user.firstname, user.lastname, user.email, 
                    user.gender, user.strand, user.grade_level, user.section,
                    user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else ''
                ])
        
        elif export_type == 'mood_logs':
            writer = csv.writer(output)
            writer.writerow(['Log ID', 'User Email', 'Emotion', 'Sleep Hours', 'Energy Level', 'Triggers', 'Coping', 'Gratitude', 'Date'])
            
            logs = db.session.query(MoodLog, User).join(User, MoodLog.id == User.id).all()
            for log, user in logs:
                writer.writerow([
                    log.log_id, user.email, log.emotion, log.sleep, log.energy,
                    log.triggers, log.coping, log.gratitude,
                    log.log_date.strftime('%Y-%m-%d %H:%M:%S') if log.log_date else ''
                ])
        
        elif export_type == 'dass21':
            writer = csv.writer(output)
            writer.writerow(['ID', 'User Email', 'Depression Score', 'Anxiety Score', 'Stress Score', 
                           'Depression Severity', 'Anxiety Severity', 'Stress Severity', 'Created At'])
            
            results = db.session.query(DASS21Result, User).join(User, DASS21Result.user_id == User.id).all()
            for result, user in results:
                writer.writerow([
                    result.id, user.email, result.depression_score, result.anxiety_score, result.stress_score,
                    result.depression_severity, result.anxiety_severity, result.stress_severity,
                    result.created_at.strftime('%Y-%m-%d %H:%M:%S') if result.created_at else ''
                ])
        
        output.seek(0)
        
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename=mindtrack_{export_type}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'}
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/analytics-data')
@login_required
def get_analytics_data():
    if not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        # Mood distribution
        mood_data = db.session.query(
            MoodLog.emotion,
            db.func.count(MoodLog.emotion).label('count')
        ).group_by(MoodLog.emotion).all()
        
        # DASS-21 severity distribution
        dass_data = db.session.query(
            DASS21Result.depression_severity,
            db.func.count(DASS21Result.depression_severity).label('count')
        ).group_by(DASS21Result.depression_severity).all()
        
        # Monthly activity
        monthly_logs = db.session.query(
            db.func.date_trunc('month', MoodLog.log_date).label('month'),
            db.func.count(MoodLog.log_id).label('count')
        ).group_by(db.func.date_trunc('month', MoodLog.log_date)).order_by('month').all()
        
        return jsonify({
            'mood_distribution': [{'emotion': row.emotion, 'count': row.count} for row in mood_data],
            'dass_severity': [{'severity': row.depression_severity, 'count': row.count} for row in dass_data],
            'monthly_activity': [{'month': row.month.strftime('%Y-%m'), 'count': row.count} for row in monthly_logs]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
