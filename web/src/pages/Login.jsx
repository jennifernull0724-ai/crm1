import React, { useState } from 'react';
import PublicLayout from '../components/PublicLayout.jsx';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' or 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // TODO: Replace with actual login API call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      
      // Store auth token/session
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      // Redirect to app
      window.location.href = '/contacts';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // TODO: Replace with actual forgot password API call
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Request failed');
      }

      setSuccess('Password reset instructions have been sent to your email.');
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'forgot') {
    return (
      <PublicLayout>
        <div className="login-page">
          <div className="login-container">
            <div className="login-card">
              <h1 className="login-title">Reset Password</h1>
              <p className="login-subtitle">
                Enter your email address and we'll send you instructions to reset your password.
              </p>

              {error && (
                <div className="login-alert login-alert-error">
                  {error}
                </div>
              )}

              {success && (
                <div className="login-alert login-alert-success">
                  {success}
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="login-form">
                <div className="login-field">
                  <label htmlFor="email" className="login-label">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="login-input"
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  className="login-button"
                  disabled={loading}
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <div className="login-footer">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                      setSuccess('');
                    }}
                    className="login-link"
                  >
                    ← Back to login
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="login-page">
        <div className="login-container">
          <div className="login-card">
            <h1 className="login-title">Sign in to T-REX AI OS</h1>
            <p className="login-subtitle">
              Enter your credentials to access your operational control system.
            </p>

            {error && (
              <div className="login-alert login-alert-error">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="login-form">
              <div className="login-field">
                <label htmlFor="email" className="login-label">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div className="login-field">
                <div className="login-label-row">
                  <label htmlFor="password" className="login-label">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="login-link"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

              <div className="login-footer">
                Don't have an account?{' '}
                <a href="/signup" className="login-link">
                  Create account
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
