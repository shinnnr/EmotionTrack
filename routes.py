import json
from datetime import datetime, timedelta
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func, desc
from app import db, csrf
from models import User, MoodLog, DASS21Result, StudentMessage, ClassAssignment
from forms import LoginForm, RegisterForm, EmotionLogForm, ConsultationForm

# Create blueprints
main_bp = Blueprint('main', __name__)
auth_bp = Blueprint('auth', __name__)
api_bp = Blueprint('api', __name__)
admin_bp = Blueprint('admin', __name__)

# Helper functions for faculty admin access control
def get_faculty_assignment(user):
    """Get the class assignment for a faculty admin user"""
    if not user.is_admin:
        return None
    return ClassAssignment.query.filter_by(faculty_id=user.id).first()

def get_students_for_faculty(user):
    """Get students that a faculty admin can access based on their assignment"""
    # Main admin can see all students
    if user.email == 'admin@emotiontrack.app':
        return User.query.filter_by(is_admin=False)
    
    # Faculty admin can only see students in their assigned section
    assignment = get_faculty_assignment(user)
    if assignment:
        return User.query.filter(
            User.grade_level == assignment.grade_level,
            User.section == assignment.section,
            User.is_admin == False
        )
    
    # If no assignment, return empty query
    return User.query.filter(User.id == -1)  # Impossible condition to return empty

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
    recent_logs = MoodLog.query.filter_by(user_id=current_user.id).order_by(desc(MoodLog.log_date)).limit(5).all()
    
    # Get latest DASS-21 result
    latest_dass = DASS21Result.query.filter_by(user_id=current_user.id).order_by(desc(DASS21Result.created_at)).first()
    
    # Check DASS-21 status (weekly assessment)
    from datetime import datetime, timedelta
    dass21_status = {
        'can_take': True,
        'days_remaining': 0,
        'next_available_date': None,
        'last_taken_date': None
    }
    
    if latest_dass:
        week_ago = datetime.utcnow() - timedelta(days=7)
        if latest_dass.created_at > week_ago:
            days_passed = (datetime.utcnow() - latest_dass.created_at).days
            dass21_status['can_take'] = False
            dass21_status['days_remaining'] = 7 - days_passed
            dass21_status['next_available_date'] = latest_dass.created_at + timedelta(days=7)
            dass21_status['last_taken_date'] = latest_dass.created_at
    
    # Check for admin responses that the student hasn't read yet
    unread_admin_responses = StudentMessage.query.filter(
        StudentMessage.sender_user_id == current_user.id,
        StudentMessage.admin_response.is_not(None),
        StudentMessage.is_response_read_by_student == False
    ).count()
    
    # No longer needed - proper tracking implemented
    unread_messages_count = 0
    
    notifications = {
        'dass21_available': dass21_status['can_take'],
        'unread_messages': unread_messages_count,
        'recent_responses': unread_admin_responses,
        'has_notifications': dass21_status['can_take'] or unread_admin_responses > 0
    }
    
    return render_template('home.html', 
                         recent_logs=recent_logs, 
                         latest_dass=latest_dass, 
                         dass21_status=dass21_status,
                         notifications=notifications)

@main_bp.route('/profile')
@login_required
def profile():
    return render_template('profile.html', user=current_user)


