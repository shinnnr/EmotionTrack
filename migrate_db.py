from app import db, create_app

app = create_app()

with app.app_context():
    # Add new columns to existing users table
    try:
        # Check if columns already exist
        result = db.session.execute(db.text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name IN ('lrn', 'employee_id')
        """)).fetchall()

        existing_columns = [row[0] for row in result]

        if 'lrn' not in existing_columns:
            print("Adding lrn column...")
            db.session.execute(db.text("ALTER TABLE users ADD COLUMN lrn VARCHAR(20) UNIQUE"))
            print("Added lrn column")

        if 'employee_id' not in existing_columns:
            print("Adding employee_id column...")
            db.session.execute(db.text("ALTER TABLE users ADD COLUMN employee_id VARCHAR(20) UNIQUE"))
            print("Added employee_id column")

        # Make email nullable
        db.session.execute(db.text("ALTER TABLE users ALTER COLUMN email DROP NOT NULL"))
        print("Made email column nullable")

        db.session.commit()
        print("Database migration completed successfully!")

    except Exception as e:
        db.session.rollback()
        print(f"Error during migration: {e}")
        raise