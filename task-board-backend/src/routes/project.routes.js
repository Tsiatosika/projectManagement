const express = require("express");
const Project = require("../models/Project");
const authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// GET /api/projects (tous les projets où l'utilisateur est membre)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.userId },
        { admins: req.userId },
        { teamMembers: req.userId },
      ],
    })
      .populate("owner", "firstName lastName email")
      .populate("admins", "firstName lastName email")
      .populate("teamMembers", "firstName lastName email");

    res.json(projects);
  } catch (error) {
    console.error("Erreur liste projets:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /api/projects/:id (détails d'un projet)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("owner", "firstName lastName email")
      .populate("admins", "firstName lastName email")
      .populate("teamMembers", "firstName lastName email");

    if (!project) {
      return res.status(404).json({ message: "Projet introuvable" });
    }

    // Vérifier que l'utilisateur est membre du projet
    const isMember =
      project.owner._id.toString() === req.userId ||
      project.admins.some((admin) => admin._id.toString() === req.userId) ||
      project.teamMembers.some((member) => member._id.toString() === req.userId);

    if (!isMember) {
      return res.status(403).json({ message: "Accès refusé" });
    }

    res.json(project);
  } catch (error) {
    console.error("Erreur détails projet:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /api/projects (créer un projet)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, description, status } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Le titre est requis" });
    }

    // L'utilisateur connecté devient owner et admin
    const project = await Project.create({
      title,
      description: description || "",
      status: status || "ACTIF",
      owner: req.userId,
      admins: [req.userId],
      teamMembers: [],
    });

    const populatedProject = await Project.findById(project._id)
      .populate("owner", "firstName lastName email")
      .populate("admins", "firstName lastName email");

    res.status(201).json({ message: "Projet créé", project: populatedProject });
  } catch (error) {
    console.error("Erreur création projet:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PATCH /api/projects/:id (modifier un projet)
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const { title, description, status } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Projet introuvable" });
    }

    // Vérifier que l'utilisateur est owner ou admin
    const isOwner = project.owner.toString() === req.userId;
    const isAdmin = project.admins.some((admin) => admin.toString() === req.userId);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Seuls le propriétaire et les admins peuvent modifier" });
    }

    // Mise à jour
    if (title) project.title = title;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate("owner", "firstName lastName email")
      .populate("admins", "firstName lastName email")
      .populate("teamMembers", "firstName lastName email");

    res.json({ message: "Projet mis à jour", project: updatedProject });
  } catch (error) {
    console.error("Erreur modification projet:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// DELETE /api/projects/:id (supprimer un projet - seulement owner)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Projet introuvable" });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (project.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "Seul le propriétaire peut supprimer le projet" });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({ message: "Projet supprimé" });
  } catch (error) {
    console.error("Erreur suppression projet:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /api/projects/:id/admins (ajouter un admin - seulement owner)
router.post("/:id/admins", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId requis" });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Projet introuvable" });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (project.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "Seul le propriétaire peut ajouter des admins" });
    }

    // Vérifier si déjà admin
    if (project.admins.includes(userId)) {
      return res.status(400).json({ message: "Cet utilisateur est déjà admin" });
    }

    project.admins.push(userId);
    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate("owner", "firstName lastName email")
      .populate("admins", "firstName lastName email")
      .populate("teamMembers", "firstName lastName email");

    res.json({ message: "Admin ajouté", project: updatedProject });
  } catch (error) {
    console.error("Erreur ajout admin:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// DELETE /api/projects/:id/admins/:userId (retirer un admin - seulement owner)
router.delete("/:id/admins/:userId", authMiddleware, async (req, res) => {
  try {
    const { id, userId } = req.params;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: "Projet introuvable" });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (project.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "Seul le propriétaire peut retirer des admins" });
    }

    // Ne pas retirer le propriétaire
    if (userId === project.owner.toString()) {
      return res.status(400).json({ message: "Impossible de retirer le propriétaire" });
    }

    // Retirer des admins
    project.admins = project.admins.filter((admin) => admin.toString() !== userId);

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate("owner", "firstName lastName email")
      .populate("admins", "firstName lastName email")
      .populate("teamMembers", "firstName lastName email");

    res.json({ message: "Admin retiré", project: updatedProject });
  } catch (error) {
    console.error("Erreur retrait admin:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /api/projects/:id/members (ajouter un membre - owner ou admin)
router.post("/:id/members", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId requis" });
    }

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Projet introuvable" });
    }

    // Vérifier que l'utilisateur est owner ou admin
    const isOwner = project.owner.toString() === req.userId;
    const isAdmin = project.admins.some((admin) => admin.toString() === req.userId);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Seuls le propriétaire et les admins peuvent ajouter des membres" });
    }

    // Vérifier si déjà membre
    if (project.teamMembers.includes(userId)) {
      return res.status(400).json({ message: "Cet utilisateur est déjà membre" });
    }

    project.teamMembers.push(userId);
    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate("owner", "firstName lastName email")
      .populate("admins", "firstName lastName email")
      .populate("teamMembers", "firstName lastName email");

    res.json({ message: "Membre ajouté", project: updatedProject });
  } catch (error) {
    console.error("Erreur ajout membre:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// DELETE /api/projects/:id/members/:userId (retirer un membre - owner ou admin)
router.delete("/:id/members/:userId", authMiddleware, async (req, res) => {
  try {
    const { id, userId } = req.params;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ message: "Projet introuvable" });
    }

    // Vérifier que l'utilisateur est owner ou admin
    const isOwner = project.owner.toString() === req.userId;
    const isAdmin = project.admins.some((admin) => admin.toString() === req.userId);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Seuls le propriétaire et les admins peuvent retirer des membres" });
    }

    // Ne pas retirer le propriétaire
    if (userId === project.owner.toString()) {
      return res.status(400).json({ message: "Impossible de retirer le propriétaire du projet" });
    }

    // Retirer des admins ET des membres
    project.admins = project.admins.filter((admin) => admin.toString() !== userId);
    project.teamMembers = project.teamMembers.filter((member) => member.toString() !== userId);

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate("owner", "firstName lastName email")
      .populate("admins", "firstName lastName email")
      .populate("teamMembers", "firstName lastName email");

    res.json({ message: "Membre retiré", project: updatedProject });
  } catch (error) {
    console.error("Erreur retrait membre:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;
