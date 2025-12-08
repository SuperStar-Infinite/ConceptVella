// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { supabase } from "../supabase";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.replace("Bearer ", "");

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  // Fetch user profile to get role
  const { data: profile, error: profileError } = await supabase
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
export async function requireModerator(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  await requireAuth(req, res, () => {
    if (!req.user?.role || !["moderator", "admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Moderator access required" });
    }
    next();
  });
}

// NEW: Require admin role
export async function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  });
}