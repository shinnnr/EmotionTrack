import os
import psycopg2
import traceback
from dotenv import load_dotenv

print("Starting database migration...")

# Load environment variables from .env file
load_dotenv()

# Get database URL from environment
database_url = os.getenv('DATABASE_URL')
if not database_url:
    print("ERROR: DATABASE_URL not found in environment")
    exit(1)

print("Database URL found: {}...".format(database_url[:50]))

try:
    # Connect to database
    conn = psycopg2.connect(database_url)
    conn.autocommit = True
    cursor = conn.cursor()

    print("Connected to database successfully")

    # Check existing columns
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name IN ('lrn', 'employee_id')
    """)
    existing_columns = [row[0] for row in cursor.fetchall()]
    print("Existing columns: {}".format(existing_columns))

    # Add lrn column if it doesn't exist
    if 'lrn' not in existing_columns:
        print("Adding lrn column...")
        cursor.execute("ALTER TABLE users ADD COLUMN lrn VARCHAR(20) UNIQUE")
        print("SUCCESS: Added lrn column")
    else:
        print("SKIP: lrn column already exists")

    # Add employee_id column if it doesn't exist
    if 'employee_id' not in existing_columns:
        print("Adding employee_id column...")
        cursor.execute("ALTER TABLE users ADD COLUMN employee_id VARCHAR(20) UNIQUE")
        print("SUCCESS: Added employee_id column")
    else:
        print("SKIP: employee_id column already exists")

    # Check if email is nullable
    cursor.execute("""
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email'
    """)
    email_result = cursor.fetchone()

    if email_result and email_result[0] == 'YES':
        print("SKIP: email column is already nullable")
    else:
        print("Making email column nullable...")
        cursor.execute("ALTER TABLE users ALTER COLUMN email DROP NOT NULL")
        print("SUCCESS: Made email column nullable")

    cursor.close()
    conn.close()

    print("SUCCESS: Database migration completed successfully!")

except Exception as e:
    print("ERROR: Error during migration: {}".format(e))
    print("Full traceback:")
    traceback.print_exc()
    exit(1)