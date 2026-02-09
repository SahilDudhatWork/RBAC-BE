const express = require('express');
const router = express.Router();
const {
    getRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole
} = require('../controllers/roleController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', checkPermission('read', 'Roles'), getRoles);
router.get('/:id', checkPermission('read', 'Roles'), getRole);
router.post('/', checkPermission('create', 'Roles'), createRole);
router.put('/:id', checkPermission('edit', 'Roles'), updateRole);
router.delete('/:id', checkPermission('delete', 'Roles'), deleteRole);

module.exports = router;