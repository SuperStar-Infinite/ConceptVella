"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const health_1 = __importDefault(require("./routes/health"));
const challenges_1 = __importDefault(require("./routes/challenges"));
const admin_1 = __importDefault(require("./routes/admin"));
const auth_1 = __importDefault(require("./routes/auth"));
const map_1 = __importDefault(require("./routes/map"));
const journey_1 = __importDefault(require("./routes/journey"));
const app = (0, express_1.default)();
// CORS configuration for production
const corsOptions = {
    origin: [
        // 'http://localhost:3000',
        'http://localhost:8080',
        'https://conceptvella.vercel.app',
        'https://www.conceptvella.com',
    ],
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
app.use("/health", health_1.default);
app.use("/auth", auth_1.default);
app.use("/challenges", challenges_1.default);
app.use("/admin", admin_1.default);
app.use("/map", map_1.default);
app.use("/journey", journey_1.default);
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`API server listening on port ${PORT}`);
});
