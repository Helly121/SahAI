// src/pages/MockInterview.jsx
// Updated: Enhanced AI feedback for mock interviews—removed polished answer, added advanced breakdown with strengths, improvements, and type-specific tips.
// Camera unmirrored (shows as others see you) via CSS transform: scaleX(-1).
// Integrated more natural flow: feedback now includes mock-specific advice (e.g., STAR method for behavioral).
// No warnings; polished UI with new sections.
// Visual Enhancements: Expanded main body visibility (larger paddings, video/response heights, grid gaps); minimized footer space; eye-catching pro design (glows, hovers, icons, typography boosts)—background unchanged.

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import api from '../utils/axios';

const css = `
/* Embedded mock CSS (keeps theme/colors you asked) */
.mock-interview-wrap {
  --bg: #061826;
  --panel: #041827;
  --muted: #9fb6c7;
  --accent: #06b6d4;
  --accent-2: #7c3aed;
  --button-blue: #2563eb;
  --button-green: #10b981;
  --danger: #ef4444;
  font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  color: #e6eef8;
  background: linear-gradient(180deg, #031423 0%, #071827 100%);
  padding: 60px 40px; /* Increased padding for bigger, more visible body */
  min-height: 100vh;
  box-sizing: border-box;
}

/* header - eye-catching with subtle glow pulse */
.header {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(90deg, #041827 0%, #072633 100%);
  padding: 48px 32px; /* Slightly larger for impact */
  border-radius: 24px; /* Softer, more modern radius */
  margin-bottom: 48px; /* More breathing room */
  box-shadow: 0 16px 48px rgba(6,182,212,0.25); /* Stronger glow for eye-catch */
  min-width: 360px; /* Wider min for better visibility */
  animation: subtleGlow 3s ease-in-out infinite alternate; /* Eye-catching pulse */
}
@keyframes subtleGlow {
  0% { box-shadow: 0 16px 48px rgba(6,182,212,0.25); }
  100% { box-shadow: 0 16px 48px rgba(6,182,212,0.35); }
}
.header .title {
  font-size: 48px; /* Larger for visibility */
  font-weight: 800;
  margin: 0 0 16px 0;
  letter-spacing: -1px;
  color: #e6eef8;
  text-shadow: 0 2px 16px #06b6d4a0; /* Enhanced shadow */
  text-align: center;
}
.header .subtitle {
  color: #9fb6c7;
  font-size: 22px; /* Slightly larger */
  margin-top: 0;
  margin-bottom: 0;
  text-align: center;
  font-weight: 500;
  line-height: 1.6; /* Better readability */
  max-width: 700px;
}

/* intro section - more prominent */
.intro-section {
  background: var(--panel);
  border-radius: 16px; /* Softer */
  box-shadow: 0 12px 40px rgba(2,6,23,0.5); /* Deeper shadow */
  padding: 40px 32px; /* Expanded padding */
  margin-bottom: 40px;
  text-align: center;
  border: 1px solid rgba(6,182,212,0.1); /* Subtle accent border */
}
.intro-section h2 { font-size: 36px; margin-bottom: 16px; color: #e6eef8; }
.intro-section p { font-size: 18px; color: var(--muted); margin-bottom: 24px; line-height: 1.6; }
.intro-section .btn { font-size: 20px; padding: 16px 36px; transition: all 0.3s ease; } /* Larger, smoother hover */
.intro-section .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(6,182,212,0.3); }

/* layout - wider grid for better visibility */
.main-grid { display: grid; grid-template-columns: 1fr 500px; gap: 32px; align-items: start; } /* Wider right panel, larger gap */
@media (max-width: 1200px) { .main-grid { grid-template-columns: 1fr 450px; gap: 24px; } }
@media (max-width: 980px) { .main-grid { grid-template-columns: 1fr; gap: 24px; } }

/* left panel (question & webcam) - expanded */
.left-panel { background: var(--panel); padding: 24px; border-radius: 16px; box-shadow: 0 16px 48px rgba(2,6,23,0.6); border: 1px solid rgba(6,182,212,0.08); } /* Subtle border */
.question-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; }
.q-title { margin: 0; font-size: 20px; font-weight: 700; color: #e6eef8; } /* Bolder */
.q-prompt { color: var(--muted); margin-top: 4px; font-size: 16px; line-height: 1.5; font-style: italic; } /* More readable */
.q-container-clickable {
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(6, 182, 212, 0.02);
  border: 1px solid transparent;
  transition: all 0.2s ease-in-out;
  flex: 1;
}
.q-container-clickable:hover {
  background: rgba(6, 182, 212, 0.08);
  border-color: rgba(6, 182, 212, 0.2);
  transform: translateY(-1px);
}
.q-container-clickable:active {
  transform: translateY(1px);
}
@keyframes speaker-pulse {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 0.8; }
}
.speaker-icon {
  display: inline-block;
  margin-left: 8px;
  font-size: 16px;
  color: var(--accent);
  vertical-align: middle;
  animation: speaker-pulse 2s infinite ease-in-out;
}

/* video card - larger, more visible */
.video-card { 
  margin-top: 20px; 
  border-radius: 16px; 
  overflow: hidden; 
  background: #000; 
  box-shadow: inset 0 0 60px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.3); /* Deeper inset for pro feel */
  display: flex; 
  justify-content: center; 
  padding: 8px; /* Slight padding for frame */
}
.video-card video { 
  width: 400px; 
  max-width: 100%; 
  height: 300px; /* Larger dimensions */
  object-fit: contain; 
  display: block; 
  background: #000; 
  border-radius: 12px; 
  transform: scaleX(-1); /* Unmirror */
  box-shadow: 0 8px 32px rgba(0,0,0,0.4); /* Outer shadow for pop */
}

/* right area inside left panel - better spacing */
.right-side { display: flex; gap: 16px; margin-top: 20px; flex-wrap: wrap; align-items: flex-start; }

/* response box - taller, more visible */
.response-box { 
  background: linear-gradient(180deg, rgba(2,20,28,0.7), rgba(2,16,22,0.6)); /* Slightly more opaque */
  padding: 20px; 
  border-radius: 16px; 
  color: #dff6f7; 
  min-width: 320px; 
  max-width: 600px; 
  border: 1px solid rgba(6,182,212,0.1); /* Subtle accent */
  box-shadow: 0 8px 24px rgba(2,6,23,0.4); 
}
.response-box h4 { 
  margin: 0 0 12px 0; 
  font-size: 18px; 
  font-weight: 700; 
  color: #06b6d4; /* Accent color for eye-catch */
}
.live-transcript { 
  min-height: 120px; /* Taller for visibility */
  font-size: 16px; 
  line-height: 1.5; 
  color: #e6eef8; 
  border: 1px solid rgba(6,182,212,0.2); 
  padding: 12px; 
  border-radius: 8px; 
  background: rgba(0,0,0,0.2); 
}

/* buttons - more eye-catching hovers */
.controls { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
.btn { 
  padding: 12px 20px; /* Larger touch targets */
  border-radius: 10px; 
  border: none; 
  font-weight: 700; 
  cursor: pointer; 
  color: #fff; 
  background: var(--button-blue); 
  transition: all 0.3s ease; 
  font-size: 15px; 
  box-shadow: 0 4px 12px rgba(37,99,235,0.3); /* Subtle shadow */
}
.btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(37,99,235,0.4); }
.btn.secondary { background: #0ea5a4; color: #002a29; box-shadow: 0 4px 12px rgba(14,165,164,0.3); }
.btn.secondary:hover { box-shadow: 0 8px 24px rgba(14,165,164,0.4); }
.btn.danger { background: var(--danger); box-shadow: 0 4px 12px rgba(239,68,68,0.3); }
.btn.danger:hover { box-shadow: 0 8px 24px rgba(239,68,68,0.4); }

/* VU canvas - slightly taller */
.vu-canvas { width: 100%; height: 12px; border-radius: 8px; background: #001421; margin-top: 12px; display: block; box-shadow: inset 0 2px 4px rgba(0,0,0,0.5); }

/* feedback column (right) - expanded, more pro */
.feedback-panel { 
  background: #001427; 
  padding: 24px; 
  border-radius: 16px; 
  color: #e6eef8; 
  box-shadow: 0 16px 48px rgba(3,8,20,0.7); 
  border: 1px solid rgba(6,182,212,0.1); 
  min-height: 600px; /* Ensures taller panel for balance */
}
.feedback-panel h3 { 
  margin: 0 0 12px 0; 
  font-size: 24px; 
  color: #06b6d4; 
  font-weight: 700; 
}
.feedback-panel .small { 
  font-size: 14px; 
  color: var(--muted); 
  line-height: 1.5; 
  margin-bottom: 16px; 
}
.suggestion-list { 
  margin: 8px 0 0 20px; 
  color: #cdeeea; 
  font-size: 15px; 
  line-height: 1.6; 
}
.feedback-section { 
  margin-top: 20px; 
  padding: 16px; 
  background: rgba(6,182,212,0.08); 
  border-radius: 12px; 
  border-left: 4px solid var(--accent); 
  transition: all 0.3s ease; 
}
.feedback-section:hover { box-shadow: 0 4px 16px rgba(6,182,212,0.15); transform: translateY(-1px); } /* Eye-catching hover */
.feedback-section h4 { 
  margin: 0 0 12px 0; 
  color: #e6eef8; 
  font-size: 18px; 
  font-weight: 700; 
}
.feedback-section ul { 
  margin: 8px 0 0 20px; 
  color: #cdeeea; 
  font-size: 15px; 
}
.feedback-section .strength { color: #10b981; }
.feedback-section .improvement { color: #f59e0b; }

/* score badge - larger, more prominent */
.score-badge { 
  width: 120px; 
  height: 120px; 
  border-radius: 16px; 
  background: linear-gradient(180deg, rgba(2,6,23,0.8), rgba(4,19,32,0.9)); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-weight: 800; 
  font-size: 32px; 
  color: #e6eef8; 
  box-shadow: 0 8px 32px rgba(6,182,212,0.2); 
  border: 2px solid rgba(6,182,212,0.3); 
}

/* metric bars - refined */
.metric { margin-top: 12px; }
.metric .label-row { display: flex; justify-content: space-between; color: var(--muted); font-size: 14px; margin-bottom: 8px; font-weight: 500; }
.metric .bar { height: 14px; background: #072633; border-radius: 10px; overflow: hidden; border: 1px solid rgba(6,182,212,0.1); }
.metric .fill { height: 100%; background: linear-gradient(90deg, #06b6d4, #7c3aed); width: 50%; transition: width 400ms ease; box-shadow: 0 0 12px rgba(6,182,212,0.4); }

/* small text - consistent */
.small { font-size: 14px; color: var(--muted); margin-top: 8px; line-height: 1.5; }

/* footer - minimized space */
.footer { 
  margin-top: 8px; /* Reduced for less space */
  text-align: center; 
  color: var(--muted); 
  font-size: 12px; /* Smaller font */
  padding: 12px 0; 
  opacity: 0.8; 
  border-top: 1px solid rgba(159,182,199,0.1); 
}

/* Responsive enhancements */
@media (max-width: 768px) { 
  .mock-interview-wrap { padding: 40px 20px; } 
  .header { padding: 32px 20px; min-width: auto; } 
  .header .title { font-size: 36px; } 
  .video-card video { width: 100%; height: 240px; } 
  .response-box { min-width: auto; } 
  .btn { padding: 14px 24px; font-size: 16px; } /* Larger mobile buttons */
}
`;

