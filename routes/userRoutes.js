const express = require('express');
const router = express.Router();
const {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    changePassword,
    forgotPassword,
    validateResetToken,
    resetPassword
} = require('../controllers/userController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', checkPermission('read', 'Users'), getUsers);
router.get('/:id', checkPermission('read', 'Users'), getUser);
router.post('/', checkPermission('create', 'Users'), createUser);
router.put('/:id', checkPermission('edit', 'Users'), updateUser);
router.delete('/:id', checkPermission('delete', 'Users'), deleteUser);

// Change password route - doesn't require specific permission as users can only change their own password
router.post('/change-password', changePassword);

// Password reset routes (public)
router.post('/forgot-password', forgotPassword);
router.get('/validate-reset-token/:token', validateResetToken);
router.post('/reset-password', resetPassword);

module.exports = router;