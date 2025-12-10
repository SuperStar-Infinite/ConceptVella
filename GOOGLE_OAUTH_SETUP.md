# Google OAuth Setup Guide for ConceptVella

## Quick Setup Steps

### 1. Google Cloud Console Setup

#### Create OAuth 2.0 Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project:
   - Click project dropdown → **New Project**
   - Name: `ConceptVella` (or your preferred name)
   - Click **Create**

3. Enable Google+ API:
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API" or "People API"
   - Click **Enable**

4. Configure OAuth Consent Screen:
   - Go to **APIs & Services** → **OAuth consent screen**
   - Choose **External** (unless you have Google Workspace)
   - Click **Create**
   - Fill in required fields:
     - **App name**: `ConceptVella`
     - **User support email**: Your email
     - **Developer contact information**: Your email
   - Click **Save and Continue**
   - **Scopes**: Click **Add or Remove Scopes**
     - Select: `.../auth/userinfo.email` and `.../auth/userinfo.profile`
     - Click **Update** → **Save and Continue**
   - **Test users** (optional for testing): Add your email
   - Click **Save and Continue** → **Back to Dashboard**

5. Create OAuth 2.0 Client ID:
   - Go to **APIs & Services** → **Credentials**
   - Click **+ Create Credentials** → **OAuth client ID**
   - **Application type**: Select **Web application**
   - **Name**: `ConceptVella Web Client`
   - **Authorized JavaScript origins**:
     - `https://www.conceptvella.com`
     - `https://conceptvella.vercel.app`
     - `http://localhost:8080` (for development)
   - **Authorized redirect URIs**:
     - `https://oadmvwnpytdxzrclkqti.supabase.co/auth/v1/callback`
     - (Copy this from Supabase callback URL field)
   - Click **Create**
   - **IMPORTANT**: Copy both:
     - **Client ID** (long string ending in `.apps.googleusercontent.com`)
     - **Client Secret** (click "Show" to reveal)
   - Save these securely!

### 2. Configure Supabase

In Supabase Dashboard → Authentication → Providers → Google:

1. **Enable Sign in with Google**: ✅ Turn ON

2. **Client IDs**: 
   - Paste your **Client ID** from Google Cloud Console
   - Format: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
   - (This is a single Client ID, not comma-separated for basic setup)

3. **Client Secret (for OAuth)**:
   - Paste your **Client Secret** from Google Cloud Console
   - Click the eye icon to verify it's correct
   - This is the secret you copied in step 1.5

4. **Skip nonce checks**: 
   - Leave OFF (default) for better security
   - Only enable if you have specific iOS requirements

5. **Allow users without an email**: 
   - ✅ Turn ON (recommended)
   - Google usually provides email, but this ensures compatibility

6. **Callback URL**: 
   - Already shown: `https://oadmvwnpytdxzrclkqti.supabase.co/auth/v1/callback`
   - Make sure this exact URL is in Google Cloud Console **Authorized redirect URIs**

7. Click **Save**

### 3. Test

1. Call your backend: `GET /auth/oauth/google`
2. Should return OAuth URL
3. Redirect user to that URL
4. User signs in with Google
5. Should redirect back to your frontend with tokens

---

## Quick Reference

### What You Need from Google Cloud Console:
- ✅ **Client ID**: `xxxxx.apps.googleusercontent.com`
- ✅ **Client Secret**: `GOCSPX-xxxxx...`
- ✅ **Callback URL**: `https://oadmvwnpytdxzrclkqti.supabase.co/auth/v1/callback`

### What to Enter in Supabase:
- **Client IDs**: Your Client ID
- **Client Secret**: Your Client Secret
- **Enable Sign in with Google**: ON
- **Allow users without an email**: ON (recommended)

---

## Troubleshooting

**Error: "redirect_uri_mismatch"**
- Make sure the callback URL in Google Cloud Console matches exactly
- URL must be: `https://oadmvwnpytdxzrclkqti.supabase.co/auth/v1/callback`
- Check for trailing slashes or typos

**Error: "invalid_client"**
- Verify Client ID and Client Secret are correct
- Make sure you copied the full Client ID (ending in `.apps.googleusercontent.com`)
- Check that Client Secret is not expired or regenerated

**Error: "access_denied"**
- Check OAuth consent screen is configured
- Verify test users are added (if app is in testing mode)
- Make sure required scopes are enabled

**Users can't sign in**
- Check that Google+ API or People API is enabled
- Verify OAuth consent screen is published (if app is in production)
- Check browser console for specific error messages

---

## Notes

- **Google OAuth is simpler than Apple** - no secret key generation needed
- **Client ID and Secret don't expire** (unlike Apple's 6-month expiration)
- **Same button works for sign-in and sign-up** - Google handles both automatically
- **Profile creation is automatic** - Supabase creates user and profile on first OAuth login

---

## Security Best Practices

1. **Never commit Client Secret to git** - it's already in Supabase (secure)
2. **Use environment-specific credentials** - different Client IDs for dev/prod
3. **Restrict Authorized JavaScript origins** - only your actual domains
4. **Keep OAuth consent screen updated** - especially privacy policy and terms

