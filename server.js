require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const connectDB = require("./config/db");
const indexRouter = require("./router/index");
const { initSocket } = require("./utils/Socket.io/index");

const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
// app.use(cors());

app.use(
  cors({
    origin: ["http://localhost:5173", "https://chat-vibe-talk.vercel.app"],
    credentials: true,
  })
);

// API Routes
app.use("/api", indexRouter);

// ADD THIS - 404 handler for API routes
// app.use("/api/*", (req, res) => {
//   res.status(404).json({
//     error: "API endpoint not found",
//     path: req.originalUrl,
//   });
// });

// HTTP Server
const server = http.createServer(app);

connectDB().then(() => {
  initSocket(server); // Init socket after DB connected

  const PORT = process.env.PORT || 8000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on PORT ${PORT}`);
  });
});
