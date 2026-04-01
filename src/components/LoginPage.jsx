import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { LogIn, Eye, EyeOff, Loader } from 'lucide-react';
import ExotelLogo, { ExotelXMark } from './ExotelLogo';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const themeMode = useThemeStore((s) => s.mode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.error || 'Invalid username or password');
        setShake(true);
        setTimeout(() => setShake(false), 600);
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className={`login-card ${shake ? 'shake' : ''}`}>
        <div className="login-logo">
          <div className="login-logo-icon">
            <ExotelXMark size={28} />
          </div>
          <ExotelLogo height={26} light={themeMode === 'dark'} className="login-exotel-wordmark" />
          <h2 className="login-product-name">IVR Flow Builder</h2>
          <p>Build interactive voice response flows visually</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
              maxLength={30}
              required
            />
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="login-pw-wrap">
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                maxLength={128}
                required
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? <Loader size={16} className="spin" /> : <LogIn size={16} />}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-hint">
          <div className="login-hint-label">Demo Credentials</div>
          <div className="login-hint-row">
            <span>Username:</span> <code>demo</code>
          </div>
          <div className="login-hint-row">
            <span>Password:</span> <code>demo123</code>
          </div>
        </div>
      </div>

      <div className="login-footer">
        <ExotelLogo height={14} light={themeMode === 'dark'} className="login-footer-logo" />
        <span>Powered by Exotel CPaaS APIs</span>
      </div>
    </div>
  );
}
