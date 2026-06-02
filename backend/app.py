from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
import spacy
import librosa
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
import db
import numpy as np
from pydub import AudioSegment
import io
import re
from sklearn.metrics.pairwise import cosine_similarity
import json
from datetime import date
from typing import List, Dict
import os
import tempfile
import traceback
import random
import base64  # For TTS b64 if needed
import warnings  # To suppress deprecation warnings

from dotenv import load_dotenv
load_dotenv()  # Loads .env

# Suppress librosa FutureWarning
warnings.filterwarnings("ignore", category=FutureWarning)

# Groq Integration (pip install groq openai)
from openai import OpenAI
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
if GROQ_API_KEY:
    client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=GROQ_API_KEY
    )
else:
    client = None
    print("Warning: GROQ_API_KEY is not set. Groq-powered AI feedback and TTS will be disabled or use fallback mode.")

# Guarded imports with fallbacks
try:
    from ai.nlp.nlp_analysis import (
        compute_similarity, generate_suggestions, advanced_grammar_analysis,
        detect_fillers, generate_expected_keywords, compute_keyword_coverage,
        translate_hinglish_to_english
    )
except ImportError as e:
    print(f"NLP import error: {e}. Fallbacks active.")
    def compute_similarity(q, t): 
        # Basic fallback
        q_words = set(q.lower().split())
        t_words = set(t.lower().split())
        overlap = len(q_words.intersection(t_words)) / len(q_words) if q_words else 0
        return max(0.0, min(1.0, overlap))
    def generate_suggestions(t): return ["Good start—add examples!"]
    def advanced_grammar_analysis(t): return "Grammar: Solid."
    def detect_fillers(t): return len(re.findall(r'\bum\b|\buh\b|\blike\b|\ber\b|\bbasically\b|\byou know\b', t.lower(), re.IGNORECASE))
    def generate_expected_keywords(q, qt): return ['skills', 'experience', 'team', 'challenge']
    def compute_keyword_coverage(user_kws, expected): 
        user_set = set(user_kws)
        matches = sum(1 for kw in expected if any(word in kw.lower() for word in user_set))
        return matches / len(expected) if expected else 0
    def translate_hinglish_to_english(t): return t

try:
    from ai.speech.speech_analysis import analyze_vocal_enhanced
except ImportError as e:
    print(f"Speech import error: {e}. Basic fallback.")
    def analyze_vocal_enhanced(p, t=""): 
        return {'fluency': 0.7, 'pauses': 1, 'vocal': 'Steady voice.', 'wpm': 120, 'energy_variation': 0.4, 'tempo_fluctuation': 0.1, 'jitter': 0.02, 'emotion': 'confident'}

try:
    from ai.speech.tts import generate_tts_audio_bytes
except ImportError:
    def generate_tts_audio_bytes(text, voice="default"): return None

app = Flask(__name__)
CORS(app)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'skillforge-secret-2025')
jwt = JWTManager(app)

DB_PATH = os.getenv('DB_PATH', os.path.join(os.path.dirname(__file__), 'skillforge.db'))

# SpaCy
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("SpaCy model missing—install en_core_web_sm.")
    nlp = None

ADMIN_EMAILS = ['sanskar.chitnis241@vit.edu']

db.init_db()

def analyze_sentiment_emotion(text):
    if not nlp or not text.strip(): return "neutral", "hesitant"
    doc = nlp(text)
    sentiment_score = sum(token.sentiment for token in doc)
    sentiment = "positive" if sentiment_score > 0.1 else "negative" if sentiment_score < -0.1 else "neutral"
    emotion = "confident" if any(word in text.lower() for word in ["excited", "achieve", "strength"]) else "hesitant"
    if "don't know" in text.lower(): emotion = "hesitant"
    return sentiment, emotion

def generate_discussion_reply(topic, user_input, conversation):
    if client is None:
        return "Interesting point! What makes you think that? Let's explore this further."
    try:
        prompt = f"""
        Topic: {topic}

        Conversation so far: {json.dumps(conversation)}

        User: {user_input}

        Respond as an engaging discussion partner, 1-2 sentences, insightful and encouraging.
        """
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.8
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Discussion reply error: {e}")
        return "Interesting point! What makes you think that? Let's explore this further."

def generate_mock_feedback(text, question_type, similarity, fluency, sentiment, vocal):
    # Simple heuristic fallback
    strengths = ["Your response shows good intent—build on that!"]
    improvements = ["Add more specifics next time."]
    mock_tips = ["Practice with STAR method."]
    return strengths, improvements, mock_tips

