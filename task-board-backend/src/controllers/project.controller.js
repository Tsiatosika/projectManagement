const Project = require('../models/Project');

// Créer un projet
exports.createProject = async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.userId; // Utilise req.userId du middleware

    console.log('Create project request:', { title, userId });

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const project = new Project({
      title,
      description,
      createdBy: userId,
      members: [
        {
          user: userId,
          role: 'owner',
        },
      ],
    });

    await project.save();
    await project.populate('members.user', 'firstName lastName email');
    await project.populate('createdBy', 'firstName lastName email');

    console.log('Project created successfully:', project);
    res.status(201).json(project);
  } catch (error) {
    console.error('Erreur création projet:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};

// Récupérer tous les projets de l'utilisateur
exports.getUserProjects = async (req, res) => {
  try {
    const userId = req.userId; // Utilise req.userId du middleware

    console.log('Get user projects request:', { userId });

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const projects = await Project.find({
      'members.user': userId,
    })
      .populate('createdBy', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email')
      .sort({ createdAt: -1 });

    console.log('Projects found:', projects.length);
    res.json(projects);
  } catch (error) {
    console.error('Erreur liste projets:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};

// Récupérer un projet par ID
exports.getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId; // Utilise req.userId du middleware

    console.log('Get project by ID request:', { projectId, userId });

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const project = await Project.findById(projectId)
      .populate('createdBy', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email');

    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    // Vérifier que l'utilisateur est membre
    const isMember = project.members.some(
      (member) => {
        const memberId = member.user?._id || member.user;
        return memberId && memberId.toString() === userId.toString();
      }
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    console.log('Project found:', project._id);
    res.json(project);
  } catch (error) {
    console.error('Erreur détails projet:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};

// Mettre à jour un projet
exports.updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description } = req.body;
    const userId = req.userId; // Utilise req.userId du middleware

    console.log('Update project request:', { projectId, userId });

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    // Vérifier que l'utilisateur est owner
    const member = project.members.find(
      (m) => {
        const memberId = m.user?._id || m.user;
        return memberId && memberId.toString() === userId.toString();
      }
    );

    if (!member || member.role !== 'owner') {
      return res.status(403).json({ message: 'Seul le propriétaire peut modifier le projet' });
    }

    if (title) project.title = title;
    if (description !== undefined) project.description = description;

    await project.save();
    await project.populate('createdBy', 'firstName lastName email');
    await project.populate('members.user', 'firstName lastName email');

    console.log('Project updated successfully');
    res.json(project);
  } catch (error) {
    console.error('Erreur modification projet:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};

// Supprimer un projet
exports.deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId; // Utilise req.userId du middleware

    console.log('Delete project request:', { projectId, userId });

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    // Vérifier que l'utilisateur est owner
    const member = project.members.find(
      (m) => {
        const memberId = m.user?._id || m.user;
        return memberId && memberId.toString() === userId.toString();
      }
    );

    if (!member || member.role !== 'owner') {
      return res.status(403).json({ message: 'Seul le propriétaire peut supprimer le projet' });
    }

    // Supprimer tous les tickets du projet
    const Ticket = require('../models/Ticket');
    await Ticket.deleteMany({ project: projectId });

    // Supprimer tous les labels du projet
    const Label = require('../models/Label.model');
    await Label.deleteMany({ project: projectId });

    await Project.findByIdAndDelete(projectId);

    console.log('Project deleted successfully');
    res.json({ message: 'Projet supprimé avec succès' });
  } catch (error) {
    console.error('Erreur suppression projet:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};

// Ajouter un membre au projet
exports.addMember = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userEmail } = req.body;
    const userId = req.userId; // Utilise req.userId du middleware

    console.log('Add member request:', { projectId, userEmail, userId });

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    // Vérifier que l'utilisateur est owner
    const member = project.members.find(
      (m) => {
        const memberId = m.user?._id || m.user;
        return memberId && memberId.toString() === userId.toString();
      }
    );

    if (!member || member.role !== 'owner') {
      return res.status(403).json({ message: 'Seul le propriétaire peut ajouter des membres' });
    }

    // Trouver l'utilisateur à ajouter
    const User = require('../models/User.model');
    const userToAdd = await User.findOne({ email: userEmail });
    if (!userToAdd) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier si déjà membre
    const alreadyMember = project.members.some(
      (m) => {
        const memberId = m.user?._id || m.user;
        return memberId && memberId.toString() === userToAdd._id.toString();
      }
    );

    if (alreadyMember) {
      return res.status(400).json({ message: 'Cet utilisateur est déjà membre du projet' });
    }

    project.members.push({
      user: userToAdd._id,
      role: 'member',
    });

    await project.save();
    await project.populate('members.user', 'firstName lastName email');

    console.log('Member added successfully');
    res.json(project);
  } catch (error) {
    console.error('Erreur ajout membre:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};

// Retirer un membre du projet
exports.removeMember = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const userId = req.userId; // Utilise req.userId du middleware

    console.log('Remove member request:', { projectId, memberId, userId });

    if (!userId) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Projet non trouvé' });
    }

    // Vérifier que l'utilisateur est owner
    const member = project.members.find(
      (m) => {
        const mId = m.user?._id || m.user;
        return mId && mId.toString() === userId.toString();
      }
    );

    if (!member || member.role !== 'owner') {
      return res.status(403).json({ message: 'Seul le propriétaire peut retirer des membres' });
    }

    // Ne pas permettre de retirer le owner
    const memberToRemove = project.members.find(
      (m) => {
        const mId = m.user?._id || m.user;
        return mId && mId.toString() === memberId.toString();
      }
    );

    if (memberToRemove?.role === 'owner') {
      return res.status(400).json({ message: 'Impossible de retirer le propriétaire' });
    }

    project.members = project.members.filter(
      (m) => {
        const mId = m.user?._id || m.user;
        return !(mId && mId.toString() === memberId.toString());
      }
    );

    await project.save();
    await project.populate('members.user', 'firstName lastName email');

    console.log('Member removed successfully');
    res.json(project);
  } catch (error) {
    console.error('Erreur retrait membre:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};