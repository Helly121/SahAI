// File: src/pages/Login.js
// Updated: Added useEffect to redirect to / if already authenticated (token present).

import React, { useState, useEffect } from 'react'; // Added useEffect
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/axios';
import { FaUser, FaLock, FaSignInAlt, FaEye, FaEyeSlash } from 'react-icons/fa';
import '../styles/App.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
      },
    },
  };

  const formVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  };

  const inputVariants = {
    focus: {
      scale: 1.02,
      borderColor: '#008080',
      boxShadow: '0 0 0 3px rgba(0, 128, 128, 0.2)',
      backgroundColor: 'rgba(0, 128, 128, 0.1)',
      transition: { duration: 0.2 },
    },
    hover: {
      scale: 1.01,
      borderColor: 'rgba(0, 128, 128, 0.5)',
      transition: { duration: 0.15 },
    },
    typing: {
      backgroundColor: 'rgba(0, 128, 128, 0.15)',
      borderColor: '#006666',
      transition: { duration: 0.3 },
    },
  };

  const buttonVariants = {
    hover: {
      scale: 1.05,
      boxShadow: '0 8px 20px rgba(0, 128, 128, 0.4)',
      backgroundColor: '#006666',
      transition: { duration: 0.2 },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1 },
    },
    submitting: {
      scale: 1,
      transition: { duration: 0.2 },
    },
  };

  const eyeVariants = {
    hover: { scale: 1.1, rotate: 5, color: '#008080', transition: { duration: 0.2 } },
    tap: { scale: 0.95, transition: { duration: 0.1 } },
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      sessionStorage.setItem('token', res.data.token);
      sessionStorage.setItem('user', email);
      sessionStorage.setItem('justLoggedIn', 'true');
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      // Reload to trigger App.js useEffect and detect sessionStorage
      window.location.href = '/';
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid credentials. Please sign up.';
      navigate('/signup', { state: { message: msg } });
    }
    setIsSubmitting(false);
  };

  const infoMessage = location.state?.message;

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 10 + Math.random() * 10,
  }));

  return (
    <motion.div
      className="login-container"
      style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden'
      }}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="particle"
          style={{
            position: 'absolute',
            width: '4px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.6)',
            borderRadius: '50%',
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: ['0%', '100%'],
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      <AnimatePresence>
        {infoMessage && (
          <motion.div
            className="success-message"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ 
              position: 'fixed', 
              top: '20px', 
              right: '20px', 
              background: 'rgba(255, 193, 7, 0.9)', // Yellow for warning/info
              color: 'black', 
              padding: '12px 20px', 
              borderRadius: '8px', 
              zIndex: 1000 
            }}
          >
            {infoMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="login-card"
        style={{ 
          background: 'rgba(102, 126, 234, 0.2)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(102, 126, 234, 0.3)'
        }}
        variants={formVariants}
        whileHover={{ 
          y: -5, 
          boxShadow: '0 20px 40px rgba(102, 126, 234, 0.3)',
          borderColor: 'rgba(102, 126, 234, 0.6)'
        }}
        transition={{ duration: 0.3 }}
      >
        <motion.div variants={itemVariants} className="login-header">
          <motion.div
            className="login-icon"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{ color: '#008080' }}
          >
            <FaSignInAlt />
          </motion.div>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{ color: '#fff' }}
          >
            Sign In to SkillForge
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            style={{ color: 'rgba(255, 255, 255, 0.8)' }}
          >
            Enter your details to continue
          </motion.p>
        </motion.div>

        <motion.form className="login-form" onSubmit={handleSubmit} variants={itemVariants}>
          <motion.div className="input-group" whileHover="hover">
            <FaUser className="input-icon" style={{ color: '#008080' }} />
            <motion.input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                e.target.animate({ ...inputVariants.typing }, { duration: 300 });
              }}
              required
              variants={inputVariants}
              whileFocus="focus"
              initial="hidden"
              animate="visible"
              style={{ 
                background: 'rgba(255, 255, 255, 0.1)', 
                border: '1px solid rgba(0, 128, 128, 0.3)',
                color: '#fff',
                placeholderColor: 'rgba(255, 255, 255, 0.6)'
              }}
            />
          </motion.div>

          <motion.div className="input-group password-group" whileHover="hover">
            <FaLock className="input-icon" style={{ color: '#008080' }} />
            <motion.input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                e.target.animate({ ...inputVariants.typing }, { duration: 300 });
              }}
              required
              variants={inputVariants}
              whileFocus="focus"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{ 
                background: 'rgba(255, 255, 255, 0.1)', 
                border: '1px solid rgba(0, 128, 128, 0.3)',
                color: '#fff',
                paddingRight: '40px',
                placeholderColor: 'rgba(255, 255, 255, 0.6)'
              }}
            />
            <motion.button
              type="button"
              className="eye-toggle"
              onClick={() => setShowPassword(!showPassword)}
              variants={eyeVariants}
              whileHover="hover"
              whileTap="tap"
              style={{ 
                position: 'absolute', 
                right: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#008080',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </motion.button>
          </motion.div>

          <AnimatePresence>
            {isSubmitting && (
              <motion.p
                className="submitting-text"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ color: 'rgba(255, 255, 255, 0.8)' }}
              >
                Signing in...
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            className="form-btn"
            disabled={isSubmitting || !email || !password}
            style={{ 
              background: 'linear-gradient(135deg, #008080, #006666)',
              color: '#fff',
              border: 'none'
            }}
            variants={buttonVariants}
            whileHover={!isSubmitting ? "hover" : undefined}
            whileTap={!isSubmitting ? "tap" : undefined}
            animate={isSubmitting ? "submitting" : undefined}
          >
            {isSubmitting ? (
              <motion.div
                className="spinner"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ color: '#fff' }}
              />
            ) : (
              'Sign In'
            )}
          </motion.button>

          <motion.div
            className="login-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{ color: 'rgba(255, 255, 255, 0.8)' }}
          >
            <p>
              Don't have an account? <Link to="/signup" style={{ color: '#008080' }}>Sign up here</Link>
            </p>
          </motion.div>
        </motion.form>
      </motion.div>
    </motion.div>
  );
};

export default Login;