@app.route('/api/analyze', methods=['POST'])
def analyze():
    result = {
        'overall': 0, 'semantic_similarity': 0.0, 'fluency': 0.0, 'filler_count': 0,
        'pauses': 0, 'keyword_coverage': 0.0, 'wpm': 0, 'energy_variation': 0.0,
        'tempo_fluctuation': 0.0, 'jitter': 0.0, 'strengths': [], 'improvements': [], 'mock_tips': [],
        'example_answer': '', 'grammar': "Analysis in progress...", 'sentiment': "neutral",
        'emotion': "neutral", 'vocal': "Analysis in progress...", 'blended_confidence': 0.0,
        'translated_text': ''
    }
    
    try:
        text = request.form.get('text', '').strip()
        audio_file = request.files.get('audio')
        js_conf = float(request.form.get('confidence', 0.5))
        question = request.form.get('question', '')
        question_type = request.form.get('question_type', 'default')
        bilingual = request.form.get('bilingual', 'false').lower() == 'true'

        if not text and not audio_file:
            result['error'] = 'No input—let\'s hear your thoughts!'
            return jsonify(result), 400

        original_text = text
        if bilingual and text:
            text = translate_hinglish_to_english(text)
            result['translated_text'] = text if text != original_text else ''

        is_uncertain = any(phrase in text.lower() for phrase in ["don't know", "sorry", "unsure", "idk"])


        # Semantic
        result['semantic_similarity'] = compute_similarity(question, text)
        if is_uncertain: result['semantic_similarity'] *= 0.3

        # Fillers & Keywords
        result['filler_count'] = detect_fillers(text)
        if is_uncertain: result['filler_count'] += 3
        expected_keywords = generate_expected_keywords(question, question_type)
        user_keywords = [token.text.lower() for token in nlp(text) if token.is_alpha and len(token.text) > 3] if nlp else text.lower().split()
        result['keyword_coverage'] = compute_keyword_coverage(user_keywords, expected_keywords)

        # Grammar
        result['grammar'] = advanced_grammar_analysis(text)

        # Sentiment/Emotion
        result['sentiment'], result['emotion'] = analyze_sentiment_emotion(text)

        # Vocal + Delivery
        result['pauses'] = 0; result['fluency'] = 0.5; result['vocal'] = "Voice analysis pending—full recording unlocks your unique rhythm!"
        result['blended_confidence'] = js_conf * 0.5; result['wpm'] = 0; result['energy_variation'] = 0.0
        result['tempo_fluctuation'] = 0.0; result['jitter'] = 0.0
        if audio_file:
            try:
                temp_dir = tempfile.gettempdir()
                temp_path = os.path.join(temp_dir, f"temp_audio_{random.randint(1000,9999)}.wav")
                print(f"Saving audio to temp: {temp_path}")  # Debug
                audio_file.save(temp_path)
                vocal_result = analyze_vocal_enhanced(temp_path, text)  # Pass text for WPM
                if isinstance(vocal_result, dict):
                    result.update(vocal_result)
                # Adjust for uncertainty/short text
                if len(text) < 30 or is_uncertain:
                    result['fluency'] *= 0.6
                result['blended_confidence'] = min(js_conf * 0.4 + result['fluency'] * 0.6, 1.0)
                print("Vocal analysis success")  # Debug
            except Exception as vocal_e:
                print(f"Vocal error details: {vocal_e}")  # Better logging
                result['vocal'] = "Audio blip—retry for your full vocal story; it's worth it!"
            finally:
                # Safe delete
                try:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                        print(f"Temp file deleted: {temp_path}")  # Debug
                    else:
                        print(f"Temp file not found for delete: {temp_path} (already cleaned?)")  # Debug
                except Exception as delete_e:
                    print(f"Delete error (ignore): {delete_e}")
        else:
            print("No audio file—using text-only analysis")  # Debug
            # Text-only defaults
            word_count = len(text.split())
            result['wpm'] = word_count / 0.5 * 60 if word_count else 0  # Assume 30s speak time
            result['energy_variation'] = 0.4
            result['tempo_fluctuation'] = 0.1
            result['jitter'] = 0.02
            result['emotion'] = 'confident'

        # Dynamic Groq LLM Feedback (robust parsing + safe fallback)
        try:
            if client is None:
                raise RuntimeError("No Groq API client available")
            print("Calling Groq LLM for feedback...")  # Debug
            prompt = f"""
            You are an expert mock interview coach—empathetic, encouraging, specific like a trusted mentor for Indian placements.
            Question: "{question}" (Type: {question_type})

            User Transcript: "{text}"
            Metrics:
            - Semantic Similarity: {result['semantic_similarity']:.1%}
            - Fluency: {result['fluency']:.1%}
            - Fillers: {result['filler_count']}
            - Pauses: {result['pauses']}
            - Keyword Coverage: {result['keyword_coverage']:.1%}
            - WPM: {result['wpm']}
            - Energy Variation: {result['energy_variation']:.2f} (higher = dynamic)
            - Tempo Fluctuation: {result['tempo_fluctuation']:.2f} (lower = steady)
            - Jitter: {result['jitter']:.2f} (lower = confident)
            - Grammar: {result['grammar']}
            - Sentiment: {result['sentiment']}
            - Emotion/Tone: {result['emotion']}

            Generate in JSON only:
            {{
                "strengths": ["1-3 bullets: Warm praise on highs (e.g., 'Your {result['wpm']} WPM kept it natural—engaging!')"],
                "improvements": ["1-3 bullets: Gentle, actionable fixes on lows (e.g., '{result['filler_count']} fillers—try breath anchors for polish.')"],
                "mock_tips": ["1-2 pro tips: Tailored to type/metrics (e.g., STAR for behavioral; '120-150 WPM ideal for clarity.')"],
                "example_answer": "2-4 sentence model: Concise, ideal version using user's strengths + fixes (quantify, STAR if behavioral)."
            }}
            Keep encouraging, specific, under 200 words. For uncertainty: 'Honesty shines—pivot to growth stories like \"Eager to explore...\"!'
            Indian context: Suggest cultural fits like confident eye contact in panels.
            """

            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=400,
                temperature=0.7
            )

            # Robust extraction of text from various possible response shapes
            raw_text = ""
            try:
                if hasattr(response, "choices") and len(response.choices) > 0:
                    choice = response.choices[0]
                    # Try common fields in priority
                    if hasattr(choice, "message"):
                        msg = choice.message
                        raw_text = getattr(msg, "content", None) or (msg.get("content") if isinstance(msg, dict) else None)
                    if not raw_text:
                        raw_text = getattr(choice, "text", None) or (choice.get("text") if isinstance(choice, dict) else None)
                if not raw_text:
                    # fallback to converting entire response
                    raw_text = getattr(response, "text", None) or str(response)
            except Exception as ex:
                print("Error extracting raw LLM text:", ex)
                raw_text = str(response)

            raw_text = raw_text.strip() if isinstance(raw_text, str) else str(raw_text)

            # Try to locate JSON substring (the model may wrap JSON with commentary)
            llm_output = None
            try:
                import re
                m = re.search(r'\{[\s\S]*\}', raw_text)
                json_text = m.group(0) if m else raw_text
                llm_output = json.loads(json_text)
                print("Groq LLM parsed JSON successfully")
            except Exception as parse_e:
                print("LLM JSON parse failed:", parse_e)
                print("Raw LLM output preview:", raw_text[:800].replace("\n", " "))
                llm_output = None

            if llm_output:
                result['strengths'] = llm_output.get('strengths', [])
                result['improvements'] = llm_output.get('improvements', [])
                result['mock_tips'] = llm_output.get('mock_tips', [])
                result['example_answer'] = llm_output.get('example_answer', '')
            else:
                # Safe fallback: use internal heuristic generator so UI still receives meaningful feedback
                try:
                    strengths, improvements, mock_tips = generate_mock_feedback(text, question_type, result['semantic_similarity'], result.get('fluency', 0.5), result.get('sentiment', 'neutral'), result.get('vocal', ''))
                    result['strengths'] = strengths
                    result['improvements'] = improvements
                    result['mock_tips'] = mock_tips
                    result['example_answer'] = "Model answer unavailable — try again or enable LLM debugging."
                except Exception as fallback_e:
                    print("Fallback feedback generation failed:", fallback_e)
                    result['strengths'] = ["Good attempt — specifics will be provided after retry."]
                    result['improvements'] = ["Retry the analysis; an assistant will produce tailored tips."]
                    result['mock_tips'] = []
                    result['example_answer'] = ""
        except Exception as llm_e:
            # Ensure LLM exceptions don't break analysis; keep a helpful fallback
            print(f"Groq LLM error details: {llm_e}\n{traceback.format_exc()}")
            try:
                strengths, improvements, mock_tips = generate_mock_feedback(text, question_type, result['semantic_similarity'], result.get('fluency', 0.5), result.get('sentiment', 'neutral'), result.get('vocal',''))
                result['strengths'] = strengths
                result['improvements'] = improvements
                result['mock_tips'] = mock_tips
                result['example_answer'] = "Model answer unavailable due to LLM error."
            except Exception:
                result['strengths'] = ["Analysis unavailable."]
                result['improvements'] = []
                result['mock_tips'] = []
                result['example_answer'] = ""

        # Overall Score (Advanced Weighted)
        weights = {
            'semantic_similarity': 0.25, 'fluency': 0.20, 'keyword_coverage': 0.15,
            'blended_confidence': 0.15, 'energy_variation': 0.10, 'tempo_fluctuation': 0.10,
            'wpm': 0.05
        }
        wpm_norm = max(0, min(1, (result['wpm'] - 80) / 70))
        tempo_norm = max(0, min(1, 1 - result['tempo_fluctuation']))
        energy_norm = min(1, result['energy_variation'] * 2)
        jitter_penalty = 1 - min(1, result['jitter'] * 0.5)
        score_sum = (
            result['semantic_similarity'] * weights['semantic_similarity'] +
            result['fluency'] * weights['fluency'] +
            result['keyword_coverage'] * weights['keyword_coverage'] +
            result['blended_confidence'] * weights['blended_confidence'] +
            energy_norm * weights['energy_variation'] +
            tempo_norm * weights['tempo_fluctuation'] +
            wpm_norm * weights['wpm'] * jitter_penalty
        )
        result['overall'] = int(score_sum * 100)
        if is_uncertain: result['overall'] = max(0, result['overall'] * 0.7)

        print(f"Full result keys: {list(result.keys())}")  # Debug: Confirm all fields

    except Exception as e:
        print(f"Critical analyze error: {e}\n{traceback.format_exc()}")
        result['error'] = "Unexpected hiccup—let's try again; your input's gold!"

    # Optional: TTS Audio
    if request.form.get('include_tts', 'false').lower() == 'true':
        tts_bytes = generate_tts_audio_bytes(result['vocal'], "default")
        if tts_bytes:
            result['tts_audio_b64'] = base64.b64encode(tts_bytes).decode('utf-8')

    return jsonify(result)

