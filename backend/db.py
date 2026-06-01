import os
import json
from datetime import date
from werkzeug.security import generate_password_hash
from sqlalchemy import (
    create_engine, MetaData, Table, Column, Integer, String, Text, DateTime, func, select
)

# DB URL prefers managed DATABASE_URL; falls back to local sqlite file
LOCAL_DB_FILE = os.path.join(os.path.dirname(__file__), 'skillforge.db')
_raw_db = os.getenv('DATABASE_URL')
if _raw_db:
    _raw_db = _raw_db.strip()
    # remove surrounding quotes if someone pasted them in the UI
    if (_raw_db.startswith('"') and _raw_db.endswith('"')) or (_raw_db.startswith("'") and _raw_db.endswith("'")):
        _raw_db = _raw_db[1:-1].strip()
    # convert legacy postgres:// scheme to postgresql:// which SQLAlchemy expects
    if _raw_db.startswith('postgres://'):
        _raw_db = 'postgresql://' + _raw_db[len('postgres://'):]
    DB_URL = _raw_db
else:
    DB_URL = f"sqlite:///{LOCAL_DB_FILE}"

try:
    engine = create_engine(DB_URL, future=True)
except Exception as e:
    print(f"Database URL parse error: {e}")
    print("Sanitized DATABASE_URL:", repr(DB_URL))
    raise
metadata = MetaData()

users = Table(
    'users', metadata,
    Column('id', String, primary_key=True),
    Column('username', String, nullable=False),
    Column('email', String, nullable=False, unique=True),
    Column('password', String, nullable=False),
    Column('coins', Integer, default=0),
    Column('badges', Text, default='[]')
)

user_progress = Table(
    'user_progress', metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('user_id', String, nullable=False),
    Column('activity_type', String, nullable=False),
    Column('activity_id', String, nullable=False),
    Column('completed_at', DateTime, server_default=func.now()),
    Column('score', Integer, default=0),
    Column('details', Text, default='{}')
)

user_gamification = Table(
    'user_gamification', metadata,
    Column('user_id', String, primary_key=True),
    Column('streak_days', Integer, default=0),
    Column('total_completions', Integer, default=0),
    Column('badges', Text, default='[]'),
    Column('last_activity', String)
)

leaderboard = Table(
    'leaderboard', metadata,
    Column('user_id', String, primary_key=True),
    Column('rank_score', Integer, default=0),
    Column('updated_at', DateTime, server_default=func.now())
)

contacts = Table(
    'contacts', metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('name', String, nullable=False),
    Column('email', String, nullable=False),
    Column('message', Text, nullable=False),
    Column('created_at', DateTime, server_default=func.now())
)

feedbacks = Table(
    'feedbacks', metadata,
    Column('id', Integer, primary_key=True, autoincrement=True),
    Column('name', String, nullable=False),
    Column('feedback', Text, nullable=False),
    Column('created_at', DateTime, server_default=func.now())
)


def init_db():
    """Create tables and a default test user if missing."""
    metadata.create_all(engine)
    with engine.begin() as conn:
        exists = conn.execute(select(users.c.id).where(users.c.id == 'test@example.com')).fetchone()
        if not exists:
            conn.execute(
                users.insert().values(
                    id='test@example.com',
                    username='Test User',
                    email='test@example.com',
                    password=generate_password_hash('dummy')
                )
            )
    print("DB initialized (SQLAlchemy).")
