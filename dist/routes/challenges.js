"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/challenges.ts
const express_1 = require("express");
const supabase_1 = require("../supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * GET /challenges
 * List active challenges (optionally filter by region)
 */
router.get("/", async (req, res) => {
    const region = req.query.region;
    let query = supabase_1.supabase
        .from("challenges")
        .select("*")
        .eq("status", "active");
    if (region) {
        query = query.eq("region_code", region);
    }
    const { data, error } = await query;
    if (error) {
        console.error("Error fetching challenges:", error);
        return res.status(500).json({ error: "Failed to fetch challenges" });
    }
    return res.json(data);
});
/**
 * POST /challenges/:id/join
 * User joins a challenge → create or update user_challenge_progress
 */
router.post("/:id/join", auth_1.requireAuth, async (req, res) => {
    const challengeId = req.params.id;
    const userId = req.user.id;
    // Check challenge exists and is active
    const { data: challenge, error: challengeError } = await supabase_1.supabase
        .from("challenges")
        .select("id, status")
        .eq("id", challengeId)
        .single();
    if (challengeError || !challenge) {
        return res.status(404).json({ error: "Challenge not found" });
    }
    if (challenge.status !== "active") {
        return res.status(400).json({ error: "Challenge is not active" });
    }
    // Check if progress already exists
    const { data: existing, error: progressError } = await supabase_1.supabase
        .from("user_challenge_progress")
        .select("*")
        .eq("challenge_id", challengeId)
        .eq("user_id", userId)
        .maybeSingle();
    if (progressError) {
        console.error("Error checking progress:", progressError);
        return res.status(500).json({ error: "Failed to check challenge progress" });
    }
    if (existing) {
        // If already exists, just return it
        return res.json(existing);
    }
    // Create a new progress row
    const { data: inserted, error: insertError } = await supabase_1.supabase
        .from("user_challenge_progress")
        .insert({
        challenge_id: challengeId,
        user_id: userId,
        status: "in_progress",
        started_at: new Date().toISOString()
    })
        .select()
        .single();
    if (insertError) {
        console.error("Error creating challenge progress:", insertError);
        return res.status(500).json({ error: "Failed to join challenge" });
    }
    return res.status(201).json(inserted);
});
exports.default = router;
