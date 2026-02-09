const { Activity, User } = require('../models');

// @desc    Get all activities
// @route   GET /api/activities
// @access  Private/Admin
const getActivities = async (req, res) => {
  try {
    const activities = await Activity.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 100 // Limit to 100 most recent activities by default
    });
    
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get activities for a specific user
// @route   GET /api/activities/user/:userId
// @access  Private/Admin or Own profile
const getUserActivities = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if the requesting user is authorized
    if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const activities = await Activity.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    
    res.json(activities);
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Log a new activity
// @route   POST /api/activities
// @access  Private
const logActivity = async (userId, action, entityType, entityId, details = null) => {
  try {
    await Activity.create({
      userId,
      action,
      entityType,
      entityId,
      details: details ? JSON.stringify(details) : null
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

module.exports = {
  getActivities,
  getUserActivities,
  logActivity
};
