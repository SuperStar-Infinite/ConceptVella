// src/routes/auth.ts
import { Router } from "express";
import { supabase } from "../supabase";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

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
    const { data, error } = await supabase.auth.signInWithPassword({
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
    const { data: profile } = await supabase
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
  } catch (error: any) {
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
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const { data: profile, error } = await supabase
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
        email: req.user!.email,
        role: req.user!.role,
        profile,
      },
    });
  } catch (error: any) {
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
  const { 
    email, 
    password, 
    username,
    display_name,
    bio,
    location,
    vehicle_type,
    avatar_url
  } = req.body;

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
    const { data: existingUser } = await supabase
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
    const { data, error } = await supabase.auth.signUp({
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
    const profileUpdates: any = {};
    if (username) profileUpdates.username = username;
    if (display_name) profileUpdates.display_name = display_name;
    if (bio !== undefined) profileUpdates.bio = bio;
    if (location !== undefined) profileUpdates.location = location;
    if (vehicle_type !== undefined) profileUpdates.vehicle_type = vehicle_type;
    if (avatar_url !== undefined) profileUpdates.avatar_url = avatar_url;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdates)
        .eq("id", data.user.id);

      if (profileError) {
        console.error("Error updating profile during registration:", profileError);
        // Don't fail registration if profile update fails, just log it
      }
    }

    // Get the updated profile
    const { data: profile } = await supabase
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
  } catch (error: any) {
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
router.post("/logout", requireAuth, async (req: AuthRequest, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace("Bearer ", "");

    if (token) {
      // Sign out the user's session
      await supabase.auth.admin.signOut(token);
    }

    return res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error: any) {
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
router.get("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get profile
    const { data: profile, error } = await supabase
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
    const { count: postsCount } = await supabase
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
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /auth/profile
 * Update user profile
 */
router.put("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { username, display_name, bio, location, vehicle_type, avatar_url } = req.body;

    // Check if username is being updated and if it's already taken
    if (username !== undefined && username !== null && username !== "") {
      // Check if username is already taken by another user
      const { data: existingUser, error: checkError } = await supabase
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

    const updates: any = {};
    if (username !== undefined) updates.username = username || null;
    if (display_name !== undefined) updates.display_name = display_name;
    if (bio !== undefined) updates.bio = bio;
    if (location !== undefined) updates.location = location;
    if (vehicle_type !== undefined) updates.vehicle_type = vehicle_type;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    updates.updated_at = new Date().toISOString();

    const { data: profile, error } = await supabase
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
    const { count: postsCount } = await supabase
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
  } catch (error: any) {
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
    // Get frontend URL from environment or use production URL
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.conceptvella.com';
    const redirectUrl = `${frontendUrl}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
  } catch (error: any) {
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
    const { createClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.SUPABASE_URL!;
    
    // Use the token to create an authenticated client
    const resetClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
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
  } catch (error: any) {
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
    const { data, error } = await supabase
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
  } catch (error: any) {
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
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, location, vehicle_type, avatar_url, created_at")
      .eq("username", username)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Calculate stats
    const { count: postsCount } = await supabase
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
  } catch (error: any) {
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
    const { data, error } = await supabase.auth.verifyOtp({
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
  } catch (error: any) {
    console.error("Unexpected verify code error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

export default router;

