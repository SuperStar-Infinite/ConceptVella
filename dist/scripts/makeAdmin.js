"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/scripts/makeAdmin.ts
// Quick script to set a user as admin for testing
require("dotenv/config");
const supabase_1 = require("../supabase");
async function makeUserAdmin(email) {
    try {
        // Find user by email
        const { data: users, error: listError } = await supabase_1.supabase.auth.admin.listUsers();
        if (listError) {
            console.error("Error listing users:", listError);
            return;
        }
        const user = users.users.find((u) => u.email === email);
        if (!user) {
            console.error(`User with email ${email} not found.`);
            console.log("\nAvailable users:");
            users.users.forEach((u) => console.log(`  - ${u.email} (${u.id})`));
            return;
        }
        // Update profile role to admin
        const { data, error } = await supabase_1.supabase
            .from("profiles")
            .update({ role: "admin" })
            .eq("id", user.id)
            .select()
            .single();
        if (error) {
            console.error("Error updating role:", error);
            return;
        }
        console.log("✅ Success! User is now admin:");
        console.log(data);
    }
    catch (error) {
        console.error("Unexpected error:", error);
    }
}
// Get email from command line argument
const email = process.argv[2];
if (!email) {
    console.error("Usage: npm run make-admin <email>");
    process.exit(1);
}
makeUserAdmin(email);
