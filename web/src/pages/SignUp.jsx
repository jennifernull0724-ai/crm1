import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout.jsx';

export default function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sign up failed');
      }

      // Store user info temporarily
      sessionStorage.setItem('pendingUser', JSON.stringify(data.user));
      
      // Redirect to pricing to choose a plan
      navigate('/pricing');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="login-page">
        <div className="login-container">
          <div className="login-card">
            <h1 className="login-title">Create your account</h1>
            <p className="login-subtitle">
              Sign up to get started with T-REX AI OS
            </p>

            {error && (
              <div className="login-alert login-alert-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="firstName" className="login-label">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="login-input"
                  placeholder="John"
                  required
                  disabled={loading}
                />
              </div>

              <div className="login-field">
                <label htmlFor="lastName" className="login-label">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="login-input"
                  placeholder="Doe"
                  required
                  disabled={loading}
                />
              </div>

              <div className="login-field">
                <label htmlFor="email" className="login-label">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="login-input"
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              <div className="login-field">
                <label htmlFor="password" className="login-label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="login-input"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  minLength={8}
                />
                <div style={{fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px'}}>
                  At least 8 characters
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="confirmPassword" className="login-label">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="login-input"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>

              <div className="login-footer">
                Already have an account?{' '}
                <a href="/login" className="login-link">
                  Sign in
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
