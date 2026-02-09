const { Role, Menu, Permission } = require('../models');
const { Op } = require('sequelize');

const getRoles = async (req, res) => {
    try {
        if (req.user.Role.roleName !== 'superAdmin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const roles = await Role.findAll({
            include: {
                model: Menu,
                through: { attributes: ['read', 'create', 'edit', 'delete'] },
                attributes: ['id', 'name', 'path', 'icon'],
            },
        });

        res.json(roles);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getRole = async (req, res) => {
    try {
        if (req.user.Role.roleName !== 'superAdmin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const role = await Role.findByPk(req.params.id, {
            include: {
                model: Menu,
                through: { attributes: ['read', 'create', 'edit', 'delete'] },
            },
        });

        if (!role) return res.status(404).json({ message: 'Role not found' });

        res.json(role);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createRole = async (req, res) => {
    try {
        if (req.user.Role.roleName !== 'superAdmin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { roleName, description, permissions, isActive } = req.body;

        const roleExists = await Role.findOne({ where: { roleName } });
        if (roleExists) return res.status(400).json({ message: 'Role already exists' });

        const role = await Role.create({
            roleName,
            description,
            isActive: isActive !== undefined ? isActive : true
        });

        if (permissions && permissions.length > 0) {
            // Support both 'menu' and 'menuId' fields
            const permData = permissions
                .filter(p => p && (p.menu || p.menuId) && p.read) // Check for menu/menuId and read access
                .map(p => {
                    const menuId = p.menu || p.menuId; // Support both 'menu' and 'menuId'
                    return {
                        roleId: role.id,
                        menuId: menuId,
                        read: true, // Always true since we filtered for it
                        create: p.create || false,
                        edit: p.edit || false,
                        delete: p.delete || false,
                    };
                });

            if (permData.length > 0) {
                await Permission.bulkCreate(permData);
            }
        }

        // Fetch the created role with permissions
        const createdRole = await Role.findByPk(role.id, {
            include: {
                model: Menu,
                through: { attributes: ['read', 'create', 'edit', 'delete'] },
                attributes: ['id', 'name', 'path', 'icon'],
            },
        });

        res.status(201).json(createdRole);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateRole = async (req, res) => {
    try {
        // Only superAdmin users can update roles
        if (req.user.Role.roleName !== 'superAdmin') {
            return res.status(403).json({ message: 'Not authorized. Only super admin can update roles.' });
        }

        const role = await Role.findByPk(req.params.id);
        if (!role) return res.status(404).json({ message: 'Role not found' });

        // SuperAdmin role cannot be updated at all
        if (role.roleName === 'superAdmin') {
            return res.status(400).json({
                message: 'Super admin role cannot be modified. This is a protected system role.'
            });
        }

        const { roleName, description, permissions, isActive } = req.body;

        // For admin and user roles, allow updates but prevent name changes
        if (role.roleName === 'admin' || role.roleName === 'user') {
            // Allow permission updates but prevent changing role name
            if (roleName && roleName !== role.roleName) {
                return res.status(400).json({
                    message: `Cannot change name of default role: ${role.roleName}`
                });
            }
        }

        // Update role fields
        if (roleName) role.roleName = roleName;
        if (description !== undefined) role.description = description;
        if (isActive !== undefined) role.isActive = isActive;

        await role.save();

        // Update permissions if provided
        if (permissions && Array.isArray(permissions)) {
            console.log('Received permissions:', permissions);

            // Clear existing permissions
            await Permission.destroy({ where: { roleId: role.id } });

            // Create new permissions - support both 'menu' and 'menuId' fields
            const permData = permissions
                .filter(p => p && (p.menu || p.menuId) && p.read) // Check for menu/menuId and read access
                .map(p => {
                    const menuId = p.menu || p.menuId; // Support both 'menu' and 'menuId'
                    return {
                        roleId: role.id,
                        menuId: menuId,
                        read: true, // Always true since we filtered for it
                        create: p.create || false,
                        edit: p.edit || false,
                        delete: p.delete || false,
                    };
                });

            console.log('Processed permissions data:', permData);

            if (permData.length > 0) {
                await Permission.bulkCreate(permData);
            }
        }

        // Fetch the updated role with permissions
        const updatedRole = await Role.findByPk(role.id, {
            include: {
                model: Menu,
                through: { attributes: ['read', 'create', 'edit', 'delete'] },
                attributes: ['id', 'name', 'path', 'icon'],
            },
        });

        res.json({
            message: 'Role updated successfully',
            role: updatedRole
        });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteRole = async (req, res) => {
    try {
        if (req.user.Role.roleName !== 'superAdmin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const role = await Role.findByPk(req.params.id);
        if (!role) return res.status(404).json({ message: 'Role not found' });

        const defaultRoles = ['superAdmin', 'admin', 'user'];
        if (defaultRoles.includes(role.roleName)) {
            return res.status(400).json({ message: 'Cannot delete default roles' });
        }

        await Permission.destroy({ where: { roleId: role.id } });
        await role.destroy();

        res.json({ message: 'Role removed' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { getRoles, getRole, createRole, updateRole, deleteRole };