from flask_wtf import FlaskForm
from wtforms.csrf.session import SessionCSRF
from wtforms.meta import DefaultMeta
from wtforms import StringField, PasswordField, SelectField, TextAreaField, IntegerField, FloatField, HiddenField, DateField
from wtforms.validators import DataRequired, Email, Length, NumberRange, EqualTo
from wtforms.widgets import TextArea

class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    
    # CSRF protection is handled globally

class RegisterForm(FlaskForm):
    firstname = StringField('First Name', validators=[DataRequired(), Length(min=2, max=50)])
    lastname = StringField('Last Name', validators=[DataRequired(), Length(min=2, max=50)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Confirm Password', 
                                   validators=[DataRequired(), EqualTo('password')])
    birthday = DateField('Birthday', validators=[DataRequired()])
    gender = SelectField('Gender', choices=[('Male', 'Male'), ('Female', 'Female'), ('Other', 'Other')])
    strand = SelectField('Strand', choices=[
        ('STEM', 'STEM'), ('ABM', 'ABM'), ('HUMSS', 'HUMSS'), 
        ('GAS', 'GAS'), ('TVL', 'TVL'), ('Other', 'Other')
    ])
    grade_level = SelectField('Grade Level', choices=[('11', 'Grade 11'), ('12', 'Grade 12')])
    section = StringField('Section', validators=[DataRequired(), Length(max=50)])

class EmotionLogForm(FlaskForm):
    emotions = HiddenField('Selected Emotions', validators=[DataRequired()])
    sleep = FloatField('Sleep Hours', validators=[DataRequired(), NumberRange(min=0, max=24)])
    energy = IntegerField('Energy Level (1-10)', validators=[DataRequired(), NumberRange(min=1, max=10)])
    triggers = SelectField('Main Trigger', choices=[
        ('School', 'School'), ('Work', 'Work'), ('Family', 'Family'),
        ('Friends', 'Friends'), ('Health', 'Health'), ('Money', 'Money'),
        ('Relationship', 'Relationship'), ('Other', 'Other')
    ])
    coping = SelectField('Coping Strategy', choices=[
        ('Music', 'Music'), ('Exercise', 'Exercise'), ('Talking', 'Talking'),
        ('Meditation', 'Meditation'), ('Gaming', 'Gaming'), ('Reading', 'Reading'),
        ('Sleeping', 'Sleeping'), ('Socializing', 'Socializing'), ('Other', 'Other')
    ])
    gratitude = TextAreaField('Gratitude Note', validators=[Length(max=500)])

class ConsultationForm(FlaskForm):
    message_text = TextAreaField('Your Message', 
                                validators=[DataRequired(), Length(max=500)],
                                render_kw={"rows": 4, "placeholder": "Describe your concerns or questions..."})
