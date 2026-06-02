# File: ai/speech/speech_analysis.py
"""Lightweight, lazy-loaded audio analysis helpers.

This module purposefully avoids importing heavy libraries at import time.
`analyze_vocal_enhanced` will attempt to import `librosa`/`numpy` only when
called and fall back to a minimal, low-memory analysis when those
dependencies are not available.
"""
import os
import contextlib


def analyze_vocal_enhanced(audio_path, text=""):
	"""Analyze an audio file and return a lightweight summary.

	Returns a dict with keys:
	  - fluency (0.0-1.0)
	  - pauses (int)
	  - vocal (str summary)
	  - wpm (float)
	  - energy_variation (float)
	  - tempo_fluctuation (float)
	  - jitter (float)
	  - emotion (str)

	The function will try to import `librosa` and `numpy`. If unavailable,
	it returns a safe fallback and computes `wpm` if duration can be read
	from the file header.
	"""
	# Basic guards
	if not audio_path or not os.path.exists(audio_path):
		return {
			"fluency": 0.6,
			"pauses": 0,
			"vocal": "No audio—please provide a recording.",
			"wpm": 0,
			"energy_variation": 0.0,
			"tempo_fluctuation": 0.0,
			"jitter": 0.0,
			"emotion": "neutral",
		}

	# Try lazy imports (may raise if not installed)
	try:
		import numpy as np
		import librosa
	except Exception:
		# Fallback: try to read duration with wave module (small footprint)
		duration = 0.0
		try:
			import wave
			with contextlib.closing(wave.open(audio_path, "r")) as wf:
				frames = wf.getnframes()
				rate = wf.getframerate()
				duration = frames / float(rate) if rate else 0.0
		except Exception:
			duration = 0.0

		word_count = len(text.split()) if text else 0
		wpm = (word_count / duration * 60) if duration > 0 and word_count > 0 else 0

		return {
			"fluency": 0.6,
			"pauses": 0,
			"vocal": "Audio libraries not present on this instance.",
			"wpm": round(wpm, 1),
			"energy_variation": 0.0,
			"tempo_fluctuation": 0.0,
			"jitter": 0.0,
			"emotion": "neutral",
		}

	# If we reach here, librosa and numpy are available — run a compact analysis
	try:
		y, sr = librosa.load(audio_path, sr=22050, mono=True)
		duration = len(y) / sr if sr else 0.0

		# WPM
		word_count = len(text.split()) if text else 0
		wpm = (word_count / duration * 60) if duration > 0 and word_count > 0 else 0.0

		# Energy variation (RMS)
		try:
			rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
			energy_var = float(np.var(rms)) if rms.size else 0.0
		except Exception:
			energy_var = 0.0

		# Tempo + fluctuation
		try:
			tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
			if len(beats) > 1:
				ibis = np.diff(librosa.frames_to_time(beats, sr=sr))
				tempo_fluct = float(np.std(ibis) / np.mean(ibis)) if np.mean(ibis) > 0 else 0.0
			else:
				tempo_fluct = 0.0
		except Exception:
			tempo_fluct = 0.0

		# Jitter estimate (coarse) via piptrack
		try:
			pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
			mag_median = np.median(magnitudes)
			voiced = magnitudes > mag_median
			pitch_vals = pitches[voiced]
			if pitch_vals.size > 1:
				pitch_diff = np.abs(np.diff(pitch_vals))
				jitter = float(np.mean(pitch_diff) / (np.mean(pitch_vals) + 1e-8))
			else:
				jitter = 0.0
		except Exception:
			jitter = 0.0

		# Pauses: count low-energy regions
		try:
			silence_thresh = 0.02
			rms_frames = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
			silence_idx = np.where(rms_frames < silence_thresh)[0]
			pauses = 0
			if silence_idx.size > 0:
				diff = np.diff(silence_idx)
				min_pause_frames = int((0.5 * sr) / 512)
				pause_starts = np.where(diff > min_pause_frames)[0]
				pauses = int(len(pause_starts) + 1)
		except Exception:
			pauses = 0

		# Simple fluency heuristic
		try:
			pace_score = 0.7
			if 'tempo' in locals() and tempo and tempo > 0:
				pace_score = max(0.0, min(1.0, (tempo - 80) / 80))
		except Exception:
			pace_score = 0.7

		fluency = max(
			0.0,
			min(
				1.0,
				(
					pace_score * 0.4
					+ (1 - min(1, pauses / max(1, duration / 4))) * 0.3
					+ (1 - min(1, tempo_fluct)) * 0.15
					+ (1 - min(1, jitter)) * 0.15
				)
			),
		)

		vocal_summary = f"Duration: {duration:.1f}s | Tempo: {tempo if 'tempo' in locals() else 'N/A'} | Emotion: neutral"

		return {
			"fluency": round(fluency, 2),
			"pauses": int(pauses),
			"vocal": vocal_summary,
			"wpm": round(wpm, 1),
			"energy_variation": round(energy_var, 3),
			"tempo_fluctuation": round(tempo_fluct, 3),
			"jitter": round(jitter, 3),
			"emotion": "neutral",
		}

	except Exception as e:
		return {
			"fluency": 0.6,
			"pauses": 0,
			"vocal": f"Audio analysis failed: {str(e)}",
			"wpm": 0.0,
			"energy_variation": 0.0,
			"tempo_fluctuation": 0.0,
			"jitter": 0.0,
			"emotion": "neutral",
		}