@app.route('/api/award-coins', methods=['POST'])
@jwt_required()
def award_coins():
    try:
        user_id = get_jwt_identity()
        data = request.json
        base_coins = 10
        bonus = 5 if data.get('confidence', 0) > 0.8 and data.get('relevance', 0) > 0.6 else 0
        total = base_coins + bonus
        # Use SQLAlchemy engine for DB operations (works with Postgres or sqlite)
        with db.engine.begin() as conn:
            conn.execute(text("UPDATE users SET coins = coins + :inc WHERE id = :id"), {"inc": total, "id": user_id})
            coin_row = conn.execute(text("SELECT coins FROM users WHERE id = :id"), {"id": user_id}).fetchone()
            new_coins = coin_row[0] if coin_row else 0

            badge_row = conn.execute(text("SELECT badges FROM users WHERE id = :id"), {"id": user_id}).fetchone()
            current_badges = json.loads(badge_row[0]) if badge_row and badge_row[0] else []
            questions_completed = data.get('questionIndex', 0) + 1
            new_badges = []
            if questions_completed % 5 == 0 and 'Bronze Speaker' not in current_badges:
                new_badges.append('Bronze Speaker')
                current_badges.append('Bronze Speaker')
                conn.execute(text("UPDATE users SET badges = :badges WHERE id = :id"), {"badges": json.dumps(current_badges), "id": user_id})

        return jsonify({'coins': new_coins, 'newBadges': new_badges})
    except Exception as e:
        print("Error in /api/award-coins:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json
    username = data['username']
    email = data['email']
    password = generate_password_hash(data['password'])
    try:
        with db.engine.begin() as conn:
            conn.execute(text("INSERT INTO users (id, username, email, password) VALUES (:id, :username, :email, :password)"),
                         {"id": email, "username": username, "email": email, "password": password})
        access_token = create_access_token(identity=email)
        return jsonify({'token': access_token, 'user': email, 'username': username, 'msg': 'Signed up!'})
    except IntegrityError:
        return jsonify({'error': 'User exists'}), 400

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data['email']
    password = data['password']
    with db.engine.connect() as conn:
        row = conn.execute(text("SELECT password, username FROM users WHERE id = :id"), {"id": email}).fetchone()
    if row and check_password_hash(row[0], password):
        access_token = create_access_token(identity=email)
        return jsonify({'token': access_token, 'user': email, 'username': row[1], 'msg': 'Logged in!'})
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/progress/complete', methods=['POST'])
@jwt_required()
def complete_activity():
    try:
        user_id = get_jwt_identity()
        data = request.json
        activity_type = data['activityType']
        activity_id = data['activityId']
        score = data.get('score', 0)
        details = json.dumps(data.get('details', {}))

        # Use SQLAlchemy for DB operations
        is_practice_question = (activity_type == 'aptitude' and str(activity_id).isdigit())
        new_streak = 0
        rank_score = 0
        with db.engine.begin() as conn:
            conn.execute(text("INSERT INTO user_progress (user_id, activity_type, activity_id, score, details) VALUES (:user_id, :activity_type, :activity_id, :score, :details)"),
                         {"user_id": user_id, "activity_type": activity_type, "activity_id": str(activity_id), "score": score, "details": details})

            if is_practice_question:
                today = date.today().isoformat()
                row = conn.execute(text("SELECT streak_days, total_completions, last_activity FROM user_gamification WHERE user_id = :id"), {"id": user_id}).fetchone()
                new_streak = 1
                if row and row[2] == today:
                    new_streak = (row[0] or 0) + 1
                # Update or insert gamification
                if row:
                    total_completions = (row[1] or 0) + 1
                    conn.execute(text("UPDATE user_gamification SET streak_days = :streak, last_activity = :last, total_completions = :total WHERE user_id = :id"),
                                 {"streak": new_streak, "last": today, "total": total_completions, "id": user_id})
                else:
                    conn.execute(text("INSERT INTO user_gamification (user_id, streak_days, last_activity, total_completions, badges) VALUES (:id, :streak, :last, :total, :badges)"),
                                 {"id": user_id, "streak": new_streak, "last": today, "total": 1, "badges": '[]'})

                rank_score = new_streak * 100
                existing = conn.execute(text("SELECT user_id FROM leaderboard WHERE user_id = :id"), {"id": user_id}).fetchone()
                if existing:
                    conn.execute(text("UPDATE leaderboard SET rank_score = :score WHERE user_id = :id"), {"score": rank_score, "id": user_id})
                else:
                    conn.execute(text("INSERT INTO leaderboard (user_id, rank_score) VALUES (:id, :score)"), {"id": user_id, "score": rank_score})

        return jsonify({
            'success': True,
            'streak': new_streak if is_practice_question else 0,
            'rank_score': rank_score if is_practice_question else 0
        })

    except Exception as e:
        print("Error in complete_activity:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/progress/profile/me', methods=['GET'])
@jwt_required()
def get_my_profile():
    user_id = get_jwt_identity()  # This is the logged-in user's email/id
    with db.engine.connect() as conn:
        rows = conn.execute(text("SELECT id, user_id, activity_type, activity_id, completed_at, score, details FROM user_progress WHERE user_id = :id"), {"id": user_id}).fetchall()
        progress = []
        for r in rows:
            details = {}
            try:
                if r[6]:
                    details = json.loads(r[6])
            except Exception:
                details = {}
            progress.append({
                'id': r[0],
                'user_id': r[1],
                'activity_type': r[2],
                'activity_id': r[3],
                'completed_at': r[4],
                'score': r[5],
                'details': details
            })

        gam_row = conn.execute(text("SELECT streak_days, total_completions, badges FROM user_gamification WHERE user_id = :id"), {"id": user_id}).fetchone()
        gamify = {
            'streak_days': gam_row[0] if gam_row else 0,
            'total_completed': gam_row[1] if gam_row else 0,
            'badges': json.loads(gam_row[2]) if gam_row and gam_row[2] else []
        }

        coin_row = conn.execute(text("SELECT coins FROM users WHERE id = :id"), {"id": user_id}).fetchone()
        gamify['coins'] = coin_row[0] if coin_row else 0

    return jsonify({'progress': progress, 'gamify': gamify})

@app.route('/api/progress/profile/<path:user_id>', methods=['GET'])
@jwt_required()
def get_profile(user_id):
    current_user = get_jwt_identity()
    if current_user != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    with db.engine.connect() as conn:
        rows = conn.execute(text("SELECT id, user_id, activity_type, activity_id, completed_at, score, details FROM user_progress WHERE user_id = :id"), {"id": user_id}).fetchall()
        progress = []
        for r in rows:
            try:
                details = json.loads(r[6]) if r[6] else {}
            except Exception:
                details = {}
            progress.append({'id': r[0], 'user_id': r[1], 'activity_type': r[2], 'activity_id': r[3], 'completed_at': r[4], 'score': r[5], 'details': details})

        gamify_row = conn.execute(text("SELECT user_id, streak_days, total_completions, badges FROM user_gamification WHERE user_id = :id"), {"id": user_id}).fetchone()
        gamify = {'streak_days': gamify_row[1] if gamify_row else 0, 'total_completed': gamify_row[2] if gamify_row else 0, 'badges': json.loads(gamify_row[3]) if gamify_row and gamify_row[3] else []}

        coin_row = conn.execute(text("SELECT coins FROM users WHERE id = :id"), {"id": user_id}).fetchone()
        gamify['coins'] = coin_row[0] if coin_row else 0

    return jsonify({'progress': progress, 'gamify': gamify})

@app.route('/api/progress/profile/share/<path:user_id>', methods=['GET'])
def get_shareable_profile(user_id):
    try:
        with db.engine.connect() as conn:
            user_row = conn.execute(text("SELECT username, email, coins, badges FROM users WHERE id = :id"), {"id": user_id}).fetchone()
            if not user_row:
                return jsonify({'error': 'User not found'}), 404
            username, email, coins, badges = user_row
            rows = conn.execute(text("SELECT id, user_id, activity_type, activity_id, completed_at, score, details FROM user_progress WHERE user_id = :id"), {"id": user_id}).fetchall()
            progress = []
            for r in rows:
                details = {}
                try:
                    if r[6]:
                        details = json.loads(r[6])
                except Exception:
                    details = {}
                progress.append({
                    'id': r[0], 'user_id': r[1], 'activity_type': r[2], 'activity_id': r[3], 'completed_at': r[4], 'score': r[5], 'details': details
                })
            gam_row = conn.execute(text("SELECT streak_days, total_completions, badges FROM user_gamification WHERE user_id = :id"), {"id": user_id}).fetchone()
            gamify = {
                'streak_days': gam_row[0] if gam_row else 0,
                'total_completed': gam_row[1] if gam_row else 0,
                'badges': json.loads(gam_row[2]) if gam_row and gam_row[2] else [],
                'coins': coins
            }
            verification_hash = base64.b64encode(f"{email}-verified-by-skillforge-ai".encode()).decode()
        return jsonify({
            'username': username,
            'email': email,
            'progress': progress,
            'gamify': gamify,
            'verified': True,
            'verification_hash': verification_hash
        })
    except Exception as e:
        print("Public profile share route error:", e)
        return jsonify({'error': str(e)}), 500

@app.route('/api/public/candidates', methods=['GET'])
def get_public_candidates():
    try:
        candidates = []
        with db.engine.connect() as conn:
            users = conn.execute(text("SELECT id, username, coins, badges FROM users")).fetchall()
            for u in users:
                email, name, coins, badges_json = u
                progress_rows = conn.execute(text("SELECT activity_type, score FROM user_progress WHERE user_id = :id"), {"id": email}).fetchall()
                apt_scores = [r[1] for r in progress_rows if r[0] == 'aptitude']
                mock_scores = [r[1] for r in progress_rows if r[0] == 'mock_interview']
                debate_scores = [r[1] for r in progress_rows if r[0] in ['soft_skills', 'debate']]
                avg_apt = int(sum(apt_scores)/len(apt_scores)) if apt_scores else 60
                avg_mock = int(sum(mock_scores)/len(mock_scores)) if mock_scores else 70
                avg_debate = int(sum(debate_scores)/len(debate_scores)) if debate_scores else 65
                candidates.append({
                    'email': email,
                    'username': name,
                    'coins': coins,
                    'badges': json.loads(badges_json or '[]'),
                    'avg_aptitude': avg_apt,
                    'avg_mock': avg_mock,
                    'avg_debate': avg_debate
                })
        return jsonify(candidates)
    except Exception as e:
        print("Candidates fetch error:", e)
        return jsonify({'error': str(e)}), 500


# ADD THIS ROUTE IN YOUR app.py
@app.route('/api/gamification/minigame', methods=['POST'])
@jwt_required()
def award_minigame_coins():
    try:
        user_id = get_jwt_identity()
        data = request.json
        reward = data.get('reward', 50)
        today = date.today().isoformat()
        with db.engine.begin() as conn:
            conn.execute(text("UPDATE users SET coins = coins + :reward WHERE id = :id"), {"reward": reward, "id": user_id})
            row = conn.execute(text("SELECT total_completions, streak_days FROM user_gamification WHERE user_id = :id"), {"id": user_id}).fetchone()
            if row:
                total = (row[0] or 0) + 1
                conn.execute(text("UPDATE user_gamification SET total_completions = :total, last_activity = :last WHERE user_id = :id"), {"total": total, "last": today, "id": user_id})
            else:
                conn.execute(text("INSERT INTO user_gamification (user_id, total_completions, streak_days, last_activity, badges) VALUES (:id, :total, :streak, :last, :badges)"), {"id": user_id, "total": 1, "streak": 0, "last": today, "badges": '[]'})
        return jsonify({"success": True, "coins_added": reward})
    except Exception as e:
        print("Mini-game reward error:", e)
        return jsonify({"error": "Failed to award coins"}), 500

@app.route('/api/progress/leaderboard', methods=['GET'])
@jwt_required()
def get_leaderboard():
    with db.engine.connect() as conn:
        q = text("""
            SELECT 
                u.username,
                COALESCE(g.streak_days, 0),
                COALESCE(g.total_completions, 0),
                COALESCE(l.rank_score, 0)
            FROM users u
            LEFT JOIN user_gamification g ON u.id = g.user_id
            LEFT JOIN leaderboard l ON u.id = l.user_id
            ORDER BY l.rank_score DESC, g.total_completions DESC
            LIMIT 10
        """)
        res = conn.execute(q).fetchall()
        rows = [{'username': r[0] or 'Player', 'streak_days': r[1], 'total_completed': r[2], 'rank_score': r[3]} for r in res]
    return jsonify(rows)

@app.route('/api/contact', methods=['POST'])
def contact():
    try:
        data = request.json
        if not data or not all(k in data for k in ['name', 'email', 'message']):
            return jsonify({'error': 'Missing required fields'}), 400
        
        print(f"New Contact: Name={data['name']}, Email={data['email']}, Message={data['message']}")
        with db.engine.begin() as conn:
            conn.execute(text("INSERT INTO contacts (name, email, message) VALUES (:name, :email, :msg)"), {"name": data['name'], "email": data['email'], "msg": data['message']})
        return jsonify({'success': True, 'msg': 'Message sent successfully!'})
    except Exception as e:
        print(f"Contact error: {e}")
        return jsonify({'error': 'Failed to send message'}), 500

@app.route('/api/feedback', methods=['POST'])
def feedback():
    try:
        data = request.json
        if not data or not all(k in data for k in ['name', 'feedback']):
            return jsonify({'error': 'Missing required fields'}), 400
        
        print(f"New Feedback: Name={data['name']}, Feedback={data['feedback']}")
        with db.engine.begin() as conn:
            conn.execute(text("INSERT INTO feedbacks (name, feedback) VALUES (:name, :feedback)"), {"name": data['name'], "feedback": data['feedback']})
        return jsonify({'success': True, 'msg': 'Feedback submitted successfully!'})
    except Exception as e:
        print(f"Feedback error: {e}")
        return jsonify({'error': 'Failed to submit feedback'}), 500


@app.route('/api/debug/llm', methods=['GET'])
def debug_llm():
    try:
        if client is None:
            return jsonify({'ok': False, 'error': 'GROQ_API_KEY not set or client not configured.'}), 200

        # Try to list models available to this key and pick a usable one.
        available_models = []
        try:
            models_resp = client.models.list()
            # models_resp may be an object with .data or a dict
            if hasattr(models_resp, 'data'):
                for m in models_resp.data:
                    mid = getattr(m, 'id', None) or (m.get('id') if isinstance(m, dict) else None)
                    if mid:
                        available_models.append(mid)
            elif isinstance(models_resp, dict):
                for m in models_resp.get('data', []):
                    if isinstance(m, dict):
                        available_models.append(m.get('id'))
        except Exception as e:
            print(f"Model list failed (non-fatal): {e}")

        model_to_try = None
        if available_models:
            model_to_try = available_models[0]
            print(f"Using available model: {model_to_try}")
        else:
            # Fallback candidate list (try until one works)
            candidates = ["llama-3.3-70b-versatile", "llama3.1-70b-versatile", "gpt-4o-mini", "gpt-4o"]
            for c in candidates:
                try:
                    tmp = client.chat.completions.create(model=c, messages=[{"role": "user", "content": "hi"}], max_tokens=5)
                    model_to_try = c
                    print(f"Fallback model usable: {c}")
                    break
                except Exception as ex:
                    print(f"Model {c} not usable: {ex}")

        if not model_to_try:
            return jsonify({'ok': False, 'error': 'No accessible models found for this Groq key.', 'available_models_preview': available_models[:10]}), 200

        # Make a small chat request to the chosen model
        resp = client.chat.completions.create(
            model=model_to_try,
            messages=[{"role": "user", "content": "Say hello in one short sentence."}],
            max_tokens=40,
            temperature=0.2
        )

        # Robustly extract text from response
        text = ''
        try:
            if hasattr(resp, 'choices') and resp.choices:
                choice = resp.choices[0]
                if hasattr(choice, 'message'):
                    msg = choice.message
                    text = getattr(msg, 'content', None) or (msg.get('content') if isinstance(msg, dict) else None)
                if not text:
                    text = getattr(choice, 'text', None) or (choice.get('text') if isinstance(choice, dict) else None)
            if not text:
                text = getattr(resp, 'text', None) or str(resp)
            text = text.strip() if isinstance(text, str) else str(text)
        except Exception:
            text = str(resp)

        return jsonify({'ok': True, 'model_used': model_to_try, 'model_response': text, 'available_models_preview': available_models[:10]}), 200
    except Exception as e:
        print(f"LLM debug error: {e}\n{traceback.format_exc()}")
        return jsonify({'ok': False, 'error': str(e)}), 500


@app.route('/api/debug/env', methods=['GET'])
def debug_env():
    try:
        key = os.getenv('GROQ_API_KEY')
        present = bool(key and key.strip())
        masked = None
        if present:
            k = key.strip()
            if len(k) > 10:
                masked = k[:4] + '...' + k[-4:]
            else:
                masked = '***'
        return jsonify({'GROQ_API_KEY_present': present, 'GROQ_API_KEY_masked': masked}), 200
    except Exception as e:
        print(f"Env debug error: {e}\n{traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/contacts', methods=['GET'])
@jwt_required()
def get_contacts():
    user_email = get_jwt_identity()
    if user_email not in ADMIN_EMAILS:
        return jsonify({'error': 'Access denied. Admin only.'}), 403
    with db.engine.connect() as conn:
        rows = conn.execute(text("SELECT id, name, email, message, created_at FROM contacts ORDER BY created_at DESC")).fetchall()
        contacts = [{'id': r[0], 'name': r[1], 'email': r[2], 'message': r[3], 'created_at': r[4]} for r in rows]
    return jsonify({'contacts': contacts})

@app.route('/api/admin/feedbacks', methods=['GET'])
@jwt_required()
def get_feedbacks():
    user_email = get_jwt_identity()
    if user_email not in ADMIN_EMAILS:
        return jsonify({'error': 'Access denied. Admin only.'}), 403
    with db.engine.connect() as conn:
        rows = conn.execute(text("SELECT id, name, feedback, created_at FROM feedbacks ORDER BY created_at DESC")).fetchall()
        feedbacks = [{'id': r[0], 'name': r[1], 'feedback': r[2], 'created_at': r[3]} for r in rows]
    return jsonify({'feedbacks': feedbacks})

@app.route('/api/discussion/respond', methods=['POST'])
def discussion_respond():
    try:
        data = request.json
        topic = data.get('topic', '')
        user_input = data.get('userInput', '').strip()
        conversation = data.get('conversation', [])
        bilingual = data.get('bilingual', False)

        if not topic or not user_input:
            return jsonify({'error': 'Missing topic or input'}), 400

        original_input = user_input
        if bilingual and user_input:
            user_input = translate_hinglish_to_english(user_input)

        relevance = compute_similarity(topic, user_input)


        ai_response = generate_discussion_reply(topic, user_input, conversation)

        return jsonify({
            'response': ai_response,
            'relevance': relevance,
            'suggestions': generate_suggestions(user_input),
            'translated_text': user_input if user_input != original_input else ''
        })
    except Exception as e:
        print(f"Discussion respond error: {e}")
        fallback = "Sorry, let's continue—tell me more about your view on the topic."
        return jsonify({'error': str(e), 'response': fallback}), 500

@app.errorhandler(401)
def unauthorized_error(error):
    return jsonify({
        'error': 'Unauthorized access. Please login first.',
        'status': 401
    }), 401

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal server error occurred.',
        'status': 500
    }), 500

@app.route('/api/aptitude/questions', methods=['GET'])
def get_aptitude_questions():
    try:
        questions: List[Dict] = [
            {
                "id": 1,
                "question": "What comes next in the sequence: 2, 4, 8, 16, __?",
                "options": ["24", "28", "32", "36"],
                "correct": "32",
                "type": "numerical",
                "explanation": "The pattern multiplies each number by 2"
            },
            {
                "id": 2,
                "question": "If 5 workers can build a wall in 8 days, how many days will it take 10 workers?",
                "options": ["2", "4", "6", "8"],
                "correct": "4",
                "type": "logical",
                "explanation": "Double the workers means half the time"
            },
            {
                "id": 3,
                "question": "Which word completes the analogy? Book is to Reading as Fork is to:",
                "options": ["Kitchen", "Eating", "Cooking", "Food"],
                "correct": "Eating",
                "type": "verbal",
                "explanation": "Book is used for Reading, Fork is used for Eating"
            }
        ]
        return jsonify(questions)
    except Exception as e:
        print(f"Error fetching aptitude questions: {str(e)}")
        return jsonify({"error": "Failed to fetch questions"}), 500

@app.route('/api/aptitude/submit', methods=['POST'])
@jwt_required()
def submit_aptitude_answer():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400

        question_id = data.get('questionId')
        user_answer = data.get('answer')
        
        if not question_id or user_answer is None:
            return jsonify({"error": "Missing questionId or answer"}), 400

        questions = [
            {"id": 1, "correct": "32"},
            {"id": 2, "correct": "4"},
            {"id": 3, "correct": "Eating"}
        ]
        
        question = next((q for q in questions if q["id"] == question_id), None)
        if not question:
            return jsonify({"error": "Invalid question ID"}), 400
            
        is_correct = str(user_answer) == question["correct"]
        score = 10 if is_correct else 0
        
        user_id = get_jwt_identity()
        with db.engine.begin() as conn:
            conn.execute(text("INSERT INTO user_progress (user_id, activity_type, activity_id, score) VALUES (:user_id, 'aptitude', :activity_id, :score)"), {"user_id": user_id, "activity_id": str(question_id), "score": score})
        
        response = {
            "correct": is_correct,
            "feedback": "Great job!" if is_correct else "Try again!",
            "score": score
        }
        
        return jsonify(response)
    except Exception as e:
        print(f"Error processing aptitude answer: {str(e)}")
        return jsonify({"error": "Failed to process answer"}), 500

if __name__ == '__main__':
    app.run(
        debug=(os.getenv('FLASK_DEBUG', 'False').lower() in ('1', 'true', 'yes')),
        port=int(os.getenv('PORT', 5000))
    )