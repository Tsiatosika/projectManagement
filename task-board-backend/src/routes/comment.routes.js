const express = require("express");
const Comment = require("../models/Comment");
const Ticket = require("../models/Ticket");
const Project = require("../models/Project");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// GET /api/comments/ticket/:ticketId (tous les commentaires d'un ticket)
router.get("/ticket/:ticketId", authMiddleware, async (req, res) => {
  try {
    const { ticketId } = req.params;

    // Vérifier que le ticket existe
    const ticket = await Ticket.findById(ticketId).populate("project");

    if (!ticket) {
      return res.status(404).json({ message: "Ticket introuvable" });
    }

    // Vérifier que l'utilisateur est membre du projet
    const project = await Project.findById(ticket.project._id);
    const isMember =
      project.owner.toString() === req.userId ||
      project.admins.some((admin) => admin.toString() === req.userId) ||
      project.teamMembers.some((member) => member.toString() === req.userId);

    if (!isMember) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const comments = await Comment.find({ ticket: ticketId })
      .populate("author", "firstName lastName email")
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (error) {
    console.error("Erreur liste commentaires:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /api/comments (créer un commentaire)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { ticket, content } = req.body;

    if (!ticket || !content) {
      return res.status(400).json({ message: "ticket et content requis" });
    }

    // Vérifier que le ticket existe
    const ticketDoc = await Ticket.findById(ticket).populate("project");

    if (!ticketDoc) {
      return res.status(404).json({ message: "Ticket introuvable" });
    }

    // Vérifier que l'utilisateur est membre du projet
    const project = await Project.findById(ticketDoc.project._id);
    const isMember =
      project.owner.toString() === req.userId ||
      project.admins.some((admin) => admin.toString() === req.userId) ||
      project.teamMembers.some((member) => member.toString() === req.userId);

    if (!isMember) {
      return res.status(403).json({ message: "Vous n'êtes pas membre de ce projet" });
    }

    const comment = await Comment.create({
      ticket,
      author: req.userId,
      content,
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      "author",
      "firstName lastName email"
    );

    res.status(201).json({ message: "Commentaire créé", comment: populatedComment });
  } catch (error) {
    console.error("Erreur création commentaire:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PATCH /api/comments/:id (modifier un commentaire - seulement author)
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "content requis" });
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: "Commentaire introuvable" });
    }

    // Vérifier que l'utilisateur est l'auteur
    if (comment.author.toString() !== req.userId) {
      return res.status(403).json({ message: "Seul l'auteur peut modifier ce commentaire" });
    }

    comment.content = content;
    await comment.save();

    const updatedComment = await Comment.findById(comment._id).populate(
      "author",
      "firstName lastName email"
    );

    res.json({ message: "Commentaire mis à jour", comment: updatedComment });
  } catch (error) {
    console.error("Erreur modification commentaire:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// DELETE /api/comments/:id (supprimer un commentaire - seulement author)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ message: "Commentaire introuvable" });
    }

    // Vérifier que l'utilisateur est l'auteur
    if (comment.author.toString() !== req.userId) {
      return res.status(403).json({ message: "Seul l'auteur peut supprimer ce commentaire" });
    }

    await Comment.findByIdAndDelete(req.params.id);

    res.json({ message: "Commentaire supprimé" });
  } catch (error) {
    console.error("Erreur suppression commentaire:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