@main_bp.route('/api/mood-logs')
@login_required
def get_mood_logs():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        logs_query = MoodLog.query.filter_by(user_id=current_user.id).order_by(desc(MoodLog.log_date))
        logs_paginated = logs_query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'logs': [{
                'log_id': log.log_id,
                'emotion': log.emotion,
                'energy': log.energy,
                'sleep': log.sleep,
                'triggers': log.triggers,
                'coping': log.coping,
                'gratitude': log.gratitude,
                'log_date': log.log_date.isoformat() if log.log_date else None
            } for log in logs_paginated.items],
            'pagination': {
                'page': logs_paginated.page,
                'pages': logs_paginated.pages,
                'per_page': logs_paginated.per_page,
                'total': logs_paginated.total,
                'has_prev': logs_paginated.has_prev,
                'has_next': logs_paginated.has_next,
                'prev_num': logs_paginated.prev_num,
                'next_num': logs_paginated.next_num
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@main_bp.route('/api/wellness-insights')
@login_required
def get_wellness_insights():
    try:
        logs = MoodLog.query.filter_by(user_id=current_user.id).all()
        if not logs:
            return jsonify({'has_data': False})
        
        from collections import Counter
        emotions = Counter(log.emotion for log in logs)
        energy_levels = [log.energy for log in logs if log.energy]
        sleep_hours = [log.sleep for log in logs if log.sleep]
        triggers = Counter(log.triggers for log in logs if log.triggers)
        
        return jsonify({
            'has_data': True,
            'most_common_emotion': emotions.most_common(1)[0][0] if emotions else 'None',
            'avg_energy': sum(energy_levels) / len(energy_levels) if energy_levels else 0,
            'avg_sleep': sum(sleep_hours) / len(sleep_hours) if sleep_hours else 0,
            'main_trigger': triggers.most_common(1)[0][0] if triggers else 'None'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@main_bp.route('/api/dass21-results')
@login_required
def get_dass21_results():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        results_query = DASS21Result.query.filter_by(user_id=current_user.id).order_by(desc(DASS21Result.created_at))
        results_paginated = results_query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'results': [{
                'id': result.id,
                'depression_score': result.depression_score,
                'anxiety_score': result.anxiety_score,
                'stress_score': result.stress_score,
                'depression_severity': result.depression_severity,
                'anxiety_severity': result.anxiety_severity,
                'stress_severity': result.stress_severity,
                'created_at': result.created_at.isoformat() if result.created_at else None
            } for result in results_paginated.items],
            'pagination': {
                'page': results_paginated.page,
                'pages': results_paginated.pages,
                'per_page': results_paginated.per_page,
                'total': results_paginated.total,
                'has_prev': results_paginated.has_prev,
                'has_next': results_paginated.has_next,
                'prev_num': results_paginated.prev_num,
                'next_num': results_paginated.next_num
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@main_bp.route('/emotion-log', methods=['GET', 'POST'])
@login_required
def emotion_log():
    form = EmotionLogForm()
    
    # Check DASS-21 status (weekly assessment)
    latest_dass = DASS21Result.query.filter_by(user_id=current_user.id).order_by(desc(DASS21Result.created_at)).first()
    dass21_status = {
        'can_take': True,
        'days_remaining': 0,
        'next_available_date': None,
        'last_taken_date': None
    }
    
    if latest_dass:
        days_passed = (datetime.now() - latest_dass.created_at).days
        if days_passed < 7:
            dass21_status['can_take'] = False
            dass21_status['days_remaining'] = 7 - days_passed
            dass21_status['next_available_date'] = latest_dass.created_at + timedelta(days=7)
            dass21_status['last_taken_date'] = latest_dass.created_at
    
    if form.validate_on_submit():
        try:
            # Parse emotions data
            try:
                emotions_data = json.loads(form.emotions.data or '[]')
            except json.JSONDecodeError:
                flash('Invalid emotion selection. Please select your emotions again.', 'error')
                return render_template('emotion_log.html', form=form, dass21_status=dass21_status)
            
            
            
            # Validate emotions selection
            if not emotions_data or len(emotions_data) == 0:
                flash('Please select at least one emotion before saving your mood log.', 'error')
                return render_template('emotion_log.html', form=form, dass21_status=dass21_status)
            
            # Validate emotions are strings and not empty
            if not all(isinstance(emotion, str) and emotion.strip() for emotion in emotions_data):
                flash('Invalid emotion data. Please select valid emotions.', 'error')
                return render_template('emotion_log.html', form=form, dass21_status=dass21_status)
            
            # Additional validation for required fields
            if not form.sleep.data or form.sleep.data < 0 or form.sleep.data > 24:
                flash('Please enter valid sleep hours (0-24).', 'error')
                return render_template('emotion_log.html', form=form, dass21_status=dass21_status)
            
            if not form.energy.data or form.energy.data < 1 or form.energy.data > 10:
                flash('Please enter a valid energy level (1-10).', 'error')
                return render_template('emotion_log.html', form=form, dass21_status=dass21_status)
            
            if not form.triggers.data:
                flash('Please select your main trigger/stressor.', 'error')
                return render_template('emotion_log.html', form=form, dass21_status=dass21_status)
            
            # Validate custom inputs when "Other" is selected
            if form.triggers.data == 'Other' and not form.custom_trigger.data:
                flash('Please specify your trigger/stressor when selecting "Other".', 'error')
                return render_template('emotion_log.html', form=form, dass21_status=dass21_status)
                
            if form.coping.data == 'Other' and not form.custom_coping.data:
                flash('Please specify your coping strategy when selecting "Other".', 'error')
                return render_template('emotion_log.html', form=form, dass21_status=dass21_status)
            
            # Determine final values for triggers and coping
            final_trigger = form.custom_trigger.data if form.triggers.data == 'Other' else form.triggers.data
            final_coping = form.custom_coping.data if form.coping.data == 'Other' else form.coping.data
            
            # Create mood log entries for each selected emotion
            for emotion in emotions_data:
                mood_log = MoodLog()
                mood_log.user_id = current_user.id
                mood_log.emotion = emotion
                mood_log.intensity = 5  # Default intensity value (1-10 scale)
                mood_log.sleep = form.sleep.data
                mood_log.energy = form.energy.data
                mood_log.triggers = final_trigger
                mood_log.coping = final_coping
                mood_log.gratitude = form.gratitude.data
                db.session.add(mood_log)
            
            
            db.session.commit()
            
            flash('Mood log saved successfully!', 'success')
            
            return redirect(url_for('main.home'))
            
        except ValueError as e:
            db.session.rollback()
            print(f"ValueError in emotion_log: {str(e)}")
            flash(f'Invalid data format: {str(e)}. Please check your input and try again.', 'error')
        except Exception as e:
            db.session.rollback()
            print(f"Exception in emotion_log: {str(e)}")
            print(f"Exception type: {type(e)}")
            import traceback
            traceback.print_exc()
            flash('An unexpected error occurred while saving your mood log. Please try again.', 'error')
    
    return render_template('emotion_log.html', form=form, dass21_status=dass21_status)

@main_bp.route('/dass21-quiz')
@login_required
def dass21_quiz():
    # Check if user can take assessment (once per week)
    from datetime import datetime, timedelta
    
    # Check for recent assessment (within last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_assessment = DASS21Result.query.filter(
        DASS21Result.user_id == current_user.id,
        DASS21Result.created_at >= week_ago
    ).first()
    
    if recent_assessment:
        days_remaining = 7 - (datetime.utcnow() - recent_assessment.created_at).days
        flash(f'You can take the DASS-21 assessment again in {days_remaining} day(s). You completed your last assessment on {recent_assessment.created_at.strftime("%B %d, %Y")}.', 'info')
        return redirect(url_for('main.home'))
    
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
    
    return render_template('dass21_quiz.html', questions=dass21_questions)

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
    
    # Get user's previous messages (ordered oldest to newest like admin side)
    messages = StudentMessage.query.filter_by(sender_user_id=current_user.id).order_by(StudentMessage.created_at).all()
    
    # Mark all admin responses as read by the student when they visit this page
    for message in messages:
        if message.admin_response and not message.is_response_read_by_student:
            message.is_response_read_by_student = True
    db.session.commit()
    
    return render_template('consultation.html', form=form, messages=messages)

# Authentication routes
@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.home'))
    
    form = LoginForm()
    
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        
        if user:
            password_check = user.check_password(form.password.data)
            
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
    login_form = LoginForm()
    
    if form.validate_on_submit():
        
        # Check if user already exists
        existing_user = User.query.filter_by(email=form.email.data).first()
        if existing_user:
            flash('Email already registered. Please use a different email.', 'error')
            # Render template with form data preserved instead of redirecting
            return render_template('index.html', login_form=login_form, register_form=form)
        
        # Create new user
        user = User()
        user.firstname = form.firstname.data
        user.lastname = form.lastname.data
        user.email = form.email.data
        user.birthday = form.birthday.data
        user.gender = form.gender.data
        user.strand = form.strand.data
        user.grade_level = form.grade_level.data
        user.section = form.section.data
        user.set_password(form.password.data)
        
        db.session.add(user)
        db.session.commit()
        
        login_user(user)
        flash('Registration successful! Welcome to EmotionTrack.', 'success')
        return redirect(url_for('main.home'))
    else:
        # If form validation fails, flash errors and render template with form data preserved
        for field, errors in form.errors.items():
            for error in errors:
                flash(f'{field}: {error}', 'error')
        
        # Render template with form data preserved instead of redirecting
        return render_template('index.html', login_form=login_form, register_form=form)

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
        MoodLog.user_id == current_user.id,
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

# Admin routes
@admin_bp.route('/dashboard')
@login_required
def dashboard():
    if not current_user.is_admin:
        flash('Access denied. Admin privileges required.', 'error')
        return redirect(url_for('main.home'))
    
    # Get pagination parameters
    risk_page = request.args.get('risk_page', 1, type=int)
    activity_page = request.args.get('activity_page', 1, type=int)
    risk_per_page = 3  # 3 high risk students per page
    activity_per_page = 10  # 10 activity items per page
    
    # Get statistics for admin dashboard (filtered by faculty section if applicable)
    accessible_students_query = get_students_for_faculty(current_user)
    total_users = accessible_students_query.count()
    
    # Get accessible student IDs for filtering other queries
    accessible_student_ids = [user.id for user in accessible_students_query.all()]
    
    # Filter mood logs and messages based on accessible students
    if accessible_student_ids:
        total_logs = MoodLog.query.filter(MoodLog.user_id.in_(accessible_student_ids)).count()
        unread_messages = StudentMessage.query.filter(
            StudentMessage.sender_user_id.in_(accessible_student_ids),
            StudentMessage.is_read == False
        ).count()
    else:
        total_logs = 0
        unread_messages = 0
    
    # Recent activity with pagination (filtered by faculty section)
    if accessible_student_ids:
        recent_logs_pagination = MoodLog.query.join(User, MoodLog.user_id == User.id).filter(
            MoodLog.user_id.in_(accessible_student_ids)
        ).order_by(desc(MoodLog.log_date)).paginate(
            page=activity_page, 
            per_page=activity_per_page, 
            error_out=False
        )
    else:
        # Create empty pagination if no accessible students
        from flask_sqlalchemy.pagination import Pagination
        recent_logs_pagination = Pagination(
            query=MoodLog.query.filter(MoodLog.user_id == -1),
            page=1,
            per_page=activity_per_page,
            total=0,
            items=[]
        )
    # Get the associated users for each mood log
    recent_logs = [(log, User.query.get(log.user_id)) for log in recent_logs_pagination.items]
    
    # Get students with concerning DASS-21 scores (based on most recent assessment only)
    # First, get the most recent DASS21Result ID for each user
    latest_dass_subquery = db.session.query(
        DASS21Result.user_id,
        func.max(DASS21Result.created_at).label('max_created_at')
    ).group_by(DASS21Result.user_id).subquery()
    
    # Then get the actual DASS21Result records that match the latest assessment for each user
    latest_dass_results = db.session.query(DASS21Result).join(
        latest_dass_subquery,
        (DASS21Result.user_id == latest_dass_subquery.c.user_id) &
        (DASS21Result.created_at == latest_dass_subquery.c.max_created_at)
    ).subquery()
    
    # Finally, get users whose LATEST assessment shows concerning scores with pagination (filtered by faculty section)
    # First get the concerning DASS21Result IDs from the subquery, filtered by accessible students
    if accessible_student_ids:
        concerning_dass_ids = db.session.query(latest_dass_results.c.id).filter(
            (latest_dass_results.c.depression_severity.in_(['Severe', 'Extremely Severe'])) |
            (latest_dass_results.c.anxiety_severity.in_(['Severe', 'Extremely Severe'])) |
            (latest_dass_results.c.stress_severity.in_(['Severe', 'Extremely Severe'])),
            latest_dass_results.c.user_id.in_(accessible_student_ids)
        ).subquery()
        
        # Now paginate the DASS21Result objects
        concerning_students_pagination = DASS21Result.query.filter(
            DASS21Result.id.in_(db.session.query(concerning_dass_ids.c.id))
        ).order_by(desc(DASS21Result.created_at)).paginate(
            page=risk_page, 
            per_page=risk_per_page, 
            error_out=False
        )
    else:
        # Create empty pagination if no accessible students
        from flask_sqlalchemy.pagination import Pagination
        concerning_students_pagination = Pagination(
            query=DASS21Result.query.filter(DASS21Result.user_id == -1),
            page=1,
            per_page=risk_per_page,
            total=0,
            items=[]
        )
    # Get the associated users for each DASS21Result
    concerning_students = [(result, User.query.get(result.user_id)) for result in concerning_students_pagination.items]
    
    return render_template('admin_dashboard.html',
                         total_users=total_users,
                         total_logs=total_logs,
                         unread_messages=unread_messages,
                         recent_logs=recent_logs,
                         recent_logs_pagination=recent_logs_pagination,
                         concerning_students=concerning_students,
                         concerning_students_pagination=concerning_students_pagination)

@admin_bp.route('/messages')
@login_required
def messages():
    if not current_user.is_admin:
        flash('Access denied. Admin privileges required.', 'error')
        return redirect(url_for('main.home'))
    
    # Get students accessible to this faculty admin (filtered by section)
    accessible_students_query = get_students_for_faculty(current_user)
    all_students = accessible_students_query.all()
    
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
    
    # Check if faculty admin can access this student (section-based access control)
    accessible_student_ids = [user.id for user in get_students_for_faculty(current_user).all()]
    if student.id not in accessible_student_ids:
        flash('Access denied. You can only chat with students in your advisory section.', 'error')
        return redirect(url_for('admin.messages'))
    
    # Get all messages for this student
    messages = StudentMessage.query.filter_by(sender_user_id=user_id).order_by(StudentMessage.created_at).all()
    
    # Mark all messages as read
    for message in messages:
        if not message.is_read:
            message.is_read = True
    db.session.commit()
    
    return render_template('admin_chat.html', student=student, messages=messages)

@admin_bp.route('/manage-faculty')
@login_required
def manage_faculty():
    if not current_user.is_admin or current_user.email != 'admin@emotiontrack.app':
        flash('Access denied. Only the main admin can manage faculty.', 'error')
        return redirect(url_for('main.home'))
    
    # Get all faculty members (users with role 'faculty_admin' or 'guidance_admin' but not main admin)
    faculties = User.query.filter(
        User.role.in_(['faculty_admin', 'guidance_admin']),
        User.email != 'admin@emotiontrack.app'
    ).all()
    
    # Get class assignments for each faculty
    faculty_data = []
    for faculty in faculties:
        assignment = ClassAssignment.query.filter_by(faculty_id=faculty.id).first()
        student_count = 0
        if assignment:
            student_count = User.query.filter(
                User.grade_level == assignment.grade_level,
                User.section == assignment.section,
                User.is_admin == False
            ).count()
        
        faculty_data.append({
            'faculty': faculty,
            'assignment': assignment,
            'student_count': student_count
        })
    
    return render_template('manage_faculty.html', faculty_data=faculty_data)

@admin_bp.route('/create-faculty', methods=['POST'])
@login_required
def create_faculty():
    if not current_user.is_admin or current_user.email != 'admin@emotiontrack.app':
        return jsonify({'success': False, 'message': 'Access denied'})
    
    firstname = request.form.get('firstname')
    lastname = request.form.get('lastname')
    email = request.form.get('email')
    password = request.form.get('password')
    advisory_class = request.form.get('advisory_class')
    
    if not all([firstname, lastname, email, password, advisory_class]):
        return jsonify({'success': False, 'message': 'All fields are required'})
    
    # Check if email already exists
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({'success': False, 'message': 'Email already exists'})
    
    try:
        # Parse advisory class (e.g., "HUMSS 12 - MARX")
        if not advisory_class:
            return jsonify({'success': False, 'message': 'Advisory class is required'})
            
        parts = advisory_class.split(' - ')
        if len(parts) != 2:
            return jsonify({'success': False, 'message': 'Invalid advisory class format. Use format: "STRAND GRADE - SECTION"'})
        
        strand_grade = parts[0].strip()
        section = parts[1].strip()
        
        # Extract grade level
        grade_parts = strand_grade.split()
        if len(grade_parts) < 2:
            return jsonify({'success': False, 'message': 'Invalid format. Use format: "STRAND GRADE - SECTION"'})
        
        grade_level = grade_parts[-1]  # Get the last part as grade level
        strand = ' '.join(grade_parts[:-1])  # Everything except the last part as strand
        
        # Create faculty user
        faculty = User()
        faculty.firstname = firstname
        faculty.lastname = lastname
        faculty.email = email
        if password:
            faculty.password_hash = generate_password_hash(password)
        else:
            return jsonify({'success': False, 'message': 'Password is required'})
        faculty.gender = 'Other'  # Default value
        faculty.strand = strand
        faculty.grade_level = grade_level
        faculty.section = section
        faculty.is_admin = True
        faculty.role = 'faculty_admin'
        
        db.session.add(faculty)
        db.session.flush()  # Get the faculty ID
        
        # Create class assignment
        assignment = ClassAssignment()
        assignment.faculty_id = faculty.id
        assignment.grade_level = grade_level
        assignment.section = section
        
        db.session.add(assignment)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Faculty created successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Error creating faculty: {str(e)}'})

@admin_bp.route('/faculty-students/<int:faculty_id>')
@login_required
def faculty_students(faculty_id):
    if not current_user.is_admin or current_user.email != 'admin@emotiontrack.app':
        flash('Access denied. Only the main admin can view faculty students.', 'error')
        return redirect(url_for('main.home'))
    
    faculty = User.query.get_or_404(faculty_id)
    assignment = ClassAssignment.query.filter_by(faculty_id=faculty_id).first()
    
    students = []
    if assignment:
        students = User.query.filter(
            User.grade_level == assignment.grade_level,
            User.section == assignment.section,
            User.is_admin == False
        ).order_by(User.lastname, User.firstname).all()
    
    return render_template('faculty_students.html', 
                         faculty=faculty, 
                         assignment=assignment, 
                         students=students)

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
    message.message_text = ""  # Empty for admin messages, we only use admin_response
    message.admin_response = message_text  # Store the actual admin message
    message.is_read = True
    message.responded_at = datetime.utcnow()
    
    db.session.add(message)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Message sent successfully'})

@admin_bp.route('/suggested-responses/<int:user_id>')
@login_required
def get_suggested_responses(user_id):
    if not current_user.is_admin:
        return jsonify({'success': False, 'message': 'Access denied'})
    
    student = User.query.get_or_404(user_id)
    if student.is_admin:
        return jsonify({'success': False, 'message': 'Cannot get suggestions for admin users'})
    
    suggestions = []
    
    try:
        # Get recent DASS-21 results (within last 30 days)
        recent_dass = DASS21Result.query.filter_by(user_id=user_id).filter(
            DASS21Result.created_at >= datetime.utcnow() - timedelta(days=30)
        ).order_by(DASS21Result.created_at.desc()).first()
        
        # Get recent mood logs (within last 7 days)
        recent_moods = MoodLog.query.filter_by(user_id=user_id).filter(
            MoodLog.log_date >= datetime.utcnow() - timedelta(days=7)
        ).order_by(MoodLog.log_date.desc()).limit(10).all()
        
        # Generate suggestions based on DASS-21 results
        if recent_dass:
            if recent_dass.depression_severity in ['Severe', 'Extremely Severe']:
                suggestions.extend([
                    {
                        'type': 'support',
                        'category': 'Mental Health',
                        'text': "I'm concerned about how you've been feeling lately. Your wellbeing is important to us. Would you like to talk about what's been troubling you?",
                        'reason': f'High depression score: {recent_dass.depression_score} ({recent_dass.depression_severity})'
                    },
                    {
                        'type': 'referral',
                        'category': 'Professional Help',
                        'text': "I'd like to connect you with additional resources that might help. Our school psychologist is available for one-on-one sessions. Would you be interested in setting up an appointment?",
                        'reason': f'Depression level requires professional attention'
                    }
                ])
            
            if recent_dass.anxiety_severity in ['Severe', 'Extremely Severe']:
                suggestions.extend([
                    {
                        'type': 'support',
                        'category': 'Anxiety Support',
                        'text': "I notice you might be experiencing some anxiety. Let's work together on some coping strategies. Have you tried any breathing exercises or mindfulness techniques?",
                        'reason': f'High anxiety score: {recent_dass.anxiety_score} ({recent_dass.anxiety_severity})'
                    },
                    {
                        'type': 'coping',
                        'category': 'Coping Strategies',
                        'text': "Here's a simple breathing technique that might help: breathe in for 4 counts, hold for 4, breathe out for 6. Try this when you feel overwhelmed.",
                        'reason': 'Practical coping strategy for anxiety'
                    }
                ])
            
            if recent_dass.stress_severity in ['Severe', 'Extremely Severe']:
                suggestions.extend([
                    {
                        'type': 'support',
                        'category': 'Stress Management',
                        'text': "It sounds like you're dealing with a lot of stress. Let's identify what's causing this pressure and find ways to manage it better. What's been the most stressful part of your day lately?",
                        'reason': f'High stress score: {recent_dass.stress_score} ({recent_dass.stress_severity})'
                    },
                    {
                        'type': 'coping',
                        'category': 'Time Management',
                        'text': "Sometimes breaking things down into smaller, manageable tasks can help reduce stress. Would you like help creating a study schedule or priority list?",
                        'reason': 'Practical stress management approach'
                    }
                ])
        
        # Generate suggestions based on recent mood patterns
        if recent_moods:
            negative_emotions = ['sad', 'angry', 'frustrated', 'anxious', 'lonely', 'depressed', 'overwhelmed']
            recent_negative_moods = [mood for mood in recent_moods if mood.emotion.lower() in negative_emotions]
            
            if len(recent_negative_moods) >= 3:  # Pattern of negative emotions
                suggestions.append({
                    'type': 'support',
                    'category': 'Emotional Support',
                    'text': "I've noticed you've been experiencing some challenging emotions recently. Remember that it's completely normal to have ups and downs. I'm here to listen and support you through this.",
                    'reason': f'Pattern of negative emotions in recent logs'
                })
            
            # Check for low energy patterns
            low_energy_logs = [mood for mood in recent_moods if mood.energy <= 3]
            if len(low_energy_logs) >= 2:
                suggestions.append({
                    'type': 'wellness',
                    'category': 'Self-Care',
                    'text': "I see your energy levels have been low lately. Let's talk about your sleep schedule, eating habits, and physical activity. Sometimes small changes can make a big difference in how we feel.",
                    'reason': 'Consistent low energy levels reported'
                })
        
        # Add general supportive responses if no specific concerns detected
        if not suggestions:
            suggestions.extend([
                {
                    'type': 'general',
                    'category': 'Check-in',
                    'text': "How are you feeling today? I'm here to listen and support you in any way I can.",
                    'reason': 'General supportive check-in'
                },
                {
                    'type': 'general',
                    'category': 'Academic Support',
                    'text': "How are things going with your studies? If you're facing any academic challenges, I'm here to help you find solutions.",
                    'reason': 'Academic wellness check'
                },
                {
                    'type': 'general',
                    'category': 'Social Support',
                    'text': "How are your relationships with friends and family? Sometimes talking about our social connections can be really helpful.",
                    'reason': 'Social wellness check'
                }
            ])
        
        # Limit to top 5 suggestions
        suggestions = suggestions[:5]
        
        return jsonify({'success': True, 'suggestions': suggestions})
        
    except Exception as e:
        return jsonify({'success': False, 'suggestions': []})


@main_bp.route('/api/change-password', methods=['POST'])
@login_required
def change_password():
    try:
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'success': False, 'message': 'Both current and new passwords are required'})
        
        # Verify current password
        if not check_password_hash(current_user.password_hash, current_password):
            return jsonify({'success': False, 'message': 'Current password is incorrect'})
        
        # Validate new password length
        if len(new_password) < 6:
            return jsonify({'success': False, 'message': 'New password must be at least 6 characters long'})
        
        # Update password
        current_user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Password updated successfully'})
        
    except Exception as e:
        # Log error securely without exposing sensitive information
        return jsonify({'success': False, 'message': 'An error occurred while updating password'})


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
    
    # Get students accessible to this faculty admin (filtered by section)
    accessible_students_query = get_students_for_faculty(current_user)
    accessible_student_ids = [user.id for user in accessible_students_query.all()]
    
    total_users = accessible_students_query.count()
    
    # Filter other statistics by accessible students
    if accessible_student_ids:
        total_logs = MoodLog.query.filter(MoodLog.user_id.in_(accessible_student_ids)).count()
        unread_messages = StudentMessage.query.filter(
            StudentMessage.sender_user_id.in_(accessible_student_ids),
            StudentMessage.is_read == False
        ).count()
        
        # Count high risk students in accessible section
        concerning_count = db.session.query(DASS21Result).join(User, DASS21Result.user_id == User.id).filter(
            (DASS21Result.depression_severity.in_(['Severe', 'Extremely Severe'])) |
            (DASS21Result.anxiety_severity.in_(['Severe', 'Extremely Severe'])) |
            (DASS21Result.stress_severity.in_(['Severe', 'Extremely Severe'])),
            DASS21Result.user_id.in_(accessible_student_ids)
        ).count()
    else:
        total_logs = 0
        unread_messages = 0
        concerning_count = 0
    
    return jsonify({
        'total_users': total_users,
        'total_logs': total_logs,
        'unread_messages': unread_messages,
        'concerning_students': concerning_count
    })

@admin_bp.route('/api/student-profile/<int:user_id>')
@login_required
def get_student_profile(user_id):
    if not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        # Get student details
        student = User.query.get_or_404(user_id)
        if student.is_admin:
            return jsonify({'error': 'Cannot view admin profiles'}), 400
        
        # Check if faculty admin can access this student (section-based access control)
        accessible_student_ids = [user.id for user in get_students_for_faculty(current_user).all()]
        if student.id not in accessible_student_ids:
            return jsonify({'error': 'Access denied. You can only view students in your advisory section.'}), 403
        
        # Get recent DASS-21 results
        dass21_results = DASS21Result.query.filter_by(user_id=user_id).order_by(DASS21Result.created_at.desc()).limit(5).all()
        
        # Get recent mood logs
        mood_logs = MoodLog.query.filter_by(user_id=user_id).order_by(MoodLog.log_date.desc()).limit(10).all()
        
        # Get recent messages
        messages = StudentMessage.query.filter_by(sender_user_id=user_id).order_by(StudentMessage.created_at.desc()).limit(5).all()
        
        # Format the data
        profile_data = {
            'student': {
                'id': student.id,
                'full_name': student.full_name,
                'email': student.email,
                'gender': student.gender,
                'strand': student.strand,
                'grade_level': student.grade_level,
                'section': student.section,
                'created_at': student.created_at.strftime('%B %d, %Y') if student.created_at else ''
            },
            'dass21_results': [{
                'depression_score': result.depression_score,
                'anxiety_score': result.anxiety_score,
                'stress_score': result.stress_score,
                'depression_severity': result.depression_severity,
                'anxiety_severity': result.anxiety_severity,
                'stress_severity': result.stress_severity,
                'created_at': result.created_at.strftime('%B %d, %Y') if result.created_at else ''
            } for result in dass21_results],
            'mood_logs': [{
                'emotion': log.emotion,
                'sleep': log.sleep,
                'energy': log.energy,
                'triggers': log.triggers,
                'coping': log.coping,
                'gratitude': log.gratitude,
                'log_date': log.log_date.strftime('%B %d, %Y') if log.log_date else ''
            } for log in mood_logs],
            'recent_messages': [{
                'message_text': msg.message_text,
                'admin_response': msg.admin_response,
                'created_at': msg.created_at.strftime('%B %d, %Y at %I:%M %p') if msg.created_at else '',
                'is_read': msg.is_read
            } for msg in messages]
        }
        
        return jsonify({'success': True, 'data': profile_data})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/export-data', methods=['GET', 'POST'])
@login_required
@csrf.exempt  
def export_data():
    if not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        from flask import Response
        import csv
        import io
        import zipfile
        from datetime import datetime, timedelta
        
        # Get export parameters from request
        data = None
        if request.method == 'POST':
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            export_types = data.get('types', [])
            start_date = data.get('start_date')
            end_date = data.get('end_date')
            export_format = data.get('format', 'csv')
        else:
            # Fallback to old method for backward compatibility
            export_type = request.args.get('type', 'all')
            export_types = [export_type] if export_type != 'all' else ['users', 'mood_logs', 'dass21']
            start_date = None
            end_date = None
            export_format = 'csv'
        
        # Validate export types
        if not export_types:
            return jsonify({'error': 'No export types specified'}), 400
        
        # Convert date strings to datetime objects
        start_datetime = None
        end_datetime = None
        if start_date:
            start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
        if end_date:
            end_datetime = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)  # Include end date
        
        # Get filtering parameters for main admin
        strand_filter = data.get('strand') if data else request.args.get('strand')
        grade_filter = data.get('grade') if data else request.args.get('grade')
        section_filter = data.get('section') if data else request.args.get('section')
        
        # Get students accessible to this admin (with optional filtering for main admin)
        if current_user.email == 'admin@emotiontrack.app':
            # Main admin - apply optional filters
            base_query = User.query.filter_by(is_admin=False)
            if strand_filter:
                base_query = base_query.filter_by(strand=strand_filter)
            if grade_filter:
                base_query = base_query.filter_by(grade_level=grade_filter)
            if section_filter:
                base_query = base_query.filter_by(section=section_filter)
            accessible_students = base_query.all()
            accessible_student_ids = [user.id for user in accessible_students]
        else:
            # Faculty admin - restricted to their sections
            accessible_students = get_students_for_faculty(current_user).all()
            accessible_student_ids = [user.id for user in accessible_students]
        
        # If only one type is selected, return single CSV
        if len(export_types) == 1:
            output = io.StringIO()
            export_type = export_types[0]
            
            if export_type == 'users':
                writer = csv.writer(output)
                writer.writerow(['ID', 'First Name', 'Last Name', 'Email', 'Gender', 'Strand', 'Grade Level', 'Section', 'Created At'])
                
                query = User.query.filter(User.id.in_(accessible_student_ids))
                if start_datetime and end_datetime:
                    query = query.filter(User.created_at >= start_datetime, User.created_at < end_datetime)
                users = query.all()
                
                for user in users:
                    writer.writerow([
                        user.id, user.firstname, user.lastname, user.email, 
                        user.gender, user.strand, user.grade_level, user.section,
                        user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else ''
                    ])
            
            elif export_type == 'mood_logs':
                writer = csv.writer(output)
                writer.writerow(['Log ID', 'User Email', 'User Name', 'Emotion', 'Sleep Hours', 'Energy Level', 'Triggers', 'Coping', 'Gratitude', 'Date'])
                
                query = db.session.query(MoodLog, User).join(User, MoodLog.user_id == User.id).filter(User.id.in_(accessible_student_ids))
                if start_datetime and end_datetime:
                    query = query.filter(MoodLog.log_date >= start_datetime, MoodLog.log_date < end_datetime)
                logs = query.all()
                
                for log, user in logs:
                    writer.writerow([
                        log.log_id, user.email, user.full_name, log.emotion, log.sleep, log.energy,
                        log.triggers or '', log.coping or '', log.gratitude or '',
                        log.log_date.strftime('%Y-%m-%d %H:%M:%S') if log.log_date else ''
                    ])
            
            elif export_type == 'dass21':
                writer = csv.writer(output)
                writer.writerow(['ID', 'User Email', 'User Name', 'Depression Score', 'Anxiety Score', 'Stress Score', 
                               'Depression Severity', 'Anxiety Severity', 'Stress Severity', 'Created At'])
                
                query = db.session.query(DASS21Result, User).join(User, DASS21Result.user_id == User.id).filter(User.id.in_(accessible_student_ids))
                if start_datetime and end_datetime:
                    query = query.filter(DASS21Result.created_at >= start_datetime, DASS21Result.created_at < end_datetime)
                results = query.all()
                
                for result, user in results:
                    writer.writerow([
                        result.id, user.email, user.full_name, result.depression_score, result.anxiety_score, result.stress_score,
                        result.depression_severity, result.anxiety_severity, result.stress_severity,
                        result.created_at.strftime('%Y-%m-%d %H:%M:%S') if result.created_at else ''
                    ])
            
            elif export_type == 'messages':
                writer = csv.writer(output)
                writer.writerow(['ID', 'Student Email', 'Student Name', 'Message Text', 'Admin Response', 'Is Read', 'Created At', 'Responded At'])
                
                query = db.session.query(StudentMessage, User).join(User, StudentMessage.sender_user_id == User.id).filter(User.id.in_(accessible_student_ids))
                if start_datetime and end_datetime:
                    query = query.filter(StudentMessage.created_at >= start_datetime, StudentMessage.created_at < end_datetime)
                messages = query.all()
                
                for message, user in messages:
                    writer.writerow([
                        message.id, user.email, user.full_name, message.message_text or '', message.admin_response or '',
                        message.is_read, 
                        message.created_at.strftime('%Y-%m-%d %H:%M:%S') if message.created_at else '',
                        message.responded_at.strftime('%Y-%m-%d %H:%M:%S') if message.responded_at else ''
                    ])
            
            output.seek(0)
            
            return Response(
                output.getvalue(),
                mimetype='text/csv',
                headers={'Content-Disposition': f'attachment; filename=emotiontrack_{export_type}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'}
            )
        
        # Multiple types selected - create ZIP file
        else:
            zip_buffer = io.BytesIO()
            
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for export_type in export_types:
                    output = io.StringIO()
                    
                    if export_type == 'users':
                        writer = csv.writer(output)
                        writer.writerow(['ID', 'First Name', 'Last Name', 'Email', 'Gender', 'Strand', 'Grade Level', 'Section', 'Created At'])
                        
                        query = User.query.filter(User.id.in_(accessible_student_ids))
                        if start_datetime and end_datetime:
                            query = query.filter(User.created_at >= start_datetime, User.created_at < end_datetime)
                        users = query.all()
                        
                        for user in users:
                            writer.writerow([
                                user.id, user.firstname, user.lastname, user.email, 
                                user.gender, user.strand, user.grade_level, user.section,
                                user.created_at.strftime('%Y-%m-%d %H:%M:%S') if user.created_at else ''
                            ])
                    
                    elif export_type == 'mood_logs':
                        writer = csv.writer(output)
                        writer.writerow(['Log ID', 'User Email', 'User Name', 'Emotion', 'Sleep Hours', 'Energy Level', 'Triggers', 'Coping', 'Gratitude', 'Date'])
                        
                        query = db.session.query(MoodLog, User).join(User, MoodLog.user_id == User.id).filter(User.id.in_(accessible_student_ids))
                        if start_datetime and end_datetime:
                            query = query.filter(MoodLog.log_date >= start_datetime, MoodLog.log_date < end_datetime)
                        logs = query.all()
                        
                        for log, user in logs:
                            writer.writerow([
                                log.log_id, user.email, user.full_name, log.emotion, log.sleep, log.energy,
                                log.triggers or '', log.coping or '', log.gratitude or '',
                                log.log_date.strftime('%Y-%m-%d %H:%M:%S') if log.log_date else ''
                            ])
                    
                    elif export_type == 'dass21':
                        writer = csv.writer(output)
                        writer.writerow(['ID', 'User Email', 'User Name', 'Depression Score', 'Anxiety Score', 'Stress Score', 
                                       'Depression Severity', 'Anxiety Severity', 'Stress Severity', 'Created At'])
                        
                        query = db.session.query(DASS21Result, User).join(User, DASS21Result.user_id == User.id).filter(User.id.in_(accessible_student_ids))
                        if start_datetime and end_datetime:
                            query = query.filter(DASS21Result.created_at >= start_datetime, DASS21Result.created_at < end_datetime)
                        results = query.all()
                        
                        for result, user in results:
                            writer.writerow([
                                result.id, user.email, user.full_name, result.depression_score, result.anxiety_score, result.stress_score,
                                result.depression_severity, result.anxiety_severity, result.stress_severity,
                                result.created_at.strftime('%Y-%m-%d %H:%M:%S') if result.created_at else ''
                            ])
                    
                    elif export_type == 'messages':
                        writer = csv.writer(output)
                        writer.writerow(['ID', 'Student Email', 'Student Name', 'Message Text', 'Admin Response', 'Is Read', 'Created At', 'Responded At'])
                        
                        query = db.session.query(StudentMessage, User).join(User, StudentMessage.sender_user_id == User.id).filter(User.id.in_(accessible_student_ids))
                        if start_datetime and end_datetime:
                            query = query.filter(StudentMessage.created_at >= start_datetime, StudentMessage.created_at < end_datetime)
                        messages = query.all()
                        
                        for message, user in messages:
                            writer.writerow([
                                message.id, user.email, user.full_name, message.message_text or '', message.admin_response or '',
                                message.is_read, 
                                message.created_at.strftime('%Y-%m-%d %H:%M:%S') if message.created_at else '',
                                message.responded_at.strftime('%Y-%m-%d %H:%M:%S') if message.responded_at else ''
                            ])
                    
                    # Add CSV to ZIP
                    filename = f'emotiontrack_{export_type}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
                    zip_file.writestr(filename, output.getvalue())
            
            zip_buffer.seek(0)
            
            return Response(
                zip_buffer.getvalue(),
                mimetype='application/zip',
                headers={'Content-Disposition': f'attachment; filename=emotiontrack_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.zip'}
            )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/analytics-data')
