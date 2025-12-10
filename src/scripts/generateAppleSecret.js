/**
 * Generate Apple OAuth Secret Key (JWT)
 * 
 * Usage:
 * 1. Download your .p8 key file from Apple Developer
 * 2. Place it in this directory or provide full path
 * 3. Update the constants below with your values
 * 4. Run: node src/scripts/generateAppleSecret.js
 * 
 * Note: This secret expires every 6 months - regenerate before expiration!
 */

const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURE THESE VALUES
// ============================================
const KEY_ID = 'YOUR_KEY_ID'; // From Apple Developer Keys page
const TEAM_ID = 'YOUR_TEAM_ID'; // From Apple Developer Membership page (10 characters)
const CLIENT_ID = 'com.conceptvella.web'; // Your Service ID from Apple Developer
const KEY_FILE_PATH = './AuthKey_KEYID.p8'; // Path to your downloaded .p8 file
// ============================================

try {
  // Check if key file exists
  if (!fs.existsSync(KEY_FILE_PATH)) {
    console.error('❌ Error: Key file not found at:', KEY_FILE_PATH);
    console.error('   Please download your .p8 key file from Apple Developer and update KEY_FILE_PATH');
    process.exit(1);
  }

  // Read the private key
  const privateKey = fs.readFileSync(KEY_FILE_PATH);

  // Validate required values
  if (KEY_ID === 'YOUR_KEY_ID' || TEAM_ID === 'YOUR_TEAM_ID') {
    console.error('❌ Error: Please update KEY_ID and TEAM_ID in the script');
    process.exit(1);
  }

  // Generate JWT token (valid for 6 months)
  const now = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    {
      iss: TEAM_ID,
      iat: now,
      exp: now + 86400 * 180, // 6 months (180 days)
      aud: 'https://appleid.apple.com',
      sub: CLIENT_ID,
    },
    privateKey,
    {
      algorithm: 'ES256',
      keyid: KEY_ID,
    }
  );

  console.log('\n✅ Apple OAuth Secret Key Generated!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📋 Copy this secret and paste it into Supabase:\n');
  console.log(token);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  Important:');
  console.log('   • This secret expires in 6 months');
  console.log('   • Set a reminder to regenerate before expiration');
  console.log('   • Paste this into Supabase → Authentication → Providers → Apple → Secret Key');
  console.log('\n');

} catch (error) {
  console.error('❌ Error generating secret:', error.message);
  if (error.message.includes('PEM')) {
    console.error('   Make sure your .p8 key file is valid');
  }
  process.exit(1);
}

