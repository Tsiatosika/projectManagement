require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const projectRoutes = require("./routes/project.routes");
const ticketRoutes = require("./routes/ticket.routes");
const commentRoutes = require("./routes/comment.routes");
const userRoutes = require('./routes/user.routes');


const app = express();

// Connexion à MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());

// Route de test
app.get("/", (req, res) => {
  res.json({ message: "API Trello-like OK" });
});

// Démarrage du serveur
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/comments", commentRoutes);
app.use('/api/users', userRoutes);
