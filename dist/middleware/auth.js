"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireModerator = requireModerator;
exports.requireAdmin = requireAdmin;
const supabase_1 = require("../supabase");
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase_1.supabase.auth.getUser(token);
    if (error || !data.user) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
    // Fetch user profile to get role
    const { data: profile, error: profileError } = await supabase_1.supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
    req.user = {
        id: data.user.id,
        email: data.user.email,
        role: profile?.role || "user"
    };
    next();
}
// NEW: Require moderator or admin role
async function requireModerator(req, res, next) {
    await requireAuth(req, res, () => {
        if (!req.user?.role || !["moderator", "admin"].includes(req.user.role)) {
            return res.status(403).json({ error: "Moderator access required" });
        }
        next();
    });
}
// NEW: Require admin role
async function requireAdmin(req, res, next) {
    await requireAuth(req, res, () => {
        if (req.user?.role !== "admin") {
            return res.status(403).json({ error: "Admin access required" });
        }
        next();
    });
}
