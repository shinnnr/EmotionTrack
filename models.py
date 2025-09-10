from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

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
    is_admin = db.Column(db.Boolean, default=False)  # Keep for backward compatibility
    user_role = db.Column(db.String(20), default='student')  # 'student', 'staff', 'guidance_counselor'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    mood_logs = db.relationship('MoodLog', backref='user', lazy=True, cascade='all, delete-orphan')
    dass21_results = db.relationship('DASS21Result', backref='user', lazy=True, cascade='all, delete-orphan')
    sent_messages = db.relationship('StudentMessage', backref='sender', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    @property
    def full_name(self):
        return f"{self.firstname} {self.lastname}"
    
    @property
    def is_student(self):
        return self.user_role == 'student'
    
    @property
    def is_staff(self):
        return self.user_role == 'staff'
    
    @property
    def is_guidance_counselor(self):
        return self.user_role == 'guidance_counselor'
    
    def __repr__(self):
        return f'<User {self.email}>'

class MoodLog(db.Model):
    __tablename__ = 'mood_logs'
    
    log_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    emotion = db.Column(db.String(50), nullable=False)
    intensity = db.Column(db.Integer, nullable=False)  # Emotion intensity rating 1-10 as per Use Case diagram
    sleep = db.Column(db.Float, nullable=False)
    energy = db.Column(db.Integer, nullable=False)
    triggers = db.Column(db.String(50), nullable=False)
    coping = db.Column(db.String(50))
    gratitude = db.Column(db.Text)
    log_date = db.Column(db.DateTime, default=datetime.utcnow)
    
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<DASS21Result User {self.user_id}>'

class StudentMessage(db.Model):
    __tablename__ = 'student_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    sender_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message_text = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    admin_response = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    responded_at = db.Column(db.DateTime)
    
    def __repr__(self):
        return f'<StudentMessage from User {self.sender_user_id}>'

class DailyTip(db.Model):
    __tablename__ = 'daily_tips'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    tip_type = db.Column(db.String(50), default='wellness')  # 'wellness', 'motivation', 'coping', 'stress'
    target_audience = db.Column(db.String(20), default='student')  # 'student', 'staff', 'all'
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    def __repr__(self):
        return f'<DailyTip {self.title}>'

class ConsultationSchedule(db.Model):
    __tablename__ = 'consultation_schedules'
    
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    counselor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    preferred_date = db.Column(db.Date, nullable=False)
    preferred_time = db.Column(db.String(20), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'approved', 'completed', 'cancelled'
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    student = db.relationship('User', foreign_keys=[student_id], backref='consultation_requests')
    counselor = db.relationship('User', foreign_keys=[counselor_id], backref='assigned_consultations')
    
    def __repr__(self):
        return f'<ConsultationSchedule Student {self.student_id}>'
