#!/usr/bin/env python3
"""
Database migration script to rename 'email' column to 'username' in users table.
"""

import os
from dotenv import load_dotenv
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

# Load environment variables
load_dotenv()

# Configure Flask app
app = Flask(__name__)
database_url = os.environ.get("DATABASE_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL environment variable is required")

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

def migrate_email_to_username():
    """Rename email column to username in users table."""
    with app.app_context():
        try:
            # Check if email column exists and username column doesn't
            result = db.session.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name IN ('email', 'username')
            """)).fetchall()

            columns = [row[0] for row in result]
            print(f"Found columns: {columns}")

            if 'email' in columns and 'username' not in columns:
                print("Renaming 'email' column to 'username'...")
                db.session.execute(text("ALTER TABLE users RENAME COLUMN email TO username"))
                db.session.commit()
                print("Migration completed successfully!")
            elif 'email' in columns and 'username' in columns:
                print("Both email and username columns exist. This shouldn't happen.")
                # Check if we need to migrate data
                count_with_email = db.session.execute(text("SELECT COUNT(*) FROM users WHERE email IS NOT NULL")).scalar()
                count_with_username = db.session.execute(text("SELECT COUNT(*) FROM users WHERE username IS NOT NULL")).scalar()
                print(f"Records with email: {count_with_email}, with username: {count_with_username}")

                if count_with_email > 0 and count_with_username == 0:
                    print("Migrating data from email to username column...")
                    db.session.execute(text("UPDATE users SET username = email WHERE email IS NOT NULL"))
                    db.session.commit()
                    print("Data migration completed. You can now drop the email column if needed.")
                elif count_with_username > 0:
                    print("Username column already has data. Migration appears complete.")
            elif 'username' in columns:
                print("Username column already exists. Migration may have been completed already.")
            else:
                print("Neither email nor username column found. Please check the database schema.")

        except Exception as e:
            print(f"Migration failed: {str(e)}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    migrate_email_to_username()