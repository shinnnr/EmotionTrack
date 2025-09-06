import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import generate_password_hash

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
login_manager = LoginManager()
csrf = CSRFProtect()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
    app.config["WTF_CSRF_SECRET_KEY"] = app.secret_key
    app.config["WTF_CSRF_TIME_LIMIT"] = None  # No time limit for CSRF tokens
    app.config["WTF_CSRF_CHECK_DEFAULT"] = True  # Re-enable CSRF
    app.config["WTF_CSRF_ENABLED"] = True
    app.config["SESSION_COOKIE_SECURE"] = False  # Allow cookies over HTTP in development
    app.config["SESSION_COOKIE_HTTPONLY"] = True
    app.config["SESSION_COOKIE_SAMESITE"] = 'Lax'
    app.config["SESSION_COOKIE_NAME"] = 'emotiontrack_session'
    
    # Debug session configuration
    print(f"Session config: SECRET_KEY exists: {bool(app.secret_key)}")
    print(f"CSRF config: WTF_CSRF_SECRET_KEY exists: {bool(app.config.get('WTF_CSRF_SECRET_KEY'))}")
    print(f"Session cookie config: {app.config['SESSION_COOKIE_NAME']}")
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "postgresql://localhost/mindtrack_db")
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    
    # Proxy fix for deployment
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
    
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)  # Enable CSRF protection
    login_manager.login_view = 'auth.login'  # type: ignore
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'
    
    # Make csrf_token available in all templates
    @app.context_processor
    def inject_csrf_token():
        from flask_wtf.csrf import generate_csrf
        try:
            token = generate_csrf()
            print(f"Generated CSRF token in context processor: {bool(token)}")
            return dict(csrf_token=generate_csrf)
        except Exception as e:
            print(f"Error in CSRF context processor: {e}")
            return dict(csrf_token=lambda: '')
    
    # User loader for Flask-Login
    @login_manager.user_loader
    def load_user(user_id):
        from models import User
        return User.query.get(int(user_id))
    
    # Register blueprints
    from routes import main_bp, auth_bp, api_bp, admin_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    
    # Create database tables
    with app.app_context():
        import models  # noqa: F401
        db.create_all()
        
        # Create admin user if it doesn't exist
        from models import User
        admin = User.query.filter_by(email='admin@emotiontrack.app').first()
        if not admin:
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
            db.session.add(admin)
            db.session.commit()
    
    return app

app = create_app()
