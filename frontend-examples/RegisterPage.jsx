// Register Page Example
// Copy and customize for your frontend

import { useState } from 'react';
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom'; // or your router

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage('');

    // Validation
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsLoading(true);

    const result = await register(email, password, displayName);

    if (result.success) {
      // Redirect to dashboard or home
      navigate('/dashboard');
    } else {
      setErrorMessage(result.error || 'Registration failed');
    }

    setIsLoading(false);
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <h1>Create Account</h1>
        
        <form onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="error-message">
              {errorMessage}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
              disabled={isLoading}
            />
            <small>Optional - This is how you'll appear to other users</small>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              disabled={isLoading}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="login-link">
          Already have an account? <a href="/login">Login here</a>
        </p>
      </div>

      <style jsx>{`
        .register-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          padding: 20px;
        }

        .register-container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          max-width: 400px;
          width: 100%;
        }

        h1 {
          margin-bottom: 30px;
          color: #333;
          text-align: center;
        }

        .form-group {
          margin-bottom: 20px;
        }

        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #555;
        }

        input {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }

        input:focus {
          outline: none;
          border-color: #007bff;
        }

        input:disabled {
          background: #f5f5f5;
          cursor: not-allowed;
        }

        small {
          display: block;
          margin-top: 5px;
          color: #999;
          font-size: 12px;
        }

        .btn-primary {
          width: 100%;
          padding: 12px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 10px;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .btn-primary:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
          border: 1px solid #f5c6cb;
        }

        .login-link {
          text-align: center;
          margin-top: 20px;
          color: #666;
        }

        .login-link a {
          color: #007bff;
          text-decoration: none;
        }

        .login-link a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

