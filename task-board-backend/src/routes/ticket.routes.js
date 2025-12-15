const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const Project = require('../models/Project');
const authMiddleware = require('../middlewares/auth.middleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Créer un ticket
router.post('/', async (req, res) => {
  try {
    const { title, description, estimationDate, projectId, assignees, labels } = req.body;
    const userId = req.userId;

    console.log('Create ticket request:', { title, projectId, userId });

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    // Vérifier que le projet existe et que l'utilisateur y a accès
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    const isMember = project.members.some((member) => {
      const memberId = member.user?._id || member.user;
      return memberId && memberId.toString() === userId.toString();
    });

    if (!isMember) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const ticket = new Ticket({
      title,
      description,
      estimationDate,
      project: projectId,
      createdBy: userId,
      assignees: assignees || [],
      labels: labels || [],
    });

    await ticket.save();

    // Populate toutes les références
    await ticket.populate([
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'assignees', select: 'firstName lastName email' },
      { path: 'labels' },
    ]);

    console.log('Ticket created successfully:', ticket._id);
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Erreur création ticket:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
});

// Récupérer les tickets d'un projet
router.get('/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    console.log('Get tickets request:', { projectId, userId });

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    // Vérifier que le projet existe et que l'utilisateur y a accès
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    const isMember = project.members.some((member) => {
      const memberId = member.user?._id || member.user;
      return memberId && memberId.toString() === userId.toString();
    });

    if (!isMember) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const tickets = await Ticket.find({ project: projectId })
      .populate('createdBy', 'firstName lastName email')
      .populate('assignees', 'firstName lastName email')
      .populate('labels')
      .sort({ createdAt: -1 });

    console.log('Tickets found:', tickets.length);
    res.json(tickets);
  } catch (error) {
    console.error('Erreur liste tickets:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
});

// Récupérer un ticket par ID
router.get('/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.userId;

    console.log('Get ticket by ID request:', { ticketId, userId });

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const ticket = await Ticket.findById(ticketId)
      .populate('createdBy', 'firstName lastName email')
      .populate('assignees', 'firstName lastName email')
      .populate('project', 'title description')
      .populate('labels');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket non trouvé' });
    }

    // Vérifier que l'utilisateur est membre du projet
    const project = await Project.findById(ticket.project._id);
    const isMember = project.members.some((member) => {
      const memberId = member.user?._id || member.user;
      return memberId && memberId.toString() === userId.toString();
    });

    if (!isMember) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Erreur récupération ticket:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
});

// Mettre à jour un ticket
router.put('/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { title, description, estimationDate, status, assignees, labels } = req.body;
    const userId = req.userId;

    console.log('Update ticket request:', { ticketId, userId });

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket non trouvé' });
    }

    // Vérifier que l'utilisateur est membre du projet
    const project = await Project.findById(ticket.project);
    const isMember = project.members.some((member) => {
      const memberId = member.user?._id || member.user;
      return memberId && memberId.toString() === userId.toString();
    });

    if (!isMember) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Mettre à jour les champs
    if (title !== undefined) ticket.title = title;
    if (description !== undefined) ticket.description = description;
    if (estimationDate !== undefined) ticket.estimationDate = estimationDate;
    if (status !== undefined) ticket.status = status;
    if (assignees !== undefined) ticket.assignees = assignees;
    if (labels !== undefined) ticket.labels = labels;

    await ticket.save();

    // Populate toutes les références
    await ticket.populate([
      { path: 'createdBy', select: 'firstName lastName email' },
      { path: 'assignees', select: 'firstName lastName email' },
      { path: 'project', select: 'title' },
      { path: 'labels' },
    ]);

    console.log('Ticket updated successfully');
    res.json(ticket);
  } catch (error) {
    console.error('Erreur mise à jour ticket:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
});

// Supprimer un ticket
router.delete('/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.userId;

    console.log('Delete ticket request:', { ticketId, userId });

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket non trouvé' });
    }

    // Vérifier que l'utilisateur est membre du projet
    const project = await Project.findById(ticket.project);
    const isMember = project.members.some((member) => {
      const memberId = member.user?._id || member.user;
      return memberId && memberId.toString() === userId.toString();
    });

    if (!isMember) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Supprimer aussi les commentaires associés
    const Comment = require('../models/Comment.model');
    await Comment.deleteMany({ ticket: ticketId });

    await Ticket.findByIdAndDelete(ticketId);

    console.log('Ticket deleted successfully');
    res.json({ message: 'Ticket supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression ticket:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
});

module.exports = router;