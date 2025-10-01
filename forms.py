from flask_wtf import FlaskForm
from wtforms.csrf.session import SessionCSRF
from wtforms.meta import DefaultMeta
from wtforms import StringField, PasswordField, SelectField, TextAreaField, IntegerField, FloatField, HiddenField, DateField, BooleanField
from wtforms.validators import DataRequired, Email, Length, NumberRange, EqualTo, ValidationError
from wtforms.widgets import TextArea
import re
from datetime import datetime, date

def validate_name_no_numbers(form, field):
    """Custom validator to ensure name fields don't contain numbers"""
    if re.search(r'\d', field.data):
        raise ValidationError('Name cannot contain numbers.')

def validate_birthday_not_future(form, field):
    """Custom validator to ensure birthday is not in the future"""
    if field.data and field.data > date.today():
        raise ValidationError('Birthday cannot be in the future.')
    if field.data and field.data.year > datetime.now().year:
        raise ValidationError('Please enter a valid birth year.')

def validate_lrn(form, field):
    """Custom validator for LRN (Learner's Reference Number) - exactly 12 digits"""
    if not field.data:
        raise ValidationError('Enter valid LRN.')
    if not re.match(r'^\d{12}$', field.data):
        raise ValidationError('Enter valid LRN.')

class LoginForm(FlaskForm):
    username = StringField('LRN / Employee ID', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])

    # CSRF protection is handled globally

class RegisterForm(FlaskForm):
    firstname = StringField('First Name', validators=[DataRequired(message='This field is required.'), Length(min=2, max=50, message='Please lengthen this text to 2 characters.'), validate_name_no_numbers])
    lastname = StringField('Last Name', validators=[DataRequired(message='This field is required.'), Length(min=2, max=50, message='Please lengthen this text to 2 characters.'), validate_name_no_numbers])
    username = StringField('LRN', validators=[DataRequired(message='This field is required.'), validate_lrn])
    password = PasswordField('Password', validators=[DataRequired(message='This field is required.'), Length(min=6, message='Please lengthen this text to 6 characters.')])
    confirm_password = PasswordField('Confirm Password',
                                    validators=[DataRequired(message='This field is required.'), EqualTo('password', message='Passwords must match.')])
    birthday = DateField('Birthday', validators=[DataRequired(message='This field is required.'), validate_birthday_not_future])
    gender = SelectField('Gender', choices=[('Male', 'Male'), ('Female', 'Female')], validators=[DataRequired(message='This field is required.')])
    strand = SelectField('Strand', choices=[
        ('STEM', 'STEM'), ('ABM', 'ABM'), ('HUMSS', 'HUMSS'), ('ASSH', 'ASSH'),
        ('GAS', 'GAS'), ('TVL', 'TVL')
    ], validators=[DataRequired(message='This field is required.')])
    grade_level = SelectField('Grade Level', choices=[('11', 'Grade 11'), ('12', 'Grade 12')], validators=[DataRequired(message='This field is required.')])
    section = StringField('Section', validators=[DataRequired(message='This field is required.'), Length(max=50)], render_kw={"placeholder": "Example: MARX"})
    privacy_agreement = BooleanField('I agree that my data is private and secure and will only be used by the guidance office', validators=[DataRequired(message='This field is required.')])

class EmotionLogForm(FlaskForm):
    emotions = HiddenField('Selected Emotions', validators=[DataRequired()])
    sleep = FloatField('Sleep Hours', validators=[DataRequired(), NumberRange(min=0, max=24)])
    energy = IntegerField('Energy Level (1-10)', validators=[DataRequired(), NumberRange(min=1, max=10)])
    triggers = SelectField('Main Trigger', choices=[
        ('School', 'School'), ('Work', 'Work'), ('Family', 'Family'),
        ('Friends', 'Friends'), ('Health', 'Health'), ('Money', 'Money'),
        ('Relationship', 'Relationship'), ('Other', 'Other')
    ])
    custom_trigger = StringField('Specify Other Trigger', validators=[Length(max=100)])
    coping = SelectField('Coping Strategy', choices=[
        ('Music', 'Music'), ('Exercise', 'Exercise'), ('Talking', 'Talking'),
        ('Meditation', 'Meditation'), ('Gaming', 'Gaming'), ('Reading', 'Reading'),
        ('Sleeping', 'Sleeping'), ('Socializing', 'Socializing'), ('Other', 'Other')
    ])
    custom_coping = StringField('Specify Other Coping Strategy', validators=[Length(max=100)])
    gratitude = TextAreaField('Gratitude Note', validators=[Length(max=500)])

class ConsultationForm(FlaskForm):
    message_text = TextAreaField('Your Message', 
                                validators=[Length(max=500)],
                                render_kw={"rows": 4, "placeholder": "Describe your concerns or questions..."})

class FacultyProfileForm(FlaskForm):
    strand = SelectField('Strand', choices=[
        ('STEM', 'STEM'), ('ABM', 'ABM'), ('HUMSS', 'HUMSS'), ('ASSH', 'ASSH'),
        ('GAS', 'GAS'), ('TVL', 'TVL')
    ], validators=[DataRequired()])
    grade_level = SelectField('Grade Level', choices=[('11', 'Grade 11'), ('12', 'Grade 12')], validators=[DataRequired()])
    section = StringField('Section', validators=[DataRequired(), Length(max=50)], render_kw={"placeholder": "Example: MARX"})

class StudentProfileUpdateForm(FlaskForm):
    grade_level = SelectField('Grade Level', choices=[('11', 'Grade 11'), ('12', 'Grade 12')], validators=[DataRequired()])
    section = StringField('Section', validators=[DataRequired(), Length(max=50)], render_kw={"placeholder": "Example: MARX"})

class FeedbackForm(FlaskForm):
    feedback_type = SelectField('Feedback Type', choices=[
        ('general', 'General Feedback'),
        ('feature_request', 'Feature Request'),
        ('bug_report', 'Bug Report'),
        ('satisfaction', 'Satisfaction Survey')
    ], validators=[DataRequired()])
    rating = HiddenField('Overall Rating')
    subject = StringField('Subject', validators=[DataRequired(), Length(max=100)])
    message = TextAreaField('Your Feedback', validators=[DataRequired(), Length(max=1000)],
                           render_kw={"rows": 5, "placeholder": "Please share your thoughts, suggestions, or concerns..."})
    is_anonymous = BooleanField('Submit anonymously')