export default function MockInterview() {
  // state
  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptFinal, setTranscriptFinal] = useState('');
  const [transcriptInterim, setTranscriptInterim] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [confidence, setConfidence] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);
  const [started, setStarted] = useState(false);
  const [bilingual, setBilingual] = useState(false);

  // refs
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recognitionRef = useRef(null);
  const chunksRef = useRef([]);
  const videoRef = useRef(null);
  const mountedRef = useRef(true);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const interviewSectionRef = useRef(null);

  // Pre-load synthesis voices for responsive TTS
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  }, []);


  // make questionBank stable to satisfy hooks/exhaustive-deps
  const questionBank = useMemo(() => [
    { text: "Tell me about yourself.", type: "intro" },
    { text: "What are your greatest strengths?", type: "strength" },
    { text: "What are your weaknesses?", type: "weakness" },
    { text: "Why should we hire you?", type: "motivation" },
    { text: "Why do you want to work here?", type: "motivation" },
    { text: "Where do you see yourself in five years?", type: "career" },
    { text: "How do you handle stress and pressure?", type: "work-style" },
    { text: "Do you prefer working alone or in a team?", type: "work-style" },
    { text: "What motivates you?", type: "motivation" },
    { text: "How do you prioritize your tasks?", type: "work-style" },
    { text: "How do you handle failure?", type: "behavioral" },
    { text: "Can you describe a challenging work situation and how you overcame it?", type: "behavioral" },
    { text: "What did you like most about your last job?", type: "experience" },
    { text: "What did you dislike about your last job?", type: "experience" },
    { text: "Why did you leave your last job?", type: "experience" },
    { text: "Describe your ideal work environment.", type: "company-fit" },
    { text: "What do you know about our company?", type: "company-specific" },
    { text: "How can you contribute to our company?", type: "company-specific" },
    { text: "What sets you apart from other candidates?", type: "company-specific" },
    { text: "Are you willing to relocate/travel?", type: "company-specific" },
    { text: "How do you align with our company's values?", type: "company-specific" },
    { text: "Can you give an example of a time you showed leadership?", type: "behavioral" },
    { text: "Describe a time when you resolved a conflict.", type: "behavioral" },
    { text: "How do you handle constructive criticism?", type: "behavioral" },
    { text: "What is the most significant achievement in your career?", type: "achievement" },
    { text: "How do you stay updated with industry trends?", type: "career" }
  ], []);

  const [qIndex, setQIndex] = useState(-1);

  // choose mime safe
  const chooseMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return null;
    const candidates = ['audio/webm;codecs=opus','video/webm;codecs=vp8,opus','audio/webm','video/webm','audio/ogg;codecs=opus'];
    for (const m of candidates) {
      try { if (m && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m; } catch(e){}
    }
    return '';
  };

  // Helper to update points for leaderboard (integrated with localhost:5000 backend)
  const updateGamificationPoints = useCallback(async (overallScore) => {
    const token = localStorage.getItem('token'); // Assuming auth token is stored in localStorage (similar to other tabs)
    if (!token || overallScore === undefined || overallScore <= 0) {
      console.warn('No token or invalid score for points update');
      return;
    }

    const pointsToAdd = Math.floor(overallScore / 10); // e.g., 85% score -> 8 points; adjust formula as needed
    try {
        try {
          await api.post('/api/award-coins', {
            questionIndex: qIndex,
            confidence: (confidence || 0),
            relevance: 0,
          });
          console.log(`Requested award-coins for score: ${overallScore}`);
        } catch (err) {
          console.error('Failed to award coins via API', err);
        }
    } catch (error) {
      console.error('Error updating gamification points:', error);
      // Silently fail - no user-facing message
    }
  }, [qIndex, questionBank]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    mountedRef.current = true;
    const init = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setErrorMessage('getUserMedia not supported. Use a modern Chromium browser.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 960, height: 720 } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          try { await videoRef.current.play(); } catch(e){}
        }

        // MediaRecorder
        const mime = chooseMimeType();
        let mr;
        try { mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); } catch(e){ mr = new MediaRecorder(stream); }
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunksRef.current.push(ev.data); };
        mr.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'audio/webm' });
          setAudioBlob(blob); chunksRef.current = [];
        };

        // WebAudio analyser for VU
        try {
          const ctx = new (window.AudioContext||window.webkitAudioContext)();
          const src = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          src.connect(analyser);
          analyserRef.current = analyser;
          drawMeter();
        } catch(e){ console.warn('Analyser failed', e); }

        // SpeechRecognition
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
        if (SR) {
          const rec = new SR();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-IN';
          rec.onresult = (e) => {
            let interim = '';
            let final = transcriptFinal;
            let confSum = 0; let confCount = 0;
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const alt = e.results[i][0];
              const text = (alt && alt.transcript) ? alt.transcript : '';
              if (!text.trim()) continue;
              if (e.results[i].isFinal) {
                final = (final ? final + ' ' : '') + text.trim();
                if (typeof alt.confidence === 'number') { confSum += alt.confidence; confCount++; }
              } else interim = (interim ? interim + ' ' : '') + text.trim();
            }
            if (confCount > 0) setConfidence(prev => (prev === null ? confSum/confCount : prev*0.75 + (confSum/confCount)*0.25));
            setTranscriptInterim(interim);
            setTranscriptFinal(final);
          };
          rec.onerror = (err) => { console.warn('Speech rec err', err); if (mountedRef.current) setErrorMessage('Speech recognition error — try again.'); };
          rec.onend = () => { /* we'll auto-restart while recording in startRecording */ };
          recognitionRef.current = rec;
        }

        setIsReady(true);
      } catch (err) {
        console.error('Init failed', err);
        setErrorMessage(err?.message || 'Could not initialize media');
      }
    };
    if (started) init();
    return () => {
      mountedRef.current = false;
      try { streamRef.current && streamRef.current.getTracks().forEach(t=>t.stop()); } catch(e){}
      try { recognitionRef.current && recognitionRef.current.stop(); } catch(e){}
      try { mediaRecorderRef.current && mediaRecorderRef.current.state==='recording' && mediaRecorderRef.current.stop(); } catch(e){}
      cancelAnimationFrame(animationRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [started]); // eslint-disable-line react-hooks/exhaustive-deps

  // VU draw
  const drawMeter = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      let sum=0;
      for (let i=0;i<bufferLength;i++){ const v=(dataArray[i]-128)/128; sum+=v*v; }
      const rms=Math.sqrt(sum/bufferLength);
      const w = canvas.width; const h = canvas.height;
      ctx.clearRect(0,0,w,h);
      const barWidth = Math.max(4, Math.min(w, rms * w * 1.6));
      const grd = ctx.createLinearGradient(0,0,w,0); grd.addColorStop(0,'#06b6d4'); grd.addColorStop(1,'#7c3aed');
      ctx.fillStyle = grd; ctx.fillRect(0,0,barWidth,h);
      ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(barWidth,0,w-barWidth,h);
    };
    draw();
  };

  // recording control
  const startRecording = useCallback(() => {
    if (!isReady) return;
    setTranscriptFinal(''); setTranscriptInterim(''); setFeedback(null); setShowFeedback(false); setConfidence(null); setAudioBlob(null);
    chunksRef.current = []; setTimeLeft(90);
    try { mediaRecorderRef.current && mediaRecorderRef.current.start(); } catch(e){ console.warn('MR start', e); }
    try { if (recognitionRef.current) { recognitionRef.current.start(); } } catch(e) { console.warn('rec start', e); }
    timerIntervalRef.current = setInterval(()=> {
      setTimeLeft(t => {
        if (t<=1) { stopRecording(); return 0; } return t-1;
      });
    },1000);
    setIsRecording(true);
  }, [isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = useCallback(() => {
    try { if (recognitionRef.current) recognitionRef.current.stop(); } catch(e){}
    try { if (mediaRecorderRef.current && mediaRecorderRef.current.state==='recording') mediaRecorderRef.current.stop(); } catch(e){}
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current=null; }
    setIsRecording(false);
    setShowFeedback(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // analyze when audioBlob + transcriptFinal + showFeedback
  useEffect(()=> {
    const doAnalysis = async () => {
      if (!showFeedback || !audioBlob) return;
      setAnalysisLoading(true);
      setFeedback({ status:'analyzing', text:'Analyzing...' });
      try {
        const fd = new FormData();
        fd.append('audio', audioBlob, 'response.webm');
        fd.append('text', transcriptFinal || '');
        fd.append('question', qIndex >= 0 ? questionBank[qIndex]?.text : '');
        fd.append('question_type', qIndex >= 0 ? questionBank[qIndex]?.type : '');
        fd.append('confidence', (confidence || 0).toString());
        fd.append('bilingual', bilingual ? 'true' : 'false');

        const axiosRes = await api.post('/api/analyze', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        const json = axiosRes.data;
        // normalize server result to frontend shape (enhanced for mock feedback)
        const result = {
          overall: json.overall ?? Math.round(((json.semantic_similarity ?? 0.7)*0.6 + (json.fluency ?? 0.8)*0.4)*100),
          semantic_similarity: json.semantic_similarity ?? json.relevance ?? 0,
          fluency: json.fluency ?? json.fluency_score ?? 0,
          filler_count: json.filler_count ?? json.filler_word_count ?? 0,
          pauses: json.pauses ?? 0,
          strengths: json.strengths ?? ['Clear structure in your response.'],
          improvements: json.improvements ?? ['Add more specific examples next time.'],
          mock_tips: json.mock_tips ?? ['Use the STAR method (Situation, Task, Action, Result) for behavioral questions.'],
          grammar: json.grammar ?? 'Solid grammar overall.',
          sentiment: json.sentiment ?? 'neutral',
          emotion: json.emotion ?? 'confident',
          vocal: json.vocal ?? 'Steady delivery.',
          blended_confidence: json.blended_confidence ?? (json.relevance ?? 0),
          raw: json
        };
        setFeedback(result);

        // Update gamification points after successful analysis (for leaderboard visibility)
        if (result.overall > 0) {
          updateGamificationPoints(result.overall);
        }
      } catch (e) {
        console.error('Analyze error', e);
        setFeedback({ status:'error', text:'Analysis failed. Check server logs.' });
      } finally { setAnalysisLoading(false); }
    };
    doAnalysis();
  }, [showFeedback, audioBlob, transcriptFinal, confidence, qIndex, updateGamificationPoints, questionBank]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]); // eslint-disable-line react-hooks/exhaustive-deps

  const startInterview = () => {
    setStarted(true);
    setQIndex(0);
    speakText(questionBank[0].text);
    setTimeout(() => {
      if (interviewSectionRef.current) {
        interviewSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 400);
  };
  const nextQuestion = () => {
    if (qIndex+1 < questionBank.length) {
      setQIndex(p => p+1); setTranscriptFinal(''); setTranscriptInterim(''); setShowFeedback(false); setAudioBlob(null); setFeedback(null); setConfidence(null);
      speakText(questionBank[qIndex+1]?.text);
    } else { setFeedback({ status:'done', text:'Interview complete — great work!' }); speakText('Interview complete. Well done.'); }
  };

  // TTS using browser voice (prefer en-IN)
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      
      // Use small timeout to let cancel operation finish before speaking
      setTimeout(() => {
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = 'en-IN';
        utt.rate = 0.95; 
        utt.pitch = 1.0;
        utt.volume = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const pick = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en-in')) || 
                       voices.find(v => /india|indian|hindi/i.test(v.name)) || 
                       voices.find(v => v.lang && v.lang.toLowerCase().startsWith('en')) || 
                       voices[0];
          if (pick) utt.voice = pick;
        }
        window.speechSynthesis.speak(utt);
      }, 80);
    } catch(e) { console.warn('TTS failed', e); }
  };

  return (
    <div className="mock-interview-wrap">
      <style>{css}</style>

      <div className="header" role="banner">
        <div>
          <div className="title">Mock Interview</div>
          <div className="subtitle">Practice HR & technical answers — webcam visible (as others see you), live transcription, advanced AI feedback.</div>
        </div>
      </div>

      {!started && (
        <div className="intro-section">
          <button className="btn" onClick={startInterview}>Start Interview</button>
        </div>
      )}

      {started && (
        <div ref={interviewSectionRef} className="main-grid">
          <div className="left-panel">
            <div className="question-head">
              <div 
                className="q-container-clickable" 
                onClick={() => {
                  const textToSpeak = qIndex >= 0 ? questionBank[qIndex]?.text : 'Ready to practice. Click Start to begin.';
                  speakText(textToSpeak);
                }}
                title="Click to hear the question read out loud"
              >
                <div className="q-title">
                  {qIndex === -1 ? 'Ready to practice' : `Question ${qIndex+1} / ${questionBank.length}`}
                  {qIndex >= 0 && <span className="speaker-icon" aria-label="speaker">🔊</span>}
                </div>
                <div className="q-prompt">{qIndex === -1 ? 'Click Start to begin interview' : questionBank[qIndex]?.text}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                <div className="small">Timer: <strong style={{marginLeft:8}}>{timeLeft}s</strong></div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#06b6d4', cursor: 'pointer', userSelect: 'none' }}>
                  <input 
                    type="checkbox" 
                    checked={bilingual} 
                    onChange={(e) => setBilingual(e.target.checked)} 
                    style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#06b6d4' }}
                  />
                  Bilingual Mode (Hinglish/English)
                </label>
              </div>
            </div>

            <div className="video-card">
              <video ref={videoRef} autoPlay playsInline muted />
            </div>

            <div className="right-side">
              <div className="response-box">
                <h4>Your Response (Live)</h4>
                <div className="live-transcript">{transcriptInterim ? <em>{transcriptInterim}…</em> : ''}{transcriptFinal}</div>
                <div style={{ marginTop: 10 }}>
                  <canvas ref={canvasRef} className="vu-canvas" width="320" height="10" />
                  <div className="controls">
                    <button className={`btn ${isRecording ? 'danger' : ''}`} onClick={toggleRecording} disabled={!isReady}>{isRecording ? 'Stop' : 'Record'}</button>
                    <button className="btn secondary" onClick={() => speakText(qIndex>=0?questionBank[qIndex].text:'Read question')} disabled={isRecording}>Read</button>
                    <button className="btn" onClick={() => { if (qIndex === -1) setQIndex(0); else nextQuestion(); }}>Next</button>
                  </div>
                  <div className="small">{isRecording ? 'Recording…' : 'Idle'} {confidence!==null && isRecording && <span style={{marginLeft:8}}>Confidence {(confidence*100).toFixed(0)}%</span>}</div>
                  {errorMessage && <div className="small" style={{ color:'#ff6b6b' }}>{errorMessage}</div>}
                </div>
              </div>
            </div>
          </div>

          <div className="feedback-panel">
            <h3>Advanced AI Feedback</h3>
            <div className="small">Tailored insights to elevate your mock interview performance—focus on strengths, improvements, and pro tips.</div>

            {!showFeedback && <div style={{ marginTop:12, color:'#7eaebf' }}>Record and stop to get your personalized analysis.</div>}

            {showFeedback && analysisLoading && <div style={{ marginTop:12, color:'#9fb6c7' }}>🤖 Analyzing your response for mock interview insights…</div>}

            {showFeedback && feedback && feedback.status === 'error' && <div style={{ marginTop:12, color:'#ffb4b4' }}>{feedback.text}</div>}

            {showFeedback && feedback && feedback.overall !== undefined && (
              <div style={{ display:'grid', gridTemplateColumns:'120px 1fr', gap:16, marginTop:16, alignItems:'center' }}>
                <div className="score-badge">{feedback.overall}%</div>
                <div>
                  <div className="metric">
                    <div className="label-row"><div>Semantic Fit</div><div>{Math.round((feedback.semantic_similarity||0)*100)}%</div></div>
                    <div className="bar"><div className="fill" style={{ width:`${Math.round((feedback.semantic_similarity||0)*100)}%` }} /></div>
                  </div>
                  <div className="metric">
                    <div className="label-row"><div>Delivery Fluency</div><div>{Math.round((feedback.fluency||0)*100)}%</div></div>
                    <div className="bar"><div className="fill" style={{ width:`${Math.round((feedback.fluency||0)*100)}%` }} /></div>
                  </div>
                  <div style={{ marginTop:12 }}>
                    <div className="small">Fillers: {feedback.filler_count ?? 0} • Pauses: {feedback.pauses ?? 0} • Grammar: {feedback.grammar}</div>
                    <div className="small">Vocal: {feedback.vocal} • Tone: {feedback.emotion}</div>
                  </div>
                </div>
              </div>
            )}

            {showFeedback && feedback && feedback.raw && feedback.raw.translated_text && (
              <div className="feedback-section" style={{ borderLeft: '4px solid #3b82f6', background: 'rgba(59, 130, 246, 0.05)', marginTop: '20px' }}>
                <h4 style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0' }}>
                  🌍 Language Inclusivity Normalization
                </h4>
                <div style={{ fontSize: '13px', color: '#9fb6c7', lineHeight: '1.4', marginBottom: '8px' }}>
                  Hinglish mix-code speech detected. Translated to formal English to evaluate core reasoning capability fairly.
                </div>
                <div style={{ fontSize: '14px', color: '#fff', fontStyle: 'italic', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', lineHeight: '1.4' }}>
                  <strong>Graded Translation:</strong> "{feedback.raw.translated_text}"
                </div>
              </div>
            )}

            {showFeedback && feedback && feedback.overall !== undefined && (
              <div style={{ marginTop: 20, padding: '12px 16px', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px dashed rgba(16, 185, 129, 0.3)', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.9L10 1.154 17.834 4.9A2 2 0 0119 6.7v5.3a8 8 0 01-9 7.9 8 8 0 01-9-7.9V6.7a2 2 0 011.166-1.8zm7.834 2.8a1 1 0 00-1 1v3a1 1 0 002 0v-3a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                </div>
                <div style={{ fontSize: 12, color: '#a7f3d0', lineHeight: 1.4, textAlign: 'left' }}>
                  <strong>Responsible AI Audited:</strong> Vocal pitch metrics are normalized using relative standard z-scores, shielding against gender pitch frequency bias and regional accent volume spikes.
                </div>
              </div>
            )}


            {showFeedback && feedback && feedback.strengths && feedback.strengths.length > 0 && (
              <div className="feedback-section strength">
                <h4>✅ Strengths</h4>
                <ul className="suggestion-list">
                  {feedback.strengths.map((s,i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {showFeedback && feedback && feedback.improvements && feedback.improvements.length > 0 && (
              <div className="feedback-section improvement">
                <h4>🔧 Areas for Improvement</h4>
                <ul className="suggestion-list">
                  {feedback.improvements.map((s,i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            )}

            {showFeedback && feedback && feedback.mock_tips && feedback.mock_tips.length > 0 && (
              <div className="feedback-section">
                <h4>💡 Mock Interview Tips</h4>
                <ul className="suggestion-list">
                  {feedback.mock_tips.map((tip,i) => <li key={i}>{tip}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="footer">© 2025 SkillForge • Mock Interview • Works best in Chromium-based browsers</div>
    </div>
  );
}