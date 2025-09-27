from app import db, create_app
import traceback

app = create_app()

print("Starting database migration...")

with app.app_context():
    try:
        print("Checking existing columns...")

        # Check if columns already exist
        result = db.session.execute(db.text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name IN ('lrn', 'employee_id')
        """)).fetchall()

        existing_columns = [row[0] for row in result]
        print(f"Existing columns: {existing_columns}")

        if 'lrn' not in existing_columns:
            print("Adding lrn column...")
            db.session.execute(db.text("ALTER TABLE users ADD COLUMN lrn VARCHAR(20) UNIQUE"))
            print("✓ Added lrn column")
        else:
            print("✓ lrn column already exists")

        if 'employee_id' not in existing_columns:
            print("Adding employee_id column...")
            db.session.execute(db.text("ALTER TABLE users ADD COLUMN employee_id VARCHAR(20) UNIQUE"))
            print("✓ Added employee_id column")
        else:
            print("✓ employee_id column already exists")

        # Check if email is already nullable
        email_result = db.session.execute(db.text("""
            SELECT is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'email'
        """)).fetchone()

        if email_result and email_result[0] == 'YES':
            print("✓ email column is already nullable")
        else:
            print("Making email column nullable...")
            db.session.execute(db.text("ALTER TABLE users ALTER COLUMN email DROP NOT NULL"))
            print("✓ Made email column nullable")

        db.session.commit()
        print("🎉 Database migration completed successfully!")

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error during migration: {e}")
        print("Full traceback:")
        traceback.print_exc()
        raise