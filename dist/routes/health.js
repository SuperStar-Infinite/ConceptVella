"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/health.ts
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get("/", (_req, res) => {
    res.json({ status: "ok" });
});
exports.default = router;
