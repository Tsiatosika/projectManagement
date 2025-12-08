const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password } = req.body;

    // 1) Vérifier les champs obligatoires
    if (!firstName || !lastName || !phone || !email || !password) {
      return res.status(400).json({ message: "Tous les champs sont obligatoires" });
    }

    // 2) Vérifier si l'email existe déjà
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email déjà utilisé" });
    }

    // 3) Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4) Créer l'utilisateur
    const user = await User.create({
      firstName,
      lastName,
      phone,
      email,
      passwordHash,
    });

    // 5) Générer un token JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "devsecret",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      },
      token,
    });
  } catch (error) {
    console.error("Erreur register:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    // 1) Trouver l'utilisateur
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // 2) Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // 3) Générer le token JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || "devsecret",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Connexion réussie",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      },
      token,
    });
  } catch (error) {
    console.error("Erreur login:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
