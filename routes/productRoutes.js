const express = require('express');
const router = express.Router();
const { protect, checkPermission } = require('../middleware/authMiddleware');
const {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct
} = require('../controllers/productController');

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);

// Protected routes (require authentication and specific permissions)
router.post('/', protect, checkPermission('Products', 'create'), createProduct);
router.put('/:id', protect, checkPermission('Products', 'edit'), updateProduct);
router.delete('/:id', protect, checkPermission('Products', 'delete'), deleteProduct);

module.exports = router;
