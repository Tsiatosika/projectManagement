const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI n'est pas défini dans le fichier .env");
    }

    await mongoose.connect(uri, {
      // options possibles si besoin
    });

    console.log("✅ MongoDB connecté");
  } catch (error) {
    console.error("❌ Erreur de connexion MongoDB :", error.message);
    process.exit(1); // stoppe l'app si la DB ne se connecte pas
  }
};

module.exports = connectDB;
