// src/pages/SoftSkills.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/axios';

const SoftSkills = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [bilingual, setBilingual] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [questions, setQuestions] = useState({ grammar: [], leadership: [], teamwork: [] });
  const [topics, setTopics] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState({ id: 0, q: null });
  const [totalScore, setTotalScore] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  const [quizProgress, setQuizProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalizedWords, setFinalizedWords] = useState([]);
  const [accumulatedTranscript, setAccumulatedTranscript] = useState('');
  const [liveConfidence, setLiveConfidence] = useState(0);

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);
  const isMountedRef = useRef(true);

  // Get real logged-in user token
  const getAuthToken = () => localStorage.getItem('token') || null;

  // Helper to get headers with token
  const getAuthHeaders = () => {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const speak = useCallback((text) => {
    if (!synthRef.current || !isMountedRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.lang = 'en-US';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const handleUserSpeech = useCallback(async (transcript) => {
    if (!selectedTopic || !transcript.trim() || !isMountedRef.current) return;

    const userMessage = { role: 'user', text: transcript.trim(), timestamp: new Date() };
    setConversation(prev => [...prev, userMessage]);
    setIsUserTurn(false);
    setIsGenerating(true);
    stopSpeaking();

    try {
      const response = await api.post('/api/discussion/respond', {
        topic: selectedTopic,
        userInput: transcript.trim(),
        conversation: [...conversation, userMessage],
        bilingual: bilingual
      });
      const aiResponse = response.data.response || `Interesting point on ${selectedTopic}. What are your thoughts on the solutions?`;
      const transText = response.data.translated_text;

      if (isMountedRef.current) {
        if (transText) {
          userMessage.translatedText = transText;
        }
        setConversation(prev => [...prev, { role: 'ai', text: aiResponse, timestamp: new Date() }]);
        speak(aiResponse);
      }
    } catch (error) {
      console.error('AI response error:', error);
      const fallback = `Thank you for sharing. Building on that, in ${selectedTopic}, we should consider sustainable practices. Your turn!`;
      if (isMountedRef.current) {
        setConversation(prev => [...prev, { role: 'ai', text: fallback, timestamp: new Date() }]);
        speak(fallback);
      }
    } finally {
      if (isMountedRef.current) {
        setIsGenerating(false);
        setIsUserTurn(true);
      }
    }
  }, [selectedTopic, conversation, speak, stopSpeaking]);

  const initQuiz = useCallback((type) => {
    const qList = (questions[type] || []).map(q => ({
      ...q,
      options: shuffleArray(q.options),
      correct: q.correct || q.options[q.correctIndex]
    }));

    if (qList.length > 0) {
      setCurrentQuestion({ id: 0, q: qList[0] });
      setUserAnswers({});
      setTotalScore(0);
      setCurrentScore(0);
      setQuizProgress(0);
      setShowResults(false);
      setAnswer('');
      setFeedback('');
    }
  }, [questions]);

  useEffect(() => {
    isMountedRef.current = true;

    const loadData = async () => {
      try {
        const response = await fetch('/data/soft_skills.json');
        const data = await response.json();
        setQuestions(data.questions);
        setTopics(data.discussionTopics);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    loadData();

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event) => {
        let interim = '';
        let final = '';
        let confSum = 0;
        let confCount = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i][0];
          confSum += result.confidence;
          confCount++;

          if (event.results[i].isFinal) {
            final += result.transcript + ' ';
            const words = result.transcript.split(' ').map(w => ({ text: w, confidence: result.confidence }));
            setFinalizedWords(prev => [...prev, ...words].slice(-200));
          } else {
            interim += result.transcript;
          }
        }

        setLiveTranscript(interim);
        if (final) setAccumulatedTranscript(prev => prev + final);
        setLiveConfidence(confCount > 0 ? confSum / confCount : 0);
      };

      rec.onerror = () => {
        if (isMountedRef.current) {
          setIsListening(false);
          setLiveTranscript('');
          setLiveConfidence(0);
        }
      };

      rec.onend = () => {
        if (isMountedRef.current && isListening) {
          rec.start();
        } else if (isMountedRef.current) {
          setLiveTranscript('');
          setLiveConfidence(0);
        }
      };

      recognitionRef.current = rec;
    }

    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      isMountedRef.current = false;
      recognitionRef.current?.stop();
      synthRef.current?.cancel();
    };
  }, []);

  useEffect(() => {
    if (activeTab <= 2) {
      const types = ['grammar', 'leadership', 'teamwork'];
      initQuiz(types[activeTab]);
    }
  }, [activeTab, initQuiz]);

  const handleQuizAnswer = async (selectedOption) => {
    const type = ['grammar', 'leadership', 'teamwork'][activeTab];
    const correctAnswer = currentQuestion.q.correct;
    const isCorrect = selectedOption === correctAnswer;
    const newScore = isCorrect ? 1 : 0;

    setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: { answer: selectedOption, correct: isCorrect } }));
    setFeedback(isCorrect ? 'Correct! Well done.' : `Incorrect. The right answer is: ${correctAnswer}`);
    setCurrentScore(prev => prev + newScore);

    const qList = questions[type] || [];
    if (currentQuestion.id < qList.length - 1) {
      setCurrentQuestion({ id: currentQuestion.id + 1, q: qList[currentQuestion.id + 1] });
      setQuizProgress(((currentQuestion.id + 1) / qList.length) * 100);
    } else {
      const finalScore = currentScore + newScore;
      setTotalScore(finalScore);
      setShowResults(true);
      setQuizProgress(100);

      const token = getAuthToken();
      if (token) {
        try {
          await api.post('/api/progress/complete', {
              activityType: 'soft_skill',
              activityId: `${type}_quiz`,
              score: Math.round((finalScore / qList.length) * 100)
            });
          console.log('Soft skill progress saved');
        } catch (err) {
          console.error('Failed to save:', err);
        }
      }
    }
    setAnswer('');
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition not supported.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      const fullTranscript = (accumulatedTranscript + ' ' + liveTranscript).trim();
      if (fullTranscript) handleUserSpeech(fullTranscript);

      setAccumulatedTranscript('');
      setLiveTranscript('');
      setFinalizedWords([]);
      setLiveConfidence(0);
    } else {
      setIsListening(true);
      setAccumulatedTranscript('');
      setLiveTranscript('');
      setFinalizedWords([]);
      setLiveConfidence(0);
      recognitionRef.current.start();
    }
  };

  const startDiscussion = () => {
    if (!selectedTopic) return;
    stopSpeaking();
    const intro = `Welcome to our discussion on ${selectedTopic}. I'll start: What do you think is the biggest challenge facing ${selectedTopic.toLowerCase()} today? Your turn to speak naturally—I'll listen until you're done.`;
    setConversation([{ role: 'ai', text: intro, timestamp: new Date() }]);
    speak(intro);
    setIsUserTurn(true);
  };

  const handleTabChange = (idx) => {
    stopSpeaking();
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    setConversation([]);
    setSelectedTopic('');
    setLiveTranscript('');
    setAccumulatedTranscript('');
    setFinalizedWords([]);
    setAnswer('');
    setFeedback('');
    setIsGenerating(false);
    setIsUserTurn(true);
    setActiveTab(idx);
  };

  const renderQuizContent = (type) => {
    const qList = questions[type] || [];
    if (showResults) {
      return (
        <div className="skill-content">
          <h4>Quiz Complete!</h4>
          <p>Your score: {totalScore} / {qList.length} ({Math.round((totalScore / qList.length) * 100)}%)</p>
          <button className="submit-btn" onClick={() => initQuiz(type)}>Start New Quiz</button>
        </div>
      );
    }
    if (!currentQuestion.q) return <p>Loading questions...</p>;

    return (
      <div className="skill-content">
        <h4>{type.charAt(0).toUpperCase() + type.slice(1)} Quiz</h4>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${quizProgress}%` }}></div>
        </div>
        <div className="question-card">
          <p className="question-text"><strong>Q{currentQuestion.id + 1}:</strong> {currentQuestion.q.question}</p>
          <div className="options-grid">
            {currentQuestion.q.options.map((opt, idx) => (
              <button
                key={idx}
                className={`option-btn ${answer === opt ? 'selected' : ''}`}
                onClick={() => setAnswer(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          <button className="submit-btn" onClick={() => handleQuizAnswer(answer)} disabled={!answer}>
            Submit Answer
          </button>
          {feedback && (
            <motion.p
              className={`feedback ${feedback.includes('Correct') ? 'success' : 'warning'}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              {feedback}
            </motion.p>
          )}
        </div>
      </div>
    );
  };

  const renderGroupDiscussionContent = () => (
    <div className="skill-content">
      <h4>Group Discussions</h4>
      <p>Engage in advanced, voice-based discussions. Speak freely—I'll transcribe live and respond thoughtfully to your full thoughts once you stop.</p>

      {!selectedTopic ? (
        <div className="question-card">
          <p className="question-text"><strong>Select a Topic:</strong></p>
          <select value={selectedTopic} onChange={(e) => setSelectedTopic(e.target.value)} className="mcq-select">
            <option value="">Choose a discussion topic</option>
            {topics.map((topic, idx) => (
              <option key={idx} value={topic}>{topic}</option>
            ))}
          </select>
          <button className="submit-btn" onClick={startDiscussion} disabled={!selectedTopic}>Start Discussion</button>
        </div>
      ) : (
        <div className="question-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <p className="question-text" style={{ margin: 0 }}><strong>Topic:</strong> {selectedTopic}</p>
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
          
          <div className="conversation-log" style={{ background: '#0b1622', border: '1px solid #1a2f44', borderRadius: '12px' }}>
            {conversation.map((msg, idx) => (
              <div key={idx} className={`msg ${msg.role}`} style={{ padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
                <strong>{msg.role === 'user' ? 'You' : 'AI'}:</strong> {msg.text}
                {msg.role === 'user' && msg.translatedText && (
                  <div style={{ fontSize: '0.85em', color: '#60a5fa', fontStyle: 'italic', marginTop: '6px', borderTop: '1px dashed rgba(96, 165, 250, 0.3)', paddingTop: '4px', textAlign: 'right' }}>
                    🌍 Translated: "{msg.translatedText}"
                  </div>
                )}
              </div>
            ))}
          </div>

          {isUserTurn && (
            <div>
              <button
                className="submit-btn"
                onClick={toggleListening}
                disabled={isSpeaking || isGenerating}
              >
                {isListening ? 'Stop & Send Full Speech' : 'Start Speaking (Live Transcription)'}
              </button>

              {isListening && (
                <div className="live-transcription">
                  <p className="live-indicator" aria-live="polite">Listening live... Speak naturally!</p>
                  <div className="confidence-bar">
                    <div className="confidence-fill" style={{ width: `${liveConfidence * 100}%` }}></div>
                    <span>Confidence: {Math.round(liveConfidence * 100)}%</span>
                  </div>
                  {liveTranscript && (
                    <motion.p className="live-text" initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} transition={{ repeat: Infinity, duration: 1 }} aria-live="polite">
                      Preview: {liveTranscript}
                    </motion.p>
                  )}
                  <div className="finalized-display" aria-live="polite">
                    <strong>Finalized so far:</strong>
                    <div className="words-container">
                      {finalizedWords.map((wordObj, idx) => (
                        <motion.span
                          key={idx}
                          className="finalized-word"
                          style={{ color: `hsl(${wordObj.confidence * 120}, 70%, 50%)` }}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                        >
                          {wordObj.text}&nbsp;
                        </motion.span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {!isListening && !isGenerating && (
                <div>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Or type your full response for a quick send..."
                    className="response-textarea"
                  />
                  <button className="submit-btn" onClick={() => handleUserSpeech(answer)} disabled={!answer.trim()}>
                    Send Typed Response
                  </button>
                </div>
              )}

              {isGenerating && <p className="generating-indicator">AI is processing your full thoughts</p>}
              {isSpeaking && <p>AI is speaking...</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const tabs = [
    { label: "Grammar Practice", icon: "🖊️", content: renderQuizContent('grammar') },
    { label: "Leadership Scenarios", icon: "👑", content: renderQuizContent('leadership') },
    { label: "Team Building", icon: "🤝🏻", content: renderQuizContent('teamwork') },
    { label: "Group Discussions", icon: "🗣️", content: renderGroupDiscussionContent() },
  ];

  return (
    <motion.section
      className="section softskills-section"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, staggerChildren: 0.2 } },
      }}
    >
      <motion.div className="section-header" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
        <h2 className="softskills-title">Soft Skills Mastery</h2>
        <p className="softskills-desc">
          Elevate your professional edge through interactive, AI-powered modules. From eloquent communication to resilient leadership, build competencies that shine in any arena.
          <br />
          <span className="softskills-highlight">Advanced real-time voice analysis and natural conversation flow.</span>
        </p>
      </motion.div>

      <div className="softskills-tabs">
        {tabs.map((tab, idx) => (
          <motion.button
            key={tab.label}
            className={`softskills-tab-btn ${activeTab === idx ? "active" : ""}`}
            onClick={() => handleTabChange(idx)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </motion.button>
        ))}
      </div>

      <div className="softskills-tab-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="softskills-card"
          >
            {tabs[activeTab].content}
          </motion.div>
        </AnimatePresence>
      </div>

      <style jsx>{`
        .section { padding: 4rem 2rem; max-width: 1200px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 3rem; }
        .softskills-title { font-size: 2.5rem; font-weight: 700; color: #1a1a1a; margin-bottom: 1rem; }
        .softskills-desc { font-size: 1.1rem; line-height: 1.6; color: #666; }
        .softskills-highlight { color: #007bff; font-weight: 600; }
        .softskills-tabs { display: flex; justify-content: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; }
        .softskills-tab-btn { 
          display: flex; align-items: center; gap: 0.5rem; 
          padding: 0.75rem 1.5rem; border: 2px solid #e0e0e0; 
          background: white; border-radius: 50px; cursor: pointer; 
          font-weight: 500; transition: all 0.3s ease; 
          color: #333;
        }
        .softskills-tab-btn.active { background: #007bff; color: white; border-color: #007bff; }
        .tab-icon { font-size: 1.2rem; }
        .softskills-card { 
          background: linear-gradient(135deg, #14212b 0%, #082746 100%); 
          border-radius: 16px; padding: 2rem; box-shadow: 0 8px 32px rgba(0,0,0,0.1); 
          border: 1px solid rgba(255,255,255,0.2); 
        }
        .skill-content h4 { font-size: 1.8rem; color: #007bff; margin-bottom: 1rem; }
        .question-card { 
          background: linear-gradient(135deg, #0c243b 0%, #03213e 100%); 
          border-radius: 16px; padding: 2rem; box-shadow: 0 8px 32px rgba(0,0,0,0.1); 
          border: 1px solid rgba(255,255,255,0.2); color: #fff; 
          margin-bottom: 1.5rem;
        }
        .question-text { color: #fff; margin-bottom: 1rem; font-size: 1.1rem; line-height: 1.5; }
        .mcq-select, .response-textarea { width: 100%; padding: 0.75rem; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 1rem; margin-bottom: 1rem; color: #333; background: white; }
        .options-grid { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
        .option-btn { padding: 1rem; border: 2px solid #e0e0e0; border-radius: 8px; background: white; cursor: pointer; transition: all 0.3s ease; color: #333; text-align: left; font-size: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .option-btn:hover, .option-btn.selected { background: #007bff; color: white; border-color: #007bff; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(0,123,255,0.3); }
        .submit-btn { background: #28a745; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; margin: 0.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .submit-btn:hover { background: #218838; transform: translateY(-1px); box-shadow: 0 4px 8px rgba(40,167,69,0.3); }
        .submit-btn:disabled { background: #6c757d; cursor: not-allowed; }
        .feedback { padding: 0.75rem; border-radius: 8px; margin-top: 1rem; font-weight: 500; color: #333; }
        .feedback.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .feedback.warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .progress-bar { width: 100%; height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; margin: 1rem 0; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #007bff, #0056b3); transition: width 0.5s; }
        .conversation-log { max-height: 300px; overflow-y: auto; margin-bottom: 1rem; padding: 1rem; background: white; border-radius: 8px; color: #333; }
        .msg { margin-bottom: 0.5rem; padding: 0.75rem; border-radius: 8px; }
        .msg.user { background: #e3f2fd; text-align: right; }
        .msg.ai { background: #f5f5f5; text-align: left; }
        .live-transcription { margin-top: 1rem; padding: 1rem; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; }
        .live-indicator { color: #dc3545; font-weight: bold; margin: 0 0 0.5rem 0; animation: pulse 1s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        .confidence-bar { width: 100%; height: 6px; background: #e0e0e0; border-radius: 3px; overflow: hidden; margin-bottom: 0.5rem; }
        .confidence-fill { height: 100%; background: linear-gradient(90deg, #28a745, #ffc107, #dc3545); transition: width 0.3s ease; }
        .confidence-bar span { font-size: 0.9rem; color: #666; }
        .live-text { color: #007bff; font-style: italic; margin: 0.5rem 0; background: rgba(0,123,255,0.1); padding: 0.5rem; border-radius: 4px; }
        .finalized-display { margin-top: 1rem; }
        .words-container { display: flex; flex-wrap: wrap; gap: 0.2rem; padding: 0.5rem; background: white; border-radius: 8px; border: 1px solid #dee2e6; }
        .finalized-word { font-weight: 500; transition: all 0.2s ease; }
        .generating-indicator { color: #007bff; font-style: italic; position: relative; display: inline-block; }
        .generating-indicator::after { content: 'Thinking'; animation: dots 1.5s infinite; margin-left: 0.5rem; }
        @keyframes dots { 0%,20% { content: 'Thinking'; } 40% { content: 'Thinking.'; } 60% { content: 'Thinking..'; } 80%,100% { content: 'Thinking...'; } }
        @media (max-width: 768px) { .softskills-tabs { flex-direction: column; align-items: center; } .section { padding: 2rem 1rem; } }
      `}</style>
    </motion.section>
  );
};

export default SoftSkills;