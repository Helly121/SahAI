import db
from sqlalchemy import text

with db.engine.begin() as conn:
	conn.execute(text("INSERT INTO user_progress (user_id, activity_type, activity_id, score, details) VALUES (:user_id, :atype, :aid, :score, :details)"),
				 {"user_id": 'test@example.com', "atype": 'aptitude', "aid": 'apt1', "score": 100, "details": '{}'})
	conn.execute(text("INSERT INTO user_progress (user_id, activity_type, activity_id, score, details) VALUES (:user_id, :atype, :aid, :score, :details)"),
				 {"user_id": 'test@example.com', "atype": 'mock_interview', "aid": 'mock1', "score": 80, "details": '{}'})
	conn.execute(text("INSERT INTO user_gamification (user_id, streak_days, total_completions, badges, last_activity) VALUES (:id, :streak, :total, :badges, :last) ON CONFLICT (user_id) DO UPDATE SET streak_days = :streak, total_completions = :total"),
				 {"id": 'test@example.com', "streak": 3, "total": 2, "badges": '[]', "last": '2025-10-27'})
	conn.execute(text("INSERT INTO leaderboard (user_id, rank_score) VALUES (:id, :score) ON CONFLICT (user_id) DO UPDATE SET rank_score = :score"), {"id": 'test@example.com', "score": 180})

print("Seeded!")