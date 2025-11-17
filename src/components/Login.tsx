import React, { useState } from 'react';
import { loginUser, registerUser } from '../services/authService';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        const result = await registerUser(email, password);
        if (result.success) {
          setShowVerification(true);
          setError(result.message || 'Registration successful. Please check your email for verification.');
        } else {
          setError(result.error || 'Failed to register');
        }
      } else {
        const result = await loginUser(email, password);
        if (!result.success) {
          setError(result.error || 'Failed to login');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };


  if (showVerification) {
    return (
      <div className="login-container">
        <h2>Email Verification Required</h2>
        <p>Please check your email for a verification link and click on it to verify your account.</p>
        <p>After verifying your email, you can log in using the button below.</p>
        {error && <div className="error-message">{error}</div>}
        <button onClick={() => setShowVerification(false)}>
          Back to Login
        </button>
      </div>
    );
  }

  return (
    <div className="login-container">
      <h2>{isRegistering ? 'Register' : 'Login'}</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : isRegistering ? 'Register' : 'Login'}
        </button>
      </form>
      <div className="toggle-form">
        <button onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
        </button>
      </div>
    </div>
  );
};

export default Login;