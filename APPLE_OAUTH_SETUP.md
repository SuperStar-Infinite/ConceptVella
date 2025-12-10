# Apple OAuth Setup Guide for ConceptVella

## Quick Setup Steps

### 1. Apple Developer Console Setup

#### Create Service ID
1. Go to [Apple Developer - Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Click **+** → Select **Services IDs** → Continue
3. Register new Service ID:
   - **Description**: `ConceptVella Web Sign In`
   - **Identifier**: `com.conceptvella.web` (or your preferred format)
4. Enable **Sign in with Apple**
5. Configure:
   - **Primary App ID**: Select your app (create one if needed)
   - **Website URLs**:
     - **Domains**: `www.conceptvella.com`, `conceptvella.vercel.app`
     - **Return URLs**: `https://oadmvwnpytdxzrclkqti.supabase.co/auth/v1/callback`
6. **Save** and note your Service ID

#### Create Key
1. Go to [Apple Developer - Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Click **+** → Name: `ConceptVella Sign in with Apple Key`
3. Enable **Sign in with Apple** → Configure → Continue
4. **Download the .p8 key file** (you can only download once!)
5. Note the **Key ID** shown

#### Get Team ID
1. Go to [Apple Developer - Membership](https://developer.apple.com/account/#/membership)
2. Copy your **Team ID** (10-character string)

### 2. Generate Secret Key (JWT)

You need to generate a JWT secret from your key file. Use one of these methods:

#### Option A: Online Tool (Easiest)
1. Go to https://appleid.apple.com/signinwithapple/jwt
2. Upload your `.p8` key file
3. Enter:
   - **Key ID**: From step above
   - **Team ID**: From step above
   - **Client ID**: Your Service ID (e.g., `com.conceptvella.web`)
4. Generate and copy the JWT secret

#### Option B: Node.js Script
```bash
npm install jsonwebtoken
```

Create `generate-apple-secret.js`:
```javascript
const jwt = require('jsonwebtoken');
const fs = require('fs');

const keyId = 'YOUR_KEY_ID'; // From Apple Developer
const teamId = 'YOUR_TEAM_ID'; // From Apple Developer
const clientId = 'com.conceptvella.web'; // Your Service ID
const keyPath = './AuthKey_KEYID.p8'; // Path to your .p8 file

const privateKey = fs.readFileSync(keyPath);

const token = jwt.sign(
  {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 180, // 6 months
    aud: 'https://appleid.apple.com',
    sub: clientId,
  },
  privateKey,
  {
    algorithm: 'ES256',
    keyid: keyId,
  }
);

console.log('Apple Secret Key:');
console.log(token);
```

Run: `node generate-apple-secret.js`

### 3. Configure Supabase

In Supabase Dashboard → Authentication → Providers → Apple:

1. **Enable Sign in with Apple**: ✅ ON

2. **Client IDs**: 
   - Enter your Service ID: `com.conceptvella.web`
   - (This is NOT an email address!)

3. **Secret Key (for OAuth)**:
   - Paste the JWT secret you generated in step 2
   - This is the long token string, not the .p8 file

4. **Allow users without an email**: 
   - ✅ ON (recommended, as Apple may not always return email)

5. **Callback URL**: 
   - Already shown: `https://oadmvwnpytdxzrclkqti.supabase.co/auth/v1/callback`
   - Copy this and add it to Apple Developer Return URLs (step 1.5)

6. Click **Save**

### 4. Important Notes

⚠️ **Secret Key Expires Every 6 Months**
- Apple OAuth secret keys expire every 6 months
- You need to regenerate the JWT secret before it expires
- Set a reminder to regenerate every 5-6 months
- Use the same process (Option A or B above) to generate a new secret

### 5. Test

1. Call your backend: `GET /auth/oauth/apple`
2. Should return OAuth URL
3. Redirect user to that URL
4. User signs in with Apple
5. Should redirect back to your frontend with tokens

---

## Troubleshooting

**Error: "Invalid client"**
- Check that Service ID matches exactly in Supabase
- Verify Service ID is enabled for Sign in with Apple in Apple Developer

**Error: "Invalid redirect_uri"**
- Make sure callback URL is added to Apple Developer Return URLs
- URL must match exactly (including https://)

**Error: "Invalid secret"**
- Regenerate the JWT secret
- Make sure you're using the correct Key ID, Team ID, and Client ID
- Check that the .p8 key file is valid

**Users can't sign in after 6 months**
- Secret key expired - regenerate it and update in Supabase

