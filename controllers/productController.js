const { Product } = require('../models');
const db = require('../models');

// Ensure Product model is properly initialized
const ProductModel = db.Product || Product;
const { Op } = require('sequelize');

// Get all products
const getProducts = async (req, res) => {
    try {
        const { search, category, minPrice, maxPrice, inStock, includeInactive } = req.query;
        const where = {};

        // Build search conditions
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        if (category) {
            where.category = category;
        }

        if (minPrice || maxPrice) {
            where.price = {};
            if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
            if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
        }

        if (inStock === 'true') {
            where.stock = { [Op.gt]: 0 };
        }

        // Include inactive products if requested
        let queryOptions = {
            where,
            order: [['createdAt', 'DESC']]
        };

        // Only apply scope if includeInactive is true
        if (includeInactive === 'true') {
            queryOptions = {
                ...queryOptions,
                paranoid: false // This will include soft-deleted records
            };
        }

        const products = await ProductModel.findAll(queryOptions);

        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get single product
const getProduct = async (req, res) => {
    try {
        const product = await ProductModel.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Create product
const createProduct = async (req, res) => {
    try {
        // Only admin and superAdmin can create products
        if (!['admin', 'superAdmin'].includes(req.user.Role.roleName)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { name, description, price, stock, category, imageUrl } = req.body;
        
        const product = await ProductModel.create({
            name,
            description,
            price: parseFloat(price),
            stock: parseInt(stock, 10) || 0,
            category,
            imageUrl
        });

        res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Update product
const updateProduct = async (req, res) => {
    try {
        // Only admin and superAdmin can update products
        if (!['admin', 'superAdmin'].includes(req.user.Role.roleName)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const product = await ProductModel.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const { name, description, price, stock, category, imageUrl, isActive } = req.body;
        
        // Update fields if they exist in the request
        if (name) product.name = name;
        if (description !== undefined) product.description = description;
        if (price !== undefined) product.price = parseFloat(price);
        if (stock !== undefined) product.stock = parseInt(stock, 10);
        if (category !== undefined) product.category = category;
        if (imageUrl !== undefined) product.imageUrl = imageUrl;
        if (isActive !== undefined) product.isActive = isActive;

        await product.save();
        res.json(product);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete product
const deleteProduct = async (req, res) => {
    try {
        // Only admin and superAdmin can delete products
        if (req.user.Role.roleName !== 'superAdmin') {
            return res.status(403).json({ message: 'Not authorized. Only super admin can delete products.' });
        }

        const product = await ProductModel.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        await product.destroy();
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct
};
