// File: src/App.js
// Updated: Added protected routes using isAuthenticated state. If not authenticated, Navigate to /login.
// Public routes: /, /login, /signup, /terms.
// Protected: /profile, /mock-interviews, /soft-skills, /aptitude-tests, /gamification.
// Also, added import Navigate.

import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import api from './utils/axios';
import './styles/App.css';
import './styles/App1.css';
import './styles/mock.css';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MockInterview from './pages/MockInterview';
import SoftSkills from './pages/SoftSkills';
import AptitudeTests from './pages/AptitudeTests';
import Gamification from './pages/Gamification';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Terms from './pages/Terms';
import PublicProfile from './pages/PublicProfile';
import InstitutionDashboard from './pages/InstitutionDashboard';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState('');
  const [token, setToken] = useState(sessionStorage.getItem('token'));
  const location = useLocation();

  useEffect(() => {
    const storedToken = sessionStorage.getItem('token');
    const storedUser = sessionStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      setIsAuthenticated(true);
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    } else {
      // Ensure clean state if no session
      setToken(null);
      setUser('');
      setIsAuthenticated(false);
      delete api.defaults.headers.common['Authorization'];
    }
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('justLoggedIn');
    setToken(null);
    setIsAuthenticated(false);
    setUser('');
    delete api.defaults.headers.common['Authorization'];
    window.location.href = '/login';
  };

  return (
    <div className={`App ${isMenuOpen ? 'blur' : ''}`}>
      <Navbar 
        isMenuOpen={isMenuOpen} 
        toggleMenu={toggleMenu} 
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
      />
      <div style={{ paddingTop: '60px' }}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home isAuthenticated={isAuthenticated} user={user} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/terms" element={<Terms />} />
          {/* Protected Routes */}
          <Route 
            path="/profile" 
            element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/mock-interviews" 
            element={isAuthenticated ? <MockInterview /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/soft-skills" 
            element={isAuthenticated ? <SoftSkills /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/aptitude-tests" 
            element={isAuthenticated ? <AptitudeTests /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/gamification" 
            element={isAuthenticated ? <Gamification /> : <Navigate to="/login" replace />} 
          />
          {/* Publicly Shareable / Recruiters Routing */}
          <Route path="/profile/share/:userId" element={<PublicProfile />} />
          <Route path="/institution" element={<InstitutionDashboard />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;