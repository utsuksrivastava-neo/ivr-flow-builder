import React, { useState } from 'react';
import useAuthStore from '../store/authStore';
import { PhoneOutgoing, LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (login(username, password)) {
      setError('');
    } else {
      setError('Invalid username or password');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="login-page">
      <div className={`login-card ${shake ? 'shake' : ''}`}>
        <div className="login-logo">
          <div className="login-logo-icon">
            <PhoneOutgoing size={28} />
          </div>
          <h1>IVR Flow Builder</h1>
          <p>Build interactive voice response flows visually</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
            />
          </div>
          <div className="login-field">
            <label>Password</label>
            <div className="login-pw-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="login-btn">
            <LogIn size={16} />
            Sign In
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
        Powered by Exotel CPaaS APIs
      </div>
    </div>
  );
}
