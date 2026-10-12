import React, { useState } from 'react';
import api from '../services/api';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const demoAvailable = process.env.REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL === 'true' &&
    Boolean(process.env.REACT_APP_DEMO_EMAIL && process.env.REACT_APP_DEMO_PASSWORD);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const autofill = () => {
    if (!demoAvailable) return;
    setEmail(process.env.REACT_APP_DEMO_EMAIL);
    setPassword(process.env.REACT_APP_DEMO_PASSWORD);
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">
          <span className="logo-icon">🦷</span>
          <div>
            <h1>DentalAI</h1>
            <span className="logo-sub">Practice Manager</span>
          </div>
        </div>
        <p className="login-subtitle">Sign in to manage your dental practice</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <button type="button" className="autofill-btn" onClick={autofill} disabled={loading || !demoAvailable}>
          Fill demo credentials
        </button>
        {!demoAvailable && <p role="status">Demo credentials are not configured for this session. Enter your account credentials to sign in.</p>}
      </div>
    </div>
  );
}

export default Login;