@login_required
def get_analytics_data():
    if not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        # Get filtering parameters for main admin
        strand_filter = request.args.get('strand')
        grade_filter = request.args.get('grade') 
        section_filter = request.args.get('section')
        
        # Get students accessible to this admin (with optional filtering for main admin)
        if current_user.email == 'admin@emotiontrack.app':
            # Main admin - apply optional filters
            base_query = User.query.filter_by(is_admin=False)
            if strand_filter:
                base_query = base_query.filter_by(strand=strand_filter)
            if grade_filter:
                base_query = base_query.filter_by(grade_level=grade_filter)
            if section_filter:
                base_query = base_query.filter_by(section=section_filter)
            accessible_students = base_query.all()
            accessible_student_ids = [user.id for user in accessible_students]
        else:
            # Faculty admin - restricted to their sections
            accessible_students = get_students_for_faculty(current_user).all()
            accessible_student_ids = [user.id for user in accessible_students]
        
        if not accessible_student_ids:
            # Return empty analytics if no accessible students
            return jsonify({
                'mood_distribution': [],
                'dass_severity': [],
                'monthly_activity': [],
                'total_users': 0,
                'average_energy': 0.0,
                'concerning_students': 0,
                'strand_breakdown': [] if current_user.email == 'admin@emotiontrack.app' else None
            })
        
        # Mood distribution (filtered by accessible students)
        mood_data = db.session.query(
            MoodLog.emotion,
            db.func.count(MoodLog.emotion).label('count')
        ).filter(MoodLog.user_id.in_(accessible_student_ids)).group_by(MoodLog.emotion).all()
        
        # DASS-21 severity distribution (based on most recent assessment only, filtered)
        latest_dass_subquery_analytics = db.session.query(
            DASS21Result.user_id,
            func.max(DASS21Result.created_at).label('max_created_at')
        ).filter(DASS21Result.user_id.in_(accessible_student_ids)).group_by(DASS21Result.user_id).subquery()
        
        latest_dass_results_analytics = db.session.query(DASS21Result).join(
            latest_dass_subquery_analytics,
            (DASS21Result.user_id == latest_dass_subquery_analytics.c.user_id) &
            (DASS21Result.created_at == latest_dass_subquery_analytics.c.max_created_at)
        ).subquery()
        
        dass_data = db.session.query(
            latest_dass_results_analytics.c.depression_severity,
            db.func.count(latest_dass_results_analytics.c.depression_severity).label('count')
        ).group_by(latest_dass_results_analytics.c.depression_severity).all()
        
        # Monthly activity (filtered)
        monthly_logs = db.session.query(
            db.func.date_trunc('month', MoodLog.log_date).label('month'),
            db.func.count(MoodLog.log_id).label('count')
        ).filter(MoodLog.user_id.in_(accessible_student_ids)).group_by(db.func.date_trunc('month', MoodLog.log_date)).order_by('month').all()
        
        # Additional stats for analytics (filtered)
        total_users = len(accessible_student_ids)
        average_energy = db.session.query(db.func.avg(MoodLog.energy)).filter(MoodLog.user_id.in_(accessible_student_ids)).scalar()
        
        # Get concerning students count (filtered)
        latest_dass_subquery = db.session.query(
            DASS21Result.user_id,
            func.max(DASS21Result.created_at).label('max_created_at')
        ).filter(DASS21Result.user_id.in_(accessible_student_ids)).group_by(DASS21Result.user_id).subquery()
        
        latest_dass_results = db.session.query(DASS21Result).join(
            latest_dass_subquery,
            (DASS21Result.user_id == latest_dass_subquery.c.user_id) &
            (DASS21Result.created_at == latest_dass_subquery.c.max_created_at)
        ).subquery()
        
        concerning_students = db.session.query(DASS21Result).join(
            latest_dass_results,
            DASS21Result.id == latest_dass_results.c.id
        ).filter(
            (DASS21Result.depression_severity.in_(['Severe', 'Extremely Severe'])) |
            (DASS21Result.anxiety_severity.in_(['Severe', 'Extremely Severe'])) |
            (DASS21Result.stress_severity.in_(['Severe', 'Extremely Severe']))
        ).count()
        
        # For main admin, add strand breakdown when not filtering by specific criteria
        strand_breakdown = None
        if current_user.email == 'admin@emotiontrack.app' and not strand_filter:
            strand_breakdown = db.session.query(
                User.strand,
                db.func.count(User.id).label('student_count')
            ).filter(User.id.in_(accessible_student_ids)).group_by(User.strand).all()
            strand_breakdown = [{'strand': row.strand, 'count': row.student_count} for row in strand_breakdown if row.strand]
        
        result = {
            'mood_distribution': [{'emotion': row.emotion, 'count': row.count} for row in mood_data],
            'dass_severity': [{'severity': row.depression_severity, 'count': row.count} for row in dass_data],
            'monthly_activity': [{'month': row.month.strftime('%Y-%m'), 'count': row.count} for row in monthly_logs],
            'total_users': total_users,
            'average_energy': float(average_energy) if average_energy else 0.0,
            'concerning_students': concerning_students
        }
        
        # Add strand breakdown for main admin
        if strand_breakdown is not None:
            result['strand_breakdown'] = strand_breakdown
            
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Admin-specific paginated endpoints
@admin_bp.route('/api/admin-messages')
@login_required
def get_admin_messages():
    if not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Get students accessible to this faculty admin (filtered by section)
        accessible_students_query = get_students_for_faculty(current_user)
        students_with_messages = accessible_students_query.all()
        
        conversations = []
        for student in students_with_messages:
            latest_message = StudentMessage.query.filter_by(sender_user_id=student.id).order_by(desc(StudentMessage.created_at)).first()
            has_unread = StudentMessage.query.filter_by(sender_user_id=student.id, is_read=False).count() > 0
            
            conversations.append({
                'user': student,
                'latest_message': latest_message,
                'has_unread': has_unread
            })
        
        # Sort by latest message date
        conversations.sort(key=lambda x: x['latest_message'].created_at if x['latest_message'] else datetime.min, reverse=True)
        
        # Manual pagination
        start = (page - 1) * per_page
        end = start + per_page
        paginated_conversations = conversations[start:end]
        
        total = len(conversations)
        pages = (total + per_page - 1) // per_page
        
        return jsonify({
            'conversations': [{
                'user': {
                    'id': conv['user'].id,
                    'full_name': conv['user'].full_name,
                    'email': conv['user'].email,
                    'strand': conv['user'].strand,
                    'grade_level': conv['user'].grade_level,
                    'firstname': conv['user'].firstname,
                    'lastname': conv['user'].lastname
                },
                'latest_message': {
                    'message_text': conv['latest_message'].message_text if conv['latest_message'] else None,
                    'created_at': conv['latest_message'].created_at.strftime('%B %d, %Y at %I:%M %p') if conv['latest_message'] and conv['latest_message'].created_at else None,
                    'admin_response': conv['latest_message'].admin_response if conv['latest_message'] else None
                } if conv['latest_message'] else None,
                'has_unread': conv['has_unread']
            } for conv in paginated_conversations],
            'pagination': {
                'page': page,
                'pages': pages,
                'per_page': per_page,
                'total': total,
                'has_prev': page > 1,
                'has_next': page < pages,
                'prev_num': page - 1 if page > 1 else None,
                'next_num': page + 1 if page < pages else None
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/students-by-hierarchy')
@login_required
def get_students_by_hierarchy():
    if not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        strand = request.args.get('strand')
        grade = request.args.get('grade')
        section = request.args.get('section')
        
        # Get students accessible to this faculty admin
        accessible_students_query = get_students_for_faculty(current_user)
        
        if not strand and not grade and not section:
            # Check if this is main admin or faculty admin
            if current_user.email == 'admin@emotiontrack.app':
                # Main admin - return strands for hierarchical browsing
                strands = accessible_students_query.filter(User.strand.isnot(None)).with_entities(User.strand).distinct().all()
                return jsonify({
                    'type': 'strands',
                    'data': [s[0] for s in strands if s[0]]
                })
            else:
                # Faculty admin - check if they have students from only one section
                sections_data = accessible_students_query.filter(
                    User.strand.isnot(None),
                    User.grade_level.isnot(None),
                    User.section.isnot(None)
                ).with_entities(User.strand, User.grade_level, User.section).distinct().all()
                
                if len(sections_data) == 1:
                    # Faculty admin has only one section - return students directly
                    strand_val, grade_val, section_val = sections_data[0]
                    students = accessible_students_query.filter_by(
                        strand=strand_val, 
                        grade_level=grade_val, 
                        section=section_val
                    ).all()
                    return jsonify({
                        'type': 'students',
                        'data': [{
                            'id': student.id,
                            'full_name': student.full_name,
                            'email': student.email,
                            'created_at': student.created_at.strftime('%B %d, %Y') if student.created_at else ''
                        } for student in students]
                    })
                else:
                    # Faculty admin has multiple sections or no sections - return strands for hierarchy
                    strands = accessible_students_query.filter(User.strand.isnot(None)).with_entities(User.strand).distinct().all()
                    return jsonify({
                        'type': 'strands',
                        'data': [s[0] for s in strands if s[0]]
                    })
        
        elif strand and not grade and not section:
            # Return grades for this strand from accessible students
            grades = accessible_students_query.filter_by(strand=strand).filter(User.grade_level.isnot(None)).with_entities(User.grade_level).distinct().all()
            return jsonify({
                'type': 'grades',
                'data': [g[0] for g in grades if g[0]]
            })
        
        elif strand and grade and not section:
            # Return sections for this strand and grade from accessible students
            sections = accessible_students_query.filter_by(strand=strand, grade_level=grade).filter(User.section.isnot(None)).with_entities(User.section).distinct().all()
            return jsonify({
                'type': 'sections',
                'data': [s[0] for s in sections if s[0]]
            })
        
        elif strand and grade and section:
            # Return students for this strand, grade, and section from accessible students
            students = accessible_students_query.filter_by(strand=strand, grade_level=grade, section=section).all()
            return jsonify({
                'type': 'students',
                'data': [{
                    'id': student.id,
                    'full_name': student.full_name,
                    'email': student.email,
                    'created_at': student.created_at.strftime('%B %d, %Y') if student.created_at else ''
                } for student in students]
            })
        
        else:
            return jsonify({'error': 'Invalid parameters'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_bp.route('/api/recent-mood-logs')
@login_required
def get_recent_mood_logs():
    if not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Get students accessible to this faculty admin
        accessible_student_ids = [user.id for user in get_students_for_faculty(current_user).all()]
        
        if not accessible_student_ids:
            # Return empty result if no accessible students
            return jsonify({
                'success': True,
                'data': [],
                'pagination': {
                    'page': 1, 'pages': 0, 'per_page': per_page, 'total': 0,
                    'has_prev': False, 'has_next': False, 'prev_num': None, 'next_num': None
                }
            })
        
        # Get recent mood logs with user information (filtered by accessible students)
        logs_query = MoodLog.query.join(User, MoodLog.user_id == User.id).filter(
            MoodLog.user_id.in_(accessible_student_ids)
        ).order_by(desc(MoodLog.log_date))
        
        logs_paginated = logs_query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'data': [{
                'user_name': log.user.full_name,
                'emotion': log.emotion,
                'sleep': log.sleep,
                'energy': log.energy,
                'triggers': log.triggers,
                'log_date': log.log_date.strftime('%B %d, %Y at %I:%M %p') if log.log_date else ''
            } for log in logs_paginated.items],
            'pagination': {
                'page': logs_paginated.page,
                'pages': logs_paginated.pages,
                'per_page': logs_paginated.per_page,
                'total': logs_paginated.total,
                'has_prev': logs_paginated.has_prev,
                'has_next': logs_paginated.has_next,
                'prev_num': logs_paginated.prev_num,
                'next_num': logs_paginated.next_num
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/api/high-risk-students')
@login_required
def get_high_risk_students():
    if not current_user.is_admin:
        return jsonify({'error': 'Access denied'}), 403
    
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 3, type=int)
        
        # Get students accessible to this faculty admin
        accessible_student_ids = [user.id for user in get_students_for_faculty(current_user).all()]
        
        if not accessible_student_ids:
            # Return empty result if no accessible students
            return jsonify({
                'success': True,
                'data': [],
                'pagination': {
                    'page': 1, 'pages': 0, 'per_page': per_page, 'total': 0,
                    'has_prev': False, 'has_next': False, 'prev_num': None, 'next_num': None
                }
            })
        
        # Get latest DASS-21 assessment for each accessible user (subquery)
        latest_dass_subquery = db.session.query(
            DASS21Result.user_id,
            func.max(DASS21Result.created_at).label('max_created_at')
        ).filter(DASS21Result.user_id.in_(accessible_student_ids)).group_by(DASS21Result.user_id).subquery()
        
        # Get high risk students based on most recent DASS-21 results (filtered by accessible students)
        high_risk_query = DASS21Result.query.join(
            latest_dass_subquery,
            (DASS21Result.user_id == latest_dass_subquery.c.user_id) &
            (DASS21Result.created_at == latest_dass_subquery.c.max_created_at)
        ).join(User, DASS21Result.user_id == User.id).filter(
            (DASS21Result.depression_severity.in_(['Severe', 'Extremely Severe'])) |
            (DASS21Result.anxiety_severity.in_(['Severe', 'Extremely Severe'])) |
            (DASS21Result.stress_severity.in_(['Severe', 'Extremely Severe'])),
            DASS21Result.user_id.in_(accessible_student_ids)
        ).order_by(desc(DASS21Result.created_at))
        
        risk_paginated = high_risk_query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'data': [{
                'user_id': dass_result.user.id,
                'full_name': dass_result.user.full_name,
                'depression_severity': dass_result.depression_severity if dass_result.depression_severity in ['Severe', 'Extremely Severe'] else None,
                'anxiety_severity': dass_result.anxiety_severity if dass_result.anxiety_severity in ['Severe', 'Extremely Severe'] else None,
                'stress_severity': dass_result.stress_severity if dass_result.stress_severity in ['Severe', 'Extremely Severe'] else None,
                'assessment_date': dass_result.created_at.strftime('%B %d, %Y') if dass_result.created_at else ''
            } for dass_result in risk_paginated.items],
            'pagination': {
                'page': risk_paginated.page,
                'pages': risk_paginated.pages,
                'per_page': risk_paginated.per_page,
                'total': risk_paginated.total,
                'has_prev': risk_paginated.has_prev,
                'has_next': risk_paginated.has_next,
                'prev_num': risk_paginated.prev_num,
                'next_num': risk_paginated.next_num
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
