const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// GET /api/users/search?email=xxx
router.get('/search', authMiddleware, async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Email requis' });
    }

    // Recherche partielle (insensible à la casse)
    const users = await User.find({
      email: { $regex: email, $options: 'i' },
    })
      .select('firstName lastName email')
      .limit(10);

    res.json(users);
  } catch (error) {
    console.error('Erreur recherche utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// GET /api/users/me (profil de l'utilisateur connecté)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

module.exports = router;
