from sqlalchemy import text
import db

# Drop and recreate all tables (useful for local reset)
db.metadata.drop_all(db.engine)
db.metadata.create_all(db.engine)

with db.engine.begin() as conn:
    conn.execute(text("INSERT INTO users (id, username, email, password, coins, badges) VALUES (:id, :username, :email, :password, :coins, :badges) ON CONFLICT (id) DO NOTHING"),
                 {"id": 'test@example.com', "username": 'Test User', "email": 'test@example.com', "password": 'dummy', "coins": 0, "badges": '[]'})

print("DB fixed & ready (SQLAlchemy).")