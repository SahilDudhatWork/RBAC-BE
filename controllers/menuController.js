const { Menu, Role, Permission, User } = require('../models');

const getMenus = async (req, res) => {
    try {
        // First check if user is authenticated
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        // Get user with role and permissions
        const userWithRole = await User.findByPk(req.user.id, {
            include: [{
                model: Role,
                attributes: ['id', 'roleName'],
                include: [{
                    model: Menu,
                    through: {
                        attributes: ['read', 'create', 'edit', 'delete']
                    },
                    attributes: ['id', 'name', 'path', 'icon', 'order']
                }]
            }]
        });

        if (!userWithRole || !userWithRole.Role) {
            return res.status(403).json({ message: 'User role not found' });
        }

        // If user is superAdmin, return all menus with full permissions
        if (userWithRole.Role.roleName === 'superAdmin') {
            const menus = await Menu.findAll({
                order: [['order', 'ASC']],
                include: [{
                    model: User,
                    as: 'createdBy',
                    attributes: ['id', 'name', 'email'],
                    required: false
                }]
            });

            // Add full permissions for superAdmin
            const menusWithPermissions = menus.map(menu => ({
                ...menu.get({ plain: true }),
                Permission: {
                    read: true,
                    create: true,
                    edit: true,
                    delete: true
                }
            }));

            return res.json(menusWithPermissions);
        }

        // For other roles, return only the menus they have permission to access
        const accessibleMenus = userWithRole.Role.Menus
            .filter(menu => menu.Permission.read) // Only include menus with read permission
            .map(menu => {
                const { Permission, ...menuData } = menu.get({ plain: true });
                return {
                    ...menuData,
                    Permission: {
                        read: true, // If we got here, read is true
                        create: !!Permission.create,
                        edit: !!Permission.edit,
                        delete: !!Permission.delete
                    }
                };
            })
            .sort((a, b) => a.order - b.order); // Sort by order

        res.json(accessibleMenus);
    } catch (error) {
        console.error('Error in getMenus:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const getMenu = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const userWithRole = await User.findByPk(req.user.id, {
            include: [{
                model: Role,
                attributes: ['id', 'roleName']
            }]
        });

        if (!userWithRole || !userWithRole.Role || userWithRole.Role.roleName !== 'superAdmin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const menu = await Menu.findByPk(req.params.id, {
            include: [{
                model: User,
                as: 'createdBy',
                attributes: ['id', 'name', 'email'],
                required: false
            }]
        });
        
        if (!menu) return res.status(404).json({ message: 'Menu not found' });

        res.json(menu);
    } catch (error) {
        console.error('Error in getMenu:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const createMenu = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const userWithRole = await User.findByPk(req.user.id, {
            include: [{
                model: Role,
                attributes: ['id', 'roleName']
            }]
        });

        if (!userWithRole || !userWithRole.Role || userWithRole.Role.roleName !== 'superAdmin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const menu = await Menu.create({
            ...req.body,
            createdById: req.user.id,
        });

        const createdMenu = await Menu.findByPk(menu.id, {
            include: [{
                model: User,
                as: 'createdBy',
                attributes: ['id', 'name', 'email']
            }]
        });

        res.status(201).json(createdMenu);
    } catch (error) {
        console.error('Error in createMenu:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const updateMenu = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const userWithRole = await User.findByPk(req.user.id, {
            include: [{
                model: Role,
                attributes: ['id', 'roleName']
            }]
        });

        if (!userWithRole || !userWithRole.Role || userWithRole.Role.roleName !== 'superAdmin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const menu = await Menu.findByPk(req.params.id);
        if (!menu) return res.status(404).json({ message: 'Menu not found' });

        await menu.update(req.body);
        
        const updatedMenu = await Menu.findByPk(menu.id, {
            include: [{
                model: User,
                as: 'createdBy',
                attributes: ['id', 'name', 'email']
            }]
        });

        res.json(updatedMenu);
    } catch (error) {
        console.error('Error in updateMenu:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const deleteMenu = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }

        const userWithRole = await User.findByPk(req.user.id, {
            include: [{
                model: Role,
                attributes: ['id', 'roleName']
            }]
        });

        if (!userWithRole || !userWithRole.Role || userWithRole.Role.roleName !== 'superAdmin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const menu = await Menu.findByPk(req.params.id);
        if (!menu) return res.status(404).json({ message: 'Menu not found' });

        const used = await Permission.findOne({ where: { menuId: menu.id } });
        if (used) {
            return res.status(400).json({ 
                message: 'Cannot delete menu. It is being used in roles.',
                error: 'MENU_IN_USE'
            });
        }

        await menu.destroy();
        res.json({ 
            message: 'Menu removed successfully',
            id: menu.id
        });
    } catch (error) {
        console.error('Error in deleteMenu:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = { getMenus, getMenu, createMenu, updateMenu, deleteMenu };