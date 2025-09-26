import os
import logging

from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Debug: Check if .env file exists and try to load it explicitly
env_file_path = os.path.join(os.getcwd(), '.env')
logger.info(f"Current working directory: {os.getcwd()}")
logger.info(f".env file exists: {os.path.exists(env_file_path)}")
if os.path.exists(env_file_path):
    logger.info("Loading .env file explicitly")
    load_dotenv(env_file_path)

class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)
login_manager = LoginManager()
csrf = CSRFProtect()

# create the app
app = Flask(__name__)

# Configure session and CSRF settings
session_secret = os.environ.get("SESSION_SECRET")
if not session_secret:
    logger.error("SESSION_SECRET environment variable is required but not set!")
    raise RuntimeError("SESSION_SECRET environment variable is required")

app.secret_key = session_secret
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_KEY_PREFIX'] = 'emotiontrack:'
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1) # needed for url_for to generate with https

# configure the database, relative to the app instance folder
database_url = os.environ.get("DATABASE_URL")
logger.info(f"Database URL present: {database_url is not None}")
logger.info(f"Database URL length: {len(database_url) if database_url else 0}")

# Ensure we have a valid database URL
if not database_url:
    logger.error("DATABASE_URL is empty or None!")
    raise RuntimeError("DATABASE_URL environment variable is required but not set properly")

# Strip whitespace and check again
database_url = database_url.strip()
if len(database_url) == 0:
    logger.error("DATABASE_URL is empty after stripping whitespace!")
    raise RuntimeError("DATABASE_URL environment variable is empty")

logger.info(f"Database URL starts with: {database_url[:20]}...")
app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
# Additional configuration for the existing app
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["WTF_CSRF_SECRET_KEY"] = app.secret_key
app.config["WTF_CSRF_TIME_LIMIT"] = None

# initialize the app with the extension, flask-sqlalchemy >= 3.0.x
db.init_app(app)
login_manager.init_app(app)
csrf.init_app(app)
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'
login_manager.login_message_category = 'info'

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))

with app.app_context():
    # Make sure to import the models here or their tables won't be created
    import models  # noqa: F401

    db.create_all()
    
    # Create admin user if it doesn't exist
    from models import User
    from werkzeug.security import generate_password_hash
    
    admin_exists = db.session.execute(
        db.text("SELECT id FROM users WHERE email = :email"), 
        {"email": "admin@emotiontrack.app"}
    ).fetchone()
    
    if not admin_exists:
        admin = User()
        admin.firstname = 'Admin'
        admin.lastname = 'User'
        admin.email = 'admin@emotiontrack.app'
        admin.password_hash = generate_password_hash('admin123')
        admin.gender = 'Other'
        admin.strand = 'N/A'
        admin.grade_level = '12'
        admin.section = 'Admin'
        admin.is_admin = True
        admin.role = 'guidance_admin'
        db.session.add(admin)
        db.session.commit()
        logger.info("Created admin user: admin@emotiontrack.app")
    else:
        logger.info("Admin user already exists")
    
    # Register blueprints after models are imported to avoid circular imports
    from routes import main_bp, auth_bp, api_bp, admin_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/admin')

    # Add template filter for Manila time
    from models import convert_to_manila_time
    @app.template_filter('manila_time')
    def manila_time_filter(dt):
        return convert_to_manila_time(dt)