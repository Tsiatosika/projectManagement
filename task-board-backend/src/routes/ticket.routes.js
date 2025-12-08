const express = require("express");
const Ticket = require("../models/Ticket");
const Project = require("../models/Project");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// Middleware pour vérifier si l'utilisateur est membre du projet
const checkProjectMember = async (req, res, next) => {
  try {
    const projectId = req.body.project || req.projectId;

    if (!projectId) {
      return res.status(400).json({ message: "project requis" });
    }

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Projet introuvable" });
    }

    // Vérifier que l'utilisateur est membre
    const isMember =
      project.owner.toString() === req.userId ||
      project.admins.some((admin) => admin.toString() === req.userId) ||
      project.teamMembers.some((member) => member.toString() === req.userId);

    if (!isMember) {
      return res.status(403).json({ message: "Vous n'êtes pas membre de ce projet" });
    }

    req.project = project;
    next();
  } catch (error) {
    console.error("Erreur vérification membre:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// GET /api/tickets/project/:projectId (tous les tickets d'un projet)
router.get("/project/:projectId", authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Vérifier que l'utilisateur est membre du projet
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ message: "Projet introuvable" });
    }

    const isMember =
      project.owner.toString() === req.userId ||
      project.admins.some((admin) => admin.toString() === req.userId) ||
      project.teamMembers.some((member) => member.toString() === req.userId);

    if (!isMember) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    const tickets = await Ticket.find({ project: projectId })
      .populate("assignees", "firstName lastName email")
      .populate("createdBy", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    console.error("Erreur liste tickets:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /api/tickets/:id (détails d'un ticket)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("project")
      .populate("assignees", "firstName lastName email")
      .populate("createdBy", "firstName lastName email");

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

    res.json(ticket);
  } catch (error) {
    console.error("Erreur détails ticket:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /api/tickets (créer un ticket)
router.post("/", authMiddleware, checkProjectMember, async (req, res) => {
  try {
    const { project, title, description, estimationDate, assignees } = req.body;

    if (!title || !estimationDate) {
      return res.status(400).json({ message: "title et estimationDate requis" });
    }

    const ticket = await Ticket.create({
      project,
      title,
      description: description || "",
      estimationDate,
      assignees: assignees || [],
      createdBy: req.userId,
    });

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate("assignees", "firstName lastName email")
      .populate("createdBy", "firstName lastName email");

    res.status(201).json({ message: "Ticket créé", ticket: populatedTicket });
  } catch (error) {
    console.error("Erreur création ticket:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PATCH /api/tickets/:id (mettre à jour un ticket)
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const { title, description, status, estimationDate, assignees } = req.body;

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket introuvable" });
    }

    // Vérifier que l'utilisateur est membre du projet
    const project = await Project.findById(ticket.project);
    const isMember =
      project.owner.toString() === req.userId ||
      project.admins.some((admin) => admin.toString() === req.userId) ||
      project.teamMembers.some((member) => member.toString() === req.userId);

    if (!isMember) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    // Mise à jour
    if (title) ticket.title = title;
    if (description !== undefined) ticket.description = description;
    if (status) ticket.status = status;
    if (estimationDate) ticket.estimationDate = estimationDate;
    if (assignees) ticket.assignees = assignees;

    await ticket.save();

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate("assignees", "firstName lastName email")
      .populate("createdBy", "firstName lastName email");

    res.json({ message: "Ticket mis à jour", ticket: updatedTicket });
  } catch (error) {
    console.error("Erreur modification ticket:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// DELETE /api/tickets/:id (supprimer un ticket - seulement createdBy)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket introuvable" });
    }

    // Vérifier que l'utilisateur est le créateur
    if (ticket.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: "Seul le créateur peut supprimer ce ticket" });
    }

    await Ticket.findByIdAndDelete(req.params.id);

    res.json({ message: "Ticket supprimé" });
  } catch (error) {
    console.error("Erreur suppression ticket:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
