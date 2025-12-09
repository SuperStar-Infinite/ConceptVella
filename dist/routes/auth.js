"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.ts
const express_1 = require("express");
const supabase_1 = require("../supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
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
 */
router.post("/register", async (req, res) => {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            error: "Email and password are required",
        });
    }
    try {
        const { data, error } = await supabase_1.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName || email.split("@")[0],
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
        return res.json({
            success: true,
            message: "Registration successful",
            user: {
                id: data.user.id,
                email: data.user.email,
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
 * Get user profile
 */
router.get("/profile", auth_1.requireAuth, async (req, res) => {
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
            profile,
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
        const { display_name, bio, avatar_url } = req.body;
        const updates = {};
        if (display_name !== undefined)
            updates.display_name = display_name;
        if (bio !== undefined)
            updates.bio = bio;
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
            return res.status(500).json({ error: "Failed to update profile" });
        }
        return res.json({
            success: true,
            message: "Profile updated successfully",
            profile,
        });
    }
    catch (error) {
        console.error("Unexpected error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
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
        const { error } = await supabase_1.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.FRONTEND_URL || 'https://www.conceptvella.com'}/reset-password`,
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
 * Reset password with token
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
        // Verify the token and update password
        const { data, error } = await supabase_1.supabase.auth.updateUser({
            password: password,
        });
        if (error) {
            console.error("Reset password error:", error);
            return res.status(400).json({
                error: "Invalid or expired reset token",
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
exports.default = router;
