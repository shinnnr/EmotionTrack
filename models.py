from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db
from sqlalchemy import Enum
import pytz

manila_tz = pytz.timezone('Asia/Manila')

def get_current_time():
    return datetime.now(manila_tz)

def convert_to_manila_time(dt):
    """Convert a datetime to Manila time, handling both naive and aware datetimes"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Assume naive datetime is UTC
        dt = dt.replace(tzinfo=pytz.UTC)
    return dt.astimezone(manila_tz)

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    firstname = db.Column(db.String(100), nullable=False)
    lastname = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    birthday = db.Column(db.Date)
    gender = db.Column(db.String(20))
    strand = db.Column(db.String(100))
    grade_level = db.Column(db.String(20))
    section = db.Column(db.String(50))
    # Keep both old and new columns during migration
    is_admin = db.Column(db.Boolean, default=False)
    role = db.Column(Enum('student', 'guidance_admin', 'faculty_admin', name='user_roles'), 
                     default='student', nullable=True)  # Make nullable during migration
    created_at = db.Column(db.DateTime, default=get_current_time)
    last_profile_update = db.Column(db.DateTime, nullable=True)  # Track last time student updated profile info
    
    # Relationships
    mood_logs = db.relationship('MoodLog', backref='user', lazy=True, cascade='all, delete-orphan')
    dass21_results = db.relationship('DASS21Result', backref='user', lazy=True, cascade='all, delete-orphan')
    sent_messages = db.relationship('StudentMessage', foreign_keys='StudentMessage.sender_user_id', back_populates='sender', lazy=True, cascade='all, delete-orphan')
    responded_messages = db.relationship('StudentMessage', foreign_keys='StudentMessage.responded_by_admin_id', back_populates='responded_by', lazy=True)
    class_assignments = db.relationship('ClassAssignment', backref='faculty', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    @property
    def full_name(self):
        return f"{self.firstname} {self.lastname}"
    
    # Helper properties for role-based access
    @property
    def is_admin_role(self):
        """New role-based method: returns True if user is any type of admin"""
        if self.role:
            return self.role in ['guidance_admin', 'faculty_admin']
        # Fallback to old is_admin column during migration
        return self.is_admin
    
    @property
    def is_guidance_admin(self):
        """Returns True if user is a guidance office admin"""
        return self.role == 'guidance_admin'
    
    @property
    def is_faculty_admin(self):
        """Returns True if user is a faculty admin"""
        return self.role == 'faculty_admin'
    
    @property
    def is_student(self):
        """Returns True if user is a student"""
        if self.role:
            return self.role == 'student'
        # Fallback to old is_admin column for legacy records during migration
        return not self.is_admin
    
    def can_update_profile(self):
        """Check if student can update profile (100 days since last update)"""
        if not self.last_profile_update:
            return True  # Never updated before, allow update

        from datetime import timedelta
        # Convert last_profile_update to Manila time for consistent comparison
        last_update_manila = convert_to_manila_time(self.last_profile_update)
        days_since_update = (get_current_time() - last_update_manila).days
        return days_since_update >= 100

    def days_until_profile_update(self):
        """Calculate days remaining before student can update profile again"""
        if not self.last_profile_update:
            return 0  # Can update immediately

        from datetime import timedelta
        # Convert last_profile_update to Manila time for consistent comparison
        last_update_manila = convert_to_manila_time(self.last_profile_update)
        days_since_update = (get_current_time() - last_update_manila).days
        days_remaining = 100 - days_since_update
        return max(0, days_remaining)
    
    def __repr__(self):
        return f'<User {self.email}>'

class MoodLog(db.Model):
    __tablename__ = 'mood_logs'
    
    log_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    emotion = db.Column(db.String(50), nullable=False)
    intensity = db.Column(db.Integer, nullable=False, default=5)
    sleep = db.Column(db.Float, nullable=False)
    energy = db.Column(db.Integer, nullable=False)
    triggers = db.Column(db.String(50), nullable=False)
    coping = db.Column(db.String(50))
    gratitude = db.Column(db.Text)
    log_date = db.Column(db.DateTime, default=get_current_time)
    
    def __repr__(self):
        return f'<MoodLog {self.emotion} by User {self.user_id}>'

class DASS21Result(db.Model):
    __tablename__ = 'dass21_results'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    depression_score = db.Column(db.Integer, nullable=False)
    anxiety_score = db.Column(db.Integer, nullable=False)
    stress_score = db.Column(db.Integer, nullable=False)
    depression_severity = db.Column(db.String(50), nullable=False)
    anxiety_severity = db.Column(db.String(50), nullable=False)
    stress_severity = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=get_current_time)
    
    def __repr__(self):
        return f'<DASS21Result User {self.user_id}>'

class StudentMessage(db.Model):
    __tablename__ = 'student_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    sender_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message_text = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    admin_response = db.Column(db.Text)
    is_response_read_by_student = db.Column(db.Boolean, default=False)
    conversation_type = db.Column(db.String(20), nullable=False, default='guidance_office')  # 'guidance_office' or 'faculty_adviser'
    responded_by_admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Track which admin responded
    created_at = db.Column(db.DateTime, default=get_current_time)
    responded_at = db.Column(db.DateTime)
    
    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_user_id], back_populates='sent_messages')
    responded_by = db.relationship('User', foreign_keys=[responded_by_admin_id], back_populates='responded_messages')
    
    def __repr__(self):
        return f'<StudentMessage from User {self.sender_user_id} ({self.conversation_type})>'

class ClassAssignment(db.Model):
    __tablename__ = 'class_assignments'

    id = db.Column(db.Integer, primary_key=True)
    faculty_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    grade_level = db.Column(db.String(20), nullable=False)
    section = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=get_current_time)

    # Add unique constraint to ensure one faculty per section
    __table_args__ = (db.UniqueConstraint('grade_level', 'section', name='unique_grade_section'),)

    def __repr__(self):
        return f'<ClassAssignment Faculty {self.faculty_id} - {self.grade_level}-{self.section}>'

class GuidanceAlert(db.Model):
    __tablename__ = 'guidance_alerts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    alert_type = db.Column(db.String(50), nullable=False)  # 'dass21_severe', 'emotional_pattern', 'crisis_indicator'
    severity = db.Column(db.String(20), nullable=False)  # 'low', 'medium', 'high', 'critical'
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_resolved = db.Column(db.Boolean, default=False)
    resolved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=get_current_time)

    # Relationships
    resolver = db.relationship('User', foreign_keys=[resolved_by])

    def __repr__(self):
        return f'<GuidanceAlert {self.alert_type} for User {self.user_id} - {self.severity}>'

class StudentFeedback(db.Model):
    __tablename__ = 'student_feedback'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    feedback_type = db.Column(db.String(50), nullable=False)  # 'general', 'feature_request', 'bug_report', 'satisfaction'
    rating = db.Column(db.Integer, nullable=True)  # 1-5 scale for satisfaction
    subject = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_anonymous = db.Column(db.Boolean, default=False)
    admin_response = db.Column(db.Text, nullable=True)
    responded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    responded_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=get_current_time)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='feedback')
    responder = db.relationship('User', foreign_keys=[responded_by])

    def __repr__(self):
        return f'<StudentFeedback {self.feedback_type} by User {self.user_id}>'
