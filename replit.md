# Overview

EmotionTrack is a mental wellness platform designed for students to track their emotional states, complete psychological assessments, and connect with guidance counselors. The application serves as a comprehensive tool for monitoring student mental health, featuring emotion logging, DASS-21 assessments, consultation messaging, and admin oversight. Built with Flask and targeting high school students (grades 11-12), the platform emphasizes privacy, user-friendly design, and professional mental health support. The application has been renamed from MindTrack to EmotionTrack.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Template Engine**: Jinja2 templates with Bootstrap 5 for responsive UI
- **JavaScript Libraries**: jQuery for DOM manipulation, Chart.js for data visualization
- **CSS Framework**: Custom CLSU-themed styling with CSS Grid/Flexbox layouts
- **Responsive Design**: Mobile-first approach with sidebar navigation for authenticated users
- **Asset Management**: Local fallback assets for offline compatibility

## Backend Architecture
- **Web Framework**: Flask with Blueprint-based modular routing (main, auth, api, admin)
- **Authentication**: Flask-Login for session management with role-based access (student/admin)
- **Form Handling**: WTForms with CSRF protection for secure form validation
- **Database ORM**: SQLAlchemy with declarative base for object-relational mapping
- **Session Management**: Server-side sessions with configurable secret keys

## Data Storage Solutions
- **Primary Database**: PostgreSQL configured via DATABASE_URL environment variable
- **Connection Pooling**: SQLAlchemy engine with pool recycling and pre-ping health checks
- **Data Models**: User accounts, mood logs, DASS-21 results, and student-admin messaging
- **Cascade Relationships**: Automatic cleanup of related records on user deletion

## Authentication and Authorization
- **User Registration**: Multi-field registration with academic information (strand, grade level, section)
- **Password Security**: Werkzeug password hashing with salt
- **Role-Based Access**: Boolean admin flag for counselor/admin users
- **Session Protection**: Login required decorators and CSRF token validation
- **User Loader**: Flask-Login integration for automatic user session management

## External Dependencies
- **Bootstrap 5**: UI components and responsive grid system
- **Font Awesome**: Icon library for consistent visual elements
- **Chart.js**: Client-side charting for wellness data visualization
- **Google Fonts**: Poppins font family for modern typography
- **PostgreSQL**: Primary database backend
- **Werkzeug**: WSGI utilities and security helpers
- **ProxyFix**: Deployment middleware for reverse proxy compatibility