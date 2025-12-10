"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.ts
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const supabase_1 = require("../supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Configure multer for memory storage (we'll upload directly to Supabase)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    },
});
/**
 * POST /auth/login
 * Login with email and password to get access token
 */
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            error: "Email and password are required",
        });
    }
    try {
        const { data, error } = await supabase_1.supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            console.error("Login error:", error);
            return res.status(401).json({
                error: error.message,
            });
        }
        if (!data.user || !data.session) {
            return res.status(401).json({
                error: "Login failed",
            });
        }
        // Get user profile with role
        const { data: profile } = await supabase_1.supabase
            .from("profiles")
            .select("role, display_name")
            .eq("id", data.user.id)
            .single();
        return res.json({
            success: true,
            message: "Login successful",
            user: {
                id: data.user.id,
                email: data.user.email,
                role: profile?.role || "user",
                display_name: profile?.display_name,
            },
            token: data.session.access_token,
            expires_at: data.session.expires_at,
        });
    }
    catch (error) {
        console.error("Unexpected login error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
/**
 * GET /auth/me
 * Get current user info (requires auth)
 */
router.get("/me", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { data: profile, error } = await supabase_1.supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
        if (error) {
            console.error("Error fetching profile:", error);
            return res.status(500).json({ error: "Failed to fetch profile" });
        }
        return res.json({
            success: true,
            user: {
                id: userId,
                email: req.user.email,
                role: req.user.role,
                profile,
            },
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * POST /auth/register
 * Register new user
 * Optional fields: username, display_name, bio, location, vehicle_type, avatar_url
 */
router.post("/register", async (req, res) => {
    const { email, password, username, display_name, bio, location, vehicle_type, avatar_url } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            error: "Email and password are required",
        });
    }
    // Validate username if provided
    if (username !== undefined && username !== null && username !== "") {
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                error: "Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens",
            });
        }
        // Check if username is already taken
        const { data: existingUser } = await supabase_1.supabase
            .from("profiles")
            .select("id")
            .eq("username", username)
            .single();
        if (existingUser) {
            return res.status(400).json({
                error: "Username is already taken",
            });
        }
    }
    try {
        const { data, error } = await supabase_1.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: display_name || email.split("@")[0],
                },
            },
        });
        if (error) {
            console.error("Registration error:", error);
            return res.status(400).json({
                error: error.message,
            });
        }
        if (!data.user) {
            return res.status(400).json({
                error: "Registration failed",
            });
        }
        // Update profile with additional fields if provided
        const profileUpdates = {};
        if (username)
            profileUpdates.username = username;
        if (display_name)
            profileUpdates.display_name = display_name;
        if (bio !== undefined)
            profileUpdates.bio = bio;
        if (location !== undefined)
            profileUpdates.location = location;
        if (vehicle_type !== undefined)
            profileUpdates.vehicle_type = vehicle_type;
        if (avatar_url !== undefined)
            profileUpdates.avatar_url = avatar_url;
        if (Object.keys(profileUpdates).length > 0) {
            const { error: profileError } = await supabase_1.supabase
                .from("profiles")
                .update(profileUpdates)
                .eq("id", data.user.id);
            if (profileError) {
                console.error("Error updating profile during registration:", profileError);
                // Don't fail registration if profile update fails, just log it
            }
        }
        // Get the updated profile
        const { data: profile } = await supabase_1.supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();
        return res.json({
            success: true,
            message: "Registration successful",
            user: {
                id: data.user.id,
                email: data.user.email,
                profile: profile || null,
            },
            // Note: If email confirmation is enabled, session will be null
            token: data.session?.access_token,
        });
    }
    catch (error) {
        console.error("Unexpected registration error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
/**
 * POST /auth/logout
 * Logout user (invalidate session)
 */
router.post("/logout", auth_1.requireAuth, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace("Bearer ", "");
        if (token) {
            // Sign out the user's session
            await supabase_1.supabase.auth.admin.signOut(token);
        }
        return res.json({
            success: true,
            message: "Logged out successfully",
        });
    }
    catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({
            success: false,
            error: "Logout failed",
        });
    }
});
/**
 * GET /auth/profile
 * Get user profile with stats
 */
router.get("/profile", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Get profile
        const { data: profile, error } = await supabase_1.supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
        if (error) {
            console.error("Error fetching profile:", error);
            return res.status(500).json({ error: "Failed to fetch profile" });
        }
        // Calculate stats
        // Posts count (from experiences table)
        const { count: postsCount } = await supabase_1.supabase
            .from("experiences")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);
        // Followers count (placeholder - will implement later)
        const followersCount = 0;
        // Following count (placeholder - will implement later)
        const followingCount = 0;
        return res.json({
            success: true,
            profile: {
                ...profile,
                stats: {
                    posts: postsCount || 0,
                    followers: followersCount,
                    following: followingCount,
                },
            },
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * PUT /auth/profile
 * Update user profile
 */
router.put("/profile", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, display_name, bio, location, vehicle_type, avatar_url } = req.body;
        // Check if username is being updated and if it's already taken
        if (username !== undefined && username !== null && username !== "") {
            // Check if username is already taken by another user
            const { data: existingUser, error: checkError } = await supabase_1.supabase
                .from("profiles")
                .select("id")
                .eq("username", username)
                .neq("id", userId)
                .single();
            if (existingUser) {
                return res.status(400).json({
                    error: "Username is already taken",
                });
            }
            // Validate username format (alphanumeric, underscore, hyphen, 3-20 chars)
            const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
            if (!usernameRegex.test(username)) {
                return res.status(400).json({
                    error: "Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens",
                });
            }
        }
        const updates = {};
        if (username !== undefined)
            updates.username = username || null;
        if (display_name !== undefined)
            updates.display_name = display_name;
        if (bio !== undefined)
            updates.bio = bio;
        if (location !== undefined)
            updates.location = location;
        if (vehicle_type !== undefined)
            updates.vehicle_type = vehicle_type;
        if (avatar_url !== undefined)
            updates.avatar_url = avatar_url;
        updates.updated_at = new Date().toISOString();
        const { data: profile, error } = await supabase_1.supabase
            .from("profiles")
            .update(updates)
            .eq("id", userId)
            .select()
            .single();
        if (error) {
            console.error("Error updating profile:", error);
            // Check if it's a unique constraint violation
            if (error.code === "23505") {
                return res.status(400).json({ error: "Username is already taken" });
            }
            return res.status(500).json({ error: "Failed to update profile" });
        }
        // Get updated stats
        const { count: postsCount } = await supabase_1.supabase
            .from("experiences")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);
        return res.json({
            success: true,
            message: "Profile updated successfully",
            profile: {
                ...profile,
                stats: {
                    posts: postsCount || 0,
                    followers: 0, // Placeholder
                    following: 0, // Placeholder
                },
            },
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * GET /auth/test-reset-link
 * Test endpoint to verify reset password redirect URL configuration
 */
router.get("/test-reset-link", async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.conceptvella.com';
    const redirectUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password`;
    return res.json({
        success: true,
        frontendUrl,
        redirectUrl,
        message: "This is the redirect URL that will be used in password reset emails",
        note: "Make sure this exact URL is in Supabase Redirect URLs list",
    });
});
/**
 * POST /auth/forgot-password
 * Request password reset
 */
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({
            error: "Email is required",
        });
    }
    try {
        // Get frontend URL from environment or use production URL
        const frontendUrl = process.env.FRONTEND_URL || 'https://www.conceptvella.com';
        // Ensure no trailing slash and exact path match
        const redirectUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password`;
        console.log('Password reset requested for:', email);
        console.log('Redirect URL:', redirectUrl);
        const { error } = await supabase_1.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        });
        if (error) {
            console.error("Password reset error:", error);
            // Don't reveal if email exists - return success anyway for security
        }
        // Always return success to prevent email enumeration
        return res.json({
            success: true,
            message: "If an account exists with this email, a password reset link has been sent",
        });
    }
    catch (error) {
        console.error("Unexpected password reset error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
/**
 * POST /auth/reset-password
 * Reset password with token from email link
 *
 * Note: User must first visit the reset link from email, which redirects to frontend.
 * Frontend extracts the access_token from URL hash, then calls this endpoint with the token.
 */
router.post("/reset-password", async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({
            error: "Token and new password are required",
        });
    }
    if (password.length < 6) {
        return res.status(400).json({
            error: "Password must be at least 6 characters",
        });
    }
    try {
        // Create a Supabase client with the reset token
        // The token from the email link is an access_token that can be used to update password
        const { createClient } = await Promise.resolve().then(() => __importStar(require("@supabase/supabase-js")));
        const supabaseUrl = process.env.SUPABASE_URL;
        // Use the token to create an authenticated client
        const resetClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                persistSession: false,
            },
        });
        // Set the session using the token
        const { data: sessionData, error: sessionError } = await resetClient.auth.setSession({
            access_token: token,
            refresh_token: '', // Not needed for password reset
        });
        if (sessionError || !sessionData.session) {
            console.error("Session error:", sessionError);
            return res.status(400).json({
                error: "Invalid or expired reset token",
            });
        }
        // Now update the password using the authenticated session
        const { data, error } = await resetClient.auth.updateUser({
            password: password,
        });
        if (error) {
            console.error("Reset password error:", error);
            return res.status(400).json({
                error: error.message || "Failed to reset password",
            });
        }
        return res.json({
            success: true,
            message: "Password has been reset successfully",
        });
    }
    catch (error) {
        console.error("Unexpected reset password error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
/**
 * GET /auth/username/check
 * Check if username is available
 */
router.get("/username/check", async (req, res) => {
    try {
        const { username } = req.query;
        if (!username || typeof username !== "string") {
            return res.status(400).json({ error: "Username is required" });
        }
        // Validate format
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.json({
                available: false,
                message: "Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens",
            });
        }
        // Check if username exists
        const { data, error } = await supabase_1.supabase
            .from("profiles")
            .select("id")
            .eq("username", username)
            .single();
        if (error && error.code === "PGRST116") {
            // No rows returned - username is available
            return res.json({
                available: true,
                message: "Username is available",
            });
        }
        if (data) {
            return res.json({
                available: false,
                message: "Username is already taken",
            });
        }
        return res.json({
            available: true,
            message: "Username is available",
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * GET /auth/profile/:username
 * Get public profile by username
 */
router.get("/profile/:username", async (req, res) => {
    try {
        const { username } = req.params;
        if (!username) {
            return res.status(400).json({ error: "Username is required" });
        }
        // Get profile
        const { data: profile, error } = await supabase_1.supabase
            .from("profiles")
            .select("id, username, display_name, bio, location, vehicle_type, avatar_url, created_at")
            .eq("username", username)
            .single();
        if (error || !profile) {
            return res.status(404).json({ error: "Profile not found" });
        }
        // Calculate stats
        const { count: postsCount } = await supabase_1.supabase
            .from("experiences")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id);
        // Placeholder stats (will implement later)
        const followersCount = 0;
        const followingCount = 0;
        return res.json({
            success: true,
            profile: {
                ...profile,
                stats: {
                    posts: postsCount || 0,
                    followers: followersCount,
                    following: followingCount,
                },
            },
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
/**
 * POST /auth/verify-code
 * Verify OTP or reset code (if using OTP-based reset)
 */
router.post("/verify-code", async (req, res) => {
    const { email, token, type } = req.body;
    if (!email || !token || !type) {
        return res.status(400).json({
            error: "Email, token, and type are required",
        });
    }
    try {
        const { data, error } = await supabase_1.supabase.auth.verifyOtp({
            email,
            token,
            type: type, // 'email' | 'sms' | 'phone_change' | 'recovery'
        });
        if (error) {
            console.error("Verify code error:", error);
            return res.status(400).json({
                error: "Invalid or expired code",
            });
        }
        return res.json({
            success: true,
            message: "Code verified successfully",
            session: data.session,
        });
    }
    catch (error) {
        console.error("Unexpected verify code error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
/**
 * GET /auth/oauth/:provider
 * Get OAuth URL for Google or Apple sign-in
 *
 * Flow:
 * 1. Frontend calls this endpoint to get OAuth URL
 * 2. Frontend redirects user to the returned URL
 * 3. User authenticates with provider
 * 4. Provider redirects to frontend with tokens in URL hash
 * 5. Frontend extracts tokens and uses them
 */
router.get("/oauth/:provider", async (req, res) => {
    const { provider } = req.params;
    const { redirectTo } = req.query;
    // Validate provider
    if (provider !== "google" && provider !== "apple") {
        return res.status(400).json({
            error: "Invalid provider. Supported providers: google, apple",
        });
    }
    try {
        // Get frontend URL from environment or query param
        const frontendUrl = redirectTo || process.env.FRONTEND_URL || 'https://www.conceptvella.com';
        // Remove trailing slash and ensure proper callback path
        const redirectUrl = `${frontendUrl.replace(/\/$/, '')}/auth/callback`;
        // Generate OAuth URL using Supabase
        const { data, error } = await supabase_1.supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: redirectUrl,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        });
        if (error) {
            console.error("OAuth URL generation error:", error);
            return res.status(500).json({
                error: "Failed to generate OAuth URL",
            });
        }
        if (!data.url) {
            return res.status(500).json({
                error: "Failed to generate OAuth URL",
            });
        }
        return res.json({
            success: true,
            url: data.url,
            provider,
            redirectTo: redirectUrl,
        });
    }
    catch (error) {
        console.error("Unexpected OAuth error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
/**
 * POST /auth/oauth/callback
 * Handle OAuth callback and exchange code for tokens
 *
 * This endpoint can be used if you want to handle the OAuth callback on the backend
 * instead of directly on the frontend. The frontend would redirect to this endpoint
 * after OAuth authentication.
 *
 * Note: Supabase typically handles OAuth callbacks directly and redirects to frontend
 * with tokens in the URL hash. This endpoint is optional and provides an alternative
 * server-side handling approach.
 */
router.post("/oauth/callback", async (req, res) => {
    const { code, provider } = req.body;
    if (!code || !provider) {
        return res.status(400).json({
            error: "Code and provider are required",
        });
    }
    if (provider !== "google" && provider !== "apple") {
        return res.status(400).json({
            error: "Invalid provider. Supported providers: google, apple",
        });
    }
    try {
        // Exchange code for session
        const { data, error } = await supabase_1.supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error("OAuth callback error:", error);
            return res.status(400).json({
                error: "Invalid or expired authorization code",
            });
        }
        if (!data.user || !data.session) {
            return res.status(400).json({
                error: "Failed to create session",
            });
        }
        // Get or create user profile
        const { data: profile } = await supabase_1.supabase
            .from("profiles")
            .select("role, display_name")
            .eq("id", data.user.id)
            .single();
        // If profile doesn't exist, create it (should be auto-created by trigger, but just in case)
        if (!profile) {
            await supabase_1.supabase.from("profiles").insert({
                id: data.user.id,
                display_name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "User",
                avatar_url: data.user.user_metadata?.avatar_url || null,
            });
        }
        return res.json({
            success: true,
            message: "OAuth authentication successful",
            user: {
                id: data.user.id,
                email: data.user.email,
                role: profile?.role || "user",
                display_name: profile?.display_name || data.user.user_metadata?.full_name,
            },
            token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: data.session.expires_at,
        });
    }
    catch (error) {
        console.error("Unexpected OAuth callback error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
/**
 * POST /auth/avatar/upload
 * Upload avatar image to Supabase Storage and update profile
 *
 * Accepts multipart/form-data with 'avatar' field
 */
router.post("/avatar/upload", auth_1.requireAuth, upload.single('avatar'), async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                error: "No file uploaded. Please provide an image file.",
            });
        }
        // Validate file type
        if (!file.mimetype.startsWith('image/')) {
            return res.status(400).json({
                error: "Invalid file type. Only image files are allowed.",
            });
        }
        // Generate unique filename
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase_1.supabase.storage
            .from('avatars') // Make sure this bucket exists in Supabase
            .upload(filePath, file.buffer, {
            contentType: file.mimetype,
            upsert: true, // Replace if exists
        });
        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            return res.status(500).json({
                error: "Failed to upload avatar",
            });
        }
        // Get public URL
        const { data: urlData } = supabase_1.supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
        const avatarUrl = urlData.publicUrl;
        // Update profile with new avatar URL
        const { data: profile, error: updateError } = await supabase_1.supabase
            .from("profiles")
            .update({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
        })
            .eq("id", userId)
            .select()
            .single();
        if (updateError) {
            console.error("Profile update error:", updateError);
            return res.status(500).json({
                error: "Failed to update profile",
            });
        }
        return res.json({
            success: true,
            message: "Avatar uploaded successfully",
            avatar_url: avatarUrl,
            profile,
        });
    }
    catch (error) {
        console.error("Unexpected avatar upload error:", error);
        if (error.message === 'Only image files are allowed') {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
/**
 * POST /auth/avatar/upload-url
 * Get presigned URL for direct frontend upload (alternative approach)
 *
 * Frontend can use this URL to upload directly to Supabase Storage
 * without going through the backend
 */
router.post("/avatar/upload-url", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { fileName, contentType } = req.body;
        if (!fileName || !contentType) {
            return res.status(400).json({
                error: "fileName and contentType are required",
            });
        }
        // Validate content type
        if (!contentType.startsWith('image/')) {
            return res.status(400).json({
                error: "Invalid content type. Only image files are allowed.",
            });
        }
        // Generate unique filename
        const fileExt = fileName.split('.').pop() || 'jpg';
        const uniqueFileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = `avatars/${uniqueFileName}`;
        // Create signed URL for upload (valid for 1 hour)
        const { data: signedUrlData, error: signedUrlError } = await supabase_1.supabase.storage
            .from('avatars')
            .createSignedUploadUrl(filePath, {
            upsert: true,
        });
        if (signedUrlError) {
            console.error("Signed URL error:", signedUrlError);
            return res.status(500).json({
                error: "Failed to generate upload URL",
            });
        }
        return res.json({
            success: true,
            upload_url: signedUrlData.signedUrl,
            path: filePath,
            // Frontend should upload to this URL, then call PUT /auth/profile with avatar_url
            // Or use POST /auth/avatar/confirm to update profile
        });
    }
    catch (error) {
        console.error("Unexpected upload URL error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
/**
 * POST /auth/avatar/confirm
 * Confirm avatar upload after frontend uploads directly using presigned URL
 *
 * Frontend uploads to presigned URL, then calls this to update profile
 */
router.post("/avatar/confirm", auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { path } = req.body;
        if (!path) {
            return res.status(400).json({
                error: "path is required",
            });
        }
        // Get public URL
        const { data: urlData } = supabase_1.supabase.storage
            .from('avatars')
            .getPublicUrl(path);
        const avatarUrl = urlData.publicUrl;
        // Update profile
        const { data: profile, error: updateError } = await supabase_1.supabase
            .from("profiles")
            .update({
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
        })
            .eq("id", userId)
            .select()
            .single();
        if (updateError) {
            console.error("Profile update error:", updateError);
            return res.status(500).json({
                error: "Failed to update profile",
            });
        }
        return res.json({
            success: true,
            message: "Avatar updated successfully",
            avatar_url: avatarUrl,
            profile,
        });
    }
    catch (error) {
        console.error("Unexpected avatar confirm error:", error);
        return res.status(500).json({
            error: "Internal server error",
        });
    }
});
exports.default = router;
