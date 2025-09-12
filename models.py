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
    is_admin = db.Column(db.Boolean, default=False)
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

class Notification(db.Model):
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    recipient_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    sender_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    notification_type = db.Column(db.String(50), nullable=False)  # 'new_message', 'admin_response', 'system'
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    related_message_id = db.Column(db.Integer, db.ForeignKey('student_messages.id'))  # Link to message if applicable
    priority = db.Column(db.String(20), default='normal')  # 'low', 'normal', 'high', 'urgent'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    read_at = db.Column(db.DateTime)
    
    # Relationships
    recipient = db.relationship('User', foreign_keys=[recipient_user_id], backref='received_notifications')
    sender = db.relationship('User', foreign_keys=[sender_user_id], backref='sent_notifications')
    related_message = db.relationship('StudentMessage', backref='notifications')
    
    def mark_as_read(self):
        """Mark notification as read and set read timestamp"""
        self.is_read = True
        self.read_at = datetime.utcnow()
        db.session.commit()
    
    @classmethod
    def create_new_message_notification(cls, student_user_id):
        """Create notification for admin when student sends new message"""
        from models import User
        admin_users = User.query.filter_by(is_admin=True).all()
        student = User.query.get(student_user_id)
        
        for admin in admin_users:
            notification = cls()
            notification.recipient_user_id = admin.id
            notification.sender_user_id = student_user_id
            notification.notification_type = 'new_message'
            notification.title = 'New Student Message'
            notification.message = f'{student.full_name} sent a new message requiring attention.'
            notification.priority = 'high'
            db.session.add(notification)
        
        db.session.commit()
    
    @classmethod
    def create_admin_response_notification(cls, student_user_id, message_id, admin_user_id):
        """Create notification for student when admin responds"""
        from models import User
        admin = User.query.get(admin_user_id)
        
        notification = cls()
        notification.recipient_user_id = student_user_id
        notification.sender_user_id = admin_user_id
        notification.notification_type = 'admin_response'
        notification.title = 'Response from Guidance Counselor'
        notification.message = f'The guidance counselor has responded to your message.'
        notification.related_message_id = message_id
        notification.priority = 'high'
        db.session.add(notification)
        db.session.commit()
    
    @classmethod
    def get_unread_count_for_user(cls, user_id):
        """Get count of unread notifications for a user"""
        return cls.query.filter_by(recipient_user_id=user_id, is_read=False).count()
    
    @classmethod
    def mark_all_read_for_user(cls, user_id, notification_type=None):
        """Mark all notifications as read for a user, optionally filtered by type"""
        query = cls.query.filter_by(recipient_user_id=user_id, is_read=False)
        if notification_type:
            query = query.filter_by(notification_type=notification_type)
        
        notifications = query.all()
        for notification in notifications:
            notification.mark_as_read()
    
    def __repr__(self):
        return f'<Notification {self.notification_type} for User {self.recipient_user_id}>'
