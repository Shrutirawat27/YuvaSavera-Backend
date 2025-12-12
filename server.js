require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Import routes
const authRoutes = require("./routes/authRoutes");
const requestRoutes = require("./routes/requestRoutes");
const adminRoutes = require("./routes/adminRoutes");
const publicRoutes = require("./routes/public");
const reportRoutes = require("./routes/reportRoutes");
const volunteerRoutes = require("./routes/volunteerRoutes");
const storyRoutes = require("./routes/storyRoutes");
const moderatorRoutes = require("./routes/moderatorRoutes");
const districtLeadRoutes = require("./routes/districtLeadRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const partnerRoutes = require("./routes/partner.routes");

const { errorHandler } = require("./middleware/errorMiddleware");

// Import database connection
const connectDB = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());

// CORS Setup
const allowedOrigins = [
  "http://localhost:5173",            
  "https://yuva-savera.vercel.app",
  "https://yuva-saveraaa.vercel.app",
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed for this origin"));
    }
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
}));

// Handle preflight requests
app.options("*", cors());

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests, please try again later.",
});
app.use("/api/", limiter);

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/volunteer", volunteerRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/moderator", moderatorRoutes);
app.use("/api/admin/district", districtLeadRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/stats", require("./routes/stats.routes"));
app.use("/api/partners", partnerRoutes);

// --- Health Check ---
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Yuva Savera API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Default route
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Yuva Savera API",
    version: "1.0.0",
    docs: "/api/docs",
  });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});