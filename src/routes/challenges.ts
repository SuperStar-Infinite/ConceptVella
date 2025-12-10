// src/routes/challenges.ts
import { Router } from "express";
import { supabase } from "../supabase";
import { requireAuth, requireAdmin, AuthRequest } from "../middleware/auth";

const router = Router();

/**
 * GET /challenges
 * List active challenges (optionally filter by region)
 */
router.get("/", async (req, res) => {
  const region = req.query.region as string | undefined;

  let query = supabase
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
router.post("/:id/join", requireAuth, async (req: AuthRequest, res) => {
  const challengeId = req.params.id;
  const userId = req.user!.id;

  // Check challenge exists and is active
  const { data: challenge, error: challengeError } = await supabase
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
  const { data: existing, error: progressError } = await supabase
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
  const { data: inserted, error: insertError } = await supabase
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

/**
 * GET /challenges/:id
 * Get single challenge with checkpoints
 */
router.get("/:id", async (req, res) => {
  const challengeId = req.params.id;

  // Get challenge
  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .single();

  if (challengeError || !challenge) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  // Get checkpoints
  const { data: checkpoints, error: checkpointsError } = await supabase
    .from("challenge_checkpoints")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("order_index", { ascending: true });

  if (checkpointsError) {
    console.error("Error fetching checkpoints:", checkpointsError);
    // Return challenge without checkpoints if error
    return res.json({
      ...challenge,
      checkpoints: [],
    });
  }

  return res.json({
    ...challenge,
    checkpoints: checkpoints || [],
  });
});

/**
 * POST /challenges
 * Create new challenge (admin only)
 */
router.post("/", requireAdmin, async (req: AuthRequest, res) => {
  const {
    title,
    description,
    type = "vella",
    difficulty,
    region_code,
    status = "draft",
    starts_at,
    ends_at,
    checkpoints = [],
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  // Validate type
  if (!["vella", "smc", "sponsor"].includes(type)) {
    return res.status(400).json({ error: "Invalid challenge type" });
  }

  // Validate status
  if (!["draft", "active", "archived"].includes(status)) {
    return res.status(400).json({ error: "Invalid challenge status" });
  }

  try {
    // Create challenge
    const { data: challenge, error: challengeError } = await supabase
      .from("challenges")
      .insert({
        title,
        description,
        type,
        difficulty,
        region_code,
        status,
        starts_at,
        ends_at,
        creator_user_id: req.user!.id,
      })
      .select()
      .single();

    if (challengeError) {
      console.error("Error creating challenge:", challengeError);
      return res.status(500).json({ error: "Failed to create challenge" });
    }

    // Create checkpoints if provided
    if (checkpoints && checkpoints.length > 0) {
      const checkpointsToInsert = checkpoints.map((cp: any, index: number) => ({
        challenge_id: challenge.id,
        poi_id: cp.poi_id || null,
        requirement_type: cp.requirement_type || "visit",
        requirement_value: cp.requirement_value || null,
        order_index: cp.order_index !== undefined ? cp.order_index : index + 1,
      }));

      const { error: checkpointsError } = await supabase
        .from("challenge_checkpoints")
        .insert(checkpointsToInsert);

      if (checkpointsError) {
        console.error("Error creating checkpoints:", checkpointsError);
        // Challenge created but checkpoints failed - return challenge anyway
      }
    }

    // Fetch challenge with checkpoints
    const { data: challengeWithCheckpoints } = await supabase
      .from("challenge_checkpoints")
      .select("*")
      .eq("challenge_id", challenge.id)
      .order("order_index", { ascending: true });

    return res.status(201).json({
      ...challenge,
      checkpoints: challengeWithCheckpoints || [],
    });
  } catch (error: any) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /challenges/:id
 * Update challenge (admin only)
 */
router.put("/:id", requireAdmin, async (req: AuthRequest, res) => {
  const challengeId = req.params.id;
  const {
    title,
    description,
    type,
    difficulty,
    region_code,
    status,
    starts_at,
    ends_at,
  } = req.body;

  // Check challenge exists
  const { data: existing, error: checkError } = await supabase
    .from("challenges")
    .select("id")
    .eq("id", challengeId)
    .single();

  if (checkError || !existing) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  // Build update object
  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (type !== undefined) {
    if (!["vella", "smc", "sponsor"].includes(type)) {
      return res.status(400).json({ error: "Invalid challenge type" });
    }
    updates.type = type;
  }
  if (difficulty !== undefined) updates.difficulty = difficulty;
  if (region_code !== undefined) updates.region_code = region_code;
  if (status !== undefined) {
    if (!["draft", "active", "archived"].includes(status)) {
      return res.status(400).json({ error: "Invalid challenge status" });
    }
    updates.status = status;
  }
  if (starts_at !== undefined) updates.starts_at = starts_at;
  if (ends_at !== undefined) updates.ends_at = ends_at;
  updates.updated_at = new Date().toISOString();

  const { data: challenge, error: updateError } = await supabase
    .from("challenges")
    .update(updates)
    .eq("id", challengeId)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating challenge:", updateError);
    return res.status(500).json({ error: "Failed to update challenge" });
  }

  // Get checkpoints
  const { data: checkpoints } = await supabase
    .from("challenge_checkpoints")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("order_index", { ascending: true });

  return res.json({
    ...challenge,
    checkpoints: checkpoints || [],
  });
});

/**
 * DELETE /challenges/:id
 * Delete challenge (admin only)
 */
router.delete("/:id", requireAdmin, async (req: AuthRequest, res) => {
  const challengeId = req.params.id;

  // Check challenge exists
  const { data: existing, error: checkError } = await supabase
    .from("challenges")
    .select("id")
    .eq("id", challengeId)
    .single();

  if (checkError || !existing) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  // Delete challenge (checkpoints will be deleted via CASCADE)
  const { error: deleteError } = await supabase
    .from("challenges")
    .delete()
    .eq("id", challengeId);

  if (deleteError) {
    console.error("Error deleting challenge:", deleteError);
    return res.status(500).json({ error: "Failed to delete challenge" });
  }

  return res.json({
    success: true,
    message: "Challenge deleted successfully",
  });
});

/**
 * GET /challenges/:id/progress
 * Get current user's progress on a challenge
 */
router.get("/:id/progress", requireAuth, async (req: AuthRequest, res) => {
  const challengeId = req.params.id;
  const userId = req.user!.id;

  const { data: progress, error } = await supabase
    .from("user_challenge_progress")
    .select("*")
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching progress:", error);
    return res.status(500).json({ error: "Failed to fetch progress" });
  }

  if (!progress) {
    return res.status(404).json({ error: "Progress not found. Join the challenge first." });
  }

  return res.json(progress);
});

/**
 * PUT /challenges/:id/progress
 * Update user's challenge progress
 */
router.put("/:id/progress", requireAuth, async (req: AuthRequest, res) => {
  const challengeId = req.params.id;
  const userId = req.user!.id;
  const { status, progress_data } = req.body;

  // Check progress exists
  const { data: existing, error: checkError } = await supabase
    .from("user_challenge_progress")
    .select("*")
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking progress:", checkError);
    return res.status(500).json({ error: "Failed to check progress" });
  }

  if (!existing) {
    return res.status(404).json({ error: "Progress not found. Join the challenge first." });
  }

  // Build update object
  const updates: any = {};
  if (status !== undefined) {
    if (!["not_started", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    updates.status = status;
    
    // Set completed_at if status is completed
    if (status === "completed" && !existing.completed_at) {
      updates.completed_at = new Date().toISOString();
    }
  }
  if (progress_data !== undefined) {
    updates.progress_data = progress_data;
  }
  updates.updated_at = new Date().toISOString();

  const { data: progress, error: updateError } = await supabase
    .from("user_challenge_progress")
    .update(updates)
    .eq("id", existing.id)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating progress:", updateError);
    return res.status(500).json({ error: "Failed to update progress" });
  }

  return res.json(progress);
});

/**
 * POST /challenges/:id/checkpoints
 * Add checkpoint to challenge (admin only)
 */
router.post("/:id/checkpoints", requireAdmin, async (req: AuthRequest, res) => {
  const challengeId = req.params.id;
  const { poi_id, requirement_type = "visit", requirement_value, order_index } = req.body;

  // Check challenge exists
  const { data: challenge, error: checkError } = await supabase
    .from("challenges")
    .select("id")
    .eq("id", challengeId)
    .single();

  if (checkError || !challenge) {
    return res.status(404).json({ error: "Challenge not found" });
  }

  // Get max order_index if not provided
  let finalOrderIndex = order_index;
  if (finalOrderIndex === undefined) {
    const { data: existingCheckpoints } = await supabase
      .from("challenge_checkpoints")
      .select("order_index")
      .eq("challenge_id", challengeId)
      .order("order_index", { ascending: false })
      .limit(1);

    finalOrderIndex = existingCheckpoints && existingCheckpoints.length > 0
      ? existingCheckpoints[0].order_index + 1
      : 1;
  }

  const { data: checkpoint, error: insertError } = await supabase
    .from("challenge_checkpoints")
    .insert({
      challenge_id: challengeId,
      poi_id: poi_id || null,
      requirement_type,
      requirement_value: requirement_value || null,
      order_index: finalOrderIndex,
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error creating checkpoint:", insertError);
    return res.status(500).json({ error: "Failed to create checkpoint" });
  }

  return res.status(201).json(checkpoint);
});

/**
 * PUT /challenges/:id/checkpoints/:checkpointId
 * Update checkpoint (admin only)
 */
router.put("/:id/checkpoints/:checkpointId", requireAdmin, async (req: AuthRequest, res) => {
  const { checkpointId } = req.params;
  const { poi_id, requirement_type, requirement_value, order_index } = req.body;

  // Check checkpoint exists
  const { data: existing, error: checkError } = await supabase
    .from("challenge_checkpoints")
    .select("*")
    .eq("id", checkpointId)
    .single();

  if (checkError || !existing) {
    return res.status(404).json({ error: "Checkpoint not found" });
  }

  // Build update object
  const updates: any = {};
  if (poi_id !== undefined) updates.poi_id = poi_id;
  if (requirement_type !== undefined) updates.requirement_type = requirement_type;
  if (requirement_value !== undefined) updates.requirement_value = requirement_value;
  if (order_index !== undefined) updates.order_index = order_index;

  const { data: checkpoint, error: updateError } = await supabase
    .from("challenge_checkpoints")
    .update(updates)
    .eq("id", checkpointId)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating checkpoint:", updateError);
    return res.status(500).json({ error: "Failed to update checkpoint" });
  }

  return res.json(checkpoint);
});

/**
 * DELETE /challenges/:id/checkpoints/:checkpointId
 * Delete checkpoint (admin only)
 */
router.delete("/:id/checkpoints/:checkpointId", requireAdmin, async (req: AuthRequest, res) => {
  const { checkpointId } = req.params;

  // Check checkpoint exists
  const { data: existing, error: checkError } = await supabase
    .from("challenge_checkpoints")
    .select("id")
    .eq("id", checkpointId)
    .single();

  if (checkError || !existing) {
    return res.status(404).json({ error: "Checkpoint not found" });
  }

  const { error: deleteError } = await supabase
    .from("challenge_checkpoints")
    .delete()
    .eq("id", checkpointId);

  if (deleteError) {
    console.error("Error deleting checkpoint:", deleteError);
    return res.status(500).json({ error: "Failed to delete checkpoint" });
  }

  return res.json({
    success: true,
    message: "Checkpoint deleted successfully",
  });
});

export default router;