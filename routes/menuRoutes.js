const express = require('express');
const router = express.Router();
const {
    getMenus,
    getMenu,
    createMenu,
    updateMenu,
    deleteMenu
} = require('../controllers/menuController');
const { protect, checkPermission } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', checkPermission('read', 'Menu Management'), getMenus);
router.get('/:id', checkPermission('read', 'Menu Management'), getMenu);
router.post('/', checkPermission('create', 'Menu Management'), createMenu);
router.put('/:id', checkPermission('edit', 'Menu Management'), updateMenu);
router.delete('/:id', checkPermission('delete', 'Menu Management'), deleteMenu);

module.exports = router;