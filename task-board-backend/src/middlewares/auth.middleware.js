const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    // Récupérer le token depuis le header Authorization
    const token = req.headers.authorization?.split(" ")[1]; // "Bearer TOKEN"

    if (!token) {
      return res.status(401).json({ message: "Token manquant" });
    }

    // Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    
    // Ajouter l'userId dans req pour les routes suivantes
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

module.exports = authMiddleware;
