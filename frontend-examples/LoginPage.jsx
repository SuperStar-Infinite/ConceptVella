// Login Page Example
// Copy and customize for your frontend

import { useState } from 'react';
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom'; // or your router

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Redirect to dashboard or home
      navigate('/dashboard');
    } else {
      setErrorMessage(result.error || 'Login failed');
    }

    setIsLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>Login to RoadVella</h1>
        
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
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              disabled={isLoading}
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="register-link">
          Don't have an account? <a href="/register">Register here</a>
        </p>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
        }

        .login-container {
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

        .register-link {
          text-align: center;
          margin-top: 20px;
          color: #666;
        }

        .register-link a {
          color: #007bff;
          text-decoration: none;
        }

        .register-link a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

