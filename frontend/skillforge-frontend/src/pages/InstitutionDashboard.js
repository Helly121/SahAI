import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaSearch, FaFilter, FaGraduationCap, FaExternalLinkAlt, FaCheckCircle, FaAward, FaBuilding } from 'react-icons/fa';
import api from '../utils/axios';

const InstitutionDashboard = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [minAptitude, setMinAptitude] = useState(0);
  const [minMock, setMinMock] = useState(0);
  const [sortBy, setSortBy] = useState('username'); // 'username', 'mock', 'aptitude', 'coins'

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/public/candidates');
        setCandidates(res.data);
        setLoading(false);
      } catch (err) {
        console.error('Candidates fetch error:', err);
        setLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  const filteredCandidates = candidates
    .filter(c => {
      const matchSearch = c.username.toLowerCase().includes(searchTerm.toLowerCase()) || c.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchApt = c.avg_aptitude >= minAptitude;
      const matchMock = c.avg_mock >= minMock;
      return matchSearch && matchApt && matchMock;
    })
    .sort((a, b) => {
      if (sortBy === 'username') return a.username.localeCompare(b.username);
      if (sortBy === 'mock') return b.avg_mock - a.avg_mock;
      if (sortBy === 'aptitude') return b.avg_aptitude - a.avg_aptitude;
      if (sortBy === 'coins') return b.coins - a.coins;
      return 0;
    });

  const cardStyle = {
    backgroundColor: '#0a0a0a',
    border: '1px solid #222',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
    color: '#e0e0e0',
  };

  const tableHeaderStyle = {
    padding: '1.2rem 1rem',
    color: '#888',
    fontWeight: '600',
    textAlign: 'left',
    borderBottom: '2px solid #222',
    fontSize: '0.9rem',
  };

  const tableRowStyle = {
    borderBottom: '1px solid #1a1a1a',
    transition: 'background-color 0.2s',
  };

  const badgeStyle = (score) => ({
    display: 'inline-block',
    padding: '0.4rem 0.8rem',
    borderRadius: '10px',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    backgroundColor: score >= 80 ? 'rgba(16, 185, 129, 0.15)' : (score >= 65 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)'),
    color: score >= 80 ? '#10b981' : (score >= 65 ? '#3b82f6' : '#ef4444'),
    border: `1px solid ${score >= 80 ? '#10b981' : (score >= 65 ? '#3b82f6' : '#ef4444')}`,
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#030303', color: '#e0e0e0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        
        {/* Banner Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
          <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', padding: '1.2rem', borderRadius: '20px', color: '#10b981' }}>
            <FaGraduationCap size={44} />
          </div>
          <div>
            <h1 style={{ margin: 0, color: '#fff', fontSize: '2.5rem', fontWeight: '700' }}>
              University Placement Cell Portal
            </h1>
            <p style={{ margin: '0.4rem 0 0', color: '#888', fontSize: '1.1rem' }}>
              Scale-ready dashboard verifying student capability portfolios for corporate recruiting
            </p>
          </div>
        </div>

        {/* Dashboard Filters */}
        <div style={{ ...cardStyle, marginBottom: '2.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FaFilter size={18} color="#10b981" /> Search & Competency Filters
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
            {/* Search Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#888', fontWeight: '600' }}>SEARCH NAME OR EMAIL</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="e.g. Test User"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 2.5rem', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#111', color: '#fff', outline: 'none' }}
                />
                <FaSearch style={{ position: 'absolute', left: '1rem', top: '1rem', color: '#555' }} />
              </div>
            </div>

            {/* Mock Interview Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '0.85rem', color: '#888', fontWeight: '600' }}>MIN SPOKEN FLUENCY</label>
                <span style={{ color: '#10b981', fontWeight: 'bold' }}>{minMock}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={minMock}
                onChange={(e) => setMinMock(parseInt(e.target.value))}
                style={{ accentColor: '#10b981', height: '6px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Aptitude Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '0.85rem', color: '#888', fontWeight: '600' }}>MIN APTITUDE LOGIC</label>
                <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{minAptitude}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={minAptitude}
                onChange={(e) => setMinAptitude(parseInt(e.target.value))}
                style={{ accentColor: '#3b82f6', height: '6px', borderRadius: '4px', cursor: 'pointer' }}
              />
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#888', fontWeight: '600' }}>SORT CANDIDATES BY</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#111', color: '#fff', outline: 'none', cursor: 'pointer' }}
              >
                <option value="username">Alphabetical (A-Z)</option>
                <option value="mock">Vocal Fluency Score</option>
                <option value="aptitude">Aptitude Logic Score</option>
                <option value="coins">Accumulated Coins</option>
              </select>
            </div>

          </div>
        </div>

        {/* Candidate Directory Table */}
        <div style={{ ...cardStyle, padding: '1.5rem 0' }}>
          <div style={{ padding: '0 2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#fff' }}>Verified Candidate Directory</h3>
            <span style={{ color: '#888', fontSize: '0.9rem' }}>Showing <strong>{filteredCandidates.length}</strong> matching candidate(s)</span>
          </div>

          {loading ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#888' }}>Loading student profiles...</div>
          ) : filteredCandidates.length === 0 ? (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#888' }}>No candidates meet the selected score threshold.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...tableHeaderStyle, paddingLeft: '2rem' }}>CANDIDATE NAME</th>
                    <th style={tableHeaderStyle}>EMAIL ADDRESS</th>
                    <th style={tableHeaderStyle}>SPOKEN FLUENCY</th>
                    <th style={tableHeaderStyle}>COGNITIVE LOGIC</th>
                    <th style={tableHeaderStyle}>DEBATE INDEX</th>
                    <th style={tableHeaderStyle}>VERIFIED PROFILE</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((c, idx) => (
                    <tr 
                      key={idx} 
                      style={tableRowStyle}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#111'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '1.2rem 1rem', paddingLeft: '2rem', fontWeight: '600', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {c.username} <FaCheckCircle color="#10b981" size={14} title="Verified Profile" />
                      </td>
                      <td style={{ padding: '1.2rem 1rem', color: '#aaa', fontSize: '0.9rem' }}>{c.email}</td>
                      <td style={{ padding: '1.2rem 1rem' }}>
                        <span style={badgeStyle(c.avg_mock)}>{c.avg_mock}%</span>
                      </td>
                      <td style={{ padding: '1.2rem 1rem' }}>
                        <span style={badgeStyle(c.avg_aptitude)}>{c.avg_aptitude}%</span>
                      </td>
                      <td style={{ padding: '1.2rem 1rem' }}>
                        <span style={badgeStyle(c.avg_debate)}>{c.avg_debate}%</span>
                      </td>
                      <td style={{ padding: '1.2rem 1rem' }}>
                        <Link 
                          to={`/profile/share/${encodeURIComponent(c.email)}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.9rem' }}
                        >
                          View Portfolio <FaExternalLinkAlt size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Scalability Notice */}
        <div style={{ backgroundColor: '#0a0b0f', border: '1px solid #1e3a8a', borderRadius: '18px', padding: '1.5rem', display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
          <div style={{ color: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', padding: '0.8rem', borderRadius: '50%' }}>
            <FaBuilding size={24} />
          </div>
          <div>
            <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: '600' }}>Scalable Outcome Orientation</h4>
            <p style={{ margin: '0.3rem 0 0', color: '#888', fontSize: '0.85rem' }}>
              This portal demonstrates how corporate partners can instantly filter thousands of applicants by actual AI-verified speech fluency, grammar, and reasoning scores. Educational institutes can track their complete cohort readiness in real-time, removing recruitment friction.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InstitutionDashboard;
