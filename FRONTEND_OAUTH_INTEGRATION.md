# Frontend OAuth Integration Guide

## Complete Flow for Google/Apple Sign-In

### Step 1: Get OAuth URL from Backend

```javascript
// When user clicks "Sign in with Google" button
async function handleGoogleSignIn() {
  try {
    // Call your backend to get OAuth URL
    const response = await fetch('https://your-backend-url.com/auth/oauth/google');
    const data = await response.json();
    
    if (data.success && data.url) {
      // Step 2: Redirect user to OAuth URL
      window.location.href = data.url;
    }
  } catch (error) {
    console.error('Error getting OAuth URL:', error);
  }
}
```

### Step 2: Handle OAuth Callback

After user authenticates with Google/Apple, Supabase redirects back to your frontend with tokens in the URL hash.

**Create a callback page/component** (e.g., `/auth/callback`):

```javascript
// In your callback page/component (e.g., AuthCallback.jsx)
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // or your router

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Extract tokens from URL hash
    const hash = window.location.hash.substring(1); // Remove the '#'
    const params = new URLSearchParams(hash);
    
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      // Handle error
      console.error('OAuth error:', error, errorDescription);
      // Redirect to login page with error
      navigate('/login?error=oauth_failed');
      return;
    }

    if (accessToken && refreshToken) {
      // Success! Store tokens and redirect
      handleOAuthSuccess(accessToken, refreshToken);
    } else {
      // No tokens found
      console.error('No tokens in callback');
      navigate('/login?error=no_tokens');
    }
  }, [navigate]);

  async function handleOAuthSuccess(accessToken, refreshToken) {
    try {
      // Option 1: Store tokens and use them directly
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      
      // Option 2: Verify token with backend and get user info
      const response = await fetch('https://your-backend-url.com/auth/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        // Store user data in your state/context
        // Then redirect to dashboard/home
        navigate('/dashboard'); // or wherever you want
      } else {
        throw new Error('Failed to verify token');
      }
    } catch (error) {
      console.error('Error handling OAuth success:', error);
      navigate('/login?error=token_verification_failed');
    }
  }

  // Show loading state while processing
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}

export default AuthCallback;
```

### Step 3: Complete Example (React)

```javascript
// LoginPage.jsx
import { useState } from 'react';

function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://your-backend-url.com/auth/oauth/google');
      const data = await response.json();
      
      if (data.success && data.url) {
        // Redirect to Google OAuth
        window.location.href = data.url;
      } else {
        throw new Error('Failed to get OAuth URL');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      setLoading(false);
      // Show error to user
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://your-backend-url.com/auth/oauth/apple');
      const data = await response.json();
      
      if (data.success && data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('OAuth error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Your existing email/password form */}
      
      <div className="social-login">
        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="google-sign-in-btn"
        >
          <GoogleIcon />
          Sign in with Google
        </button>
        
        <button 
          onClick={handleAppleSignIn}
          disabled={loading}
          className="apple-sign-in-btn"
        >
          <AppleIcon />
          Sign in with Apple
        </button>
      </div>
    </div>
  );
}
```

### Step 4: Router Setup

Make sure your router handles the callback route:

```javascript
// App.jsx or router config
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthCallback from './pages/AuthCallback';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        {/* other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

## Important Notes

1. **URL Hash vs Query Params**: 
   - Tokens come in `window.location.hash` (after `#`), NOT `window.location.search` (after `?`)
   - Example: `https://www.conceptvella.com/auth/callback#access_token=...&refresh_token=...`

2. **Token Storage**:
   - Store tokens securely (localStorage, sessionStorage, or secure cookies)
   - Use tokens in `Authorization: Bearer <token>` header for API calls

3. **Error Handling**:
   - Always check for `error` parameter in callback
   - Handle cases where user cancels OAuth flow

4. **Redirect URL Must Match**:
   - The callback URL in Supabase must match your frontend route
   - Current: `https://www.conceptvella.com/auth/callback`
   - Make sure this route exists in your frontend app

## Testing Checklist

- [ ] OAuth URL is generated correctly
- [ ] User can click button and redirect to Google/Apple
- [ ] After authentication, user is redirected back to `/auth/callback`
- [ ] Tokens are extracted from URL hash
- [ ] Tokens are stored securely
- [ ] User is redirected to dashboard/home after successful auth
- [ ] Error cases are handled gracefully

