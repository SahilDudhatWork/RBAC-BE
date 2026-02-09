const jwt = require('jsonwebtoken');
const { User, Role, Menu } = require('../models');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Register (public signup or admin creating user)
const register = async (req, res) => {
    try {
        const { name, email, password, roleName } = req.body;

        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        let role;
        if (roleName) {
            role = await Role.findOne({ where: { roleName } });
            if (!role) return res.status(400).json({ message: 'Role not found' });
        } else {
            role = await Role.findOne({ where: { roleName: 'user' } });
        }

        const user = await User.create({
            name,
            email,
            password,
            roleId: role.id,
            createdById: req.user?.id || null,
        });

        const token = generateToken(user.id);

        res.status(201).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: role.roleName,
            token,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({
            where: { email },
            include: [{ model: Role }],
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        await User.update({ lastLogin: new Date() }, { where: { id: user.id } });

        // Fetch the user with role information to ensure we have the latest data
        const userWithRole = await User.findByPk(user.id, {
            include: [{ model: Role }]
        });

        if (!userWithRole) {
            console.error('User not found after login');
            return res.status(500).json({ message: 'Error completing login' });
        }

        const token = generateToken(userWithRole.id);

        res.json({
            id: userWithRole.id,
            name: userWithRole.name,
            email: userWithRole.email,
            role: userWithRole.Role ? userWithRole.Role.roleName : 'user',
            token,
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            message: 'Server error during login',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Get logged-in user
const getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['id', 'name', 'email', 'lastLogin', 'createdAt'],
            include: [{
                model: Role,
                attributes: ['roleName', 'description'],
            }],
        });

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.Role,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get permissions for frontend sidebar & route protection
const getPermissions = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: {
                model: Role,
                include: {
                    model: Menu,
                    through: { attributes: ['read', 'create', 'edit', 'delete'] },
                    attributes: ['name', 'path', 'icon', 'order'],
                    order: [['order', 'ASC']],
                },
            },
        });

        const permissions = {};

        user.Role.Menus.forEach((menu) => {
            const perm = menu.Permission;
            if (perm.read) {
                permissions[menu.name] = {
                    read: perm.read,
                    create: perm.create,
                    edit: perm.edit,
                    delete: perm.delete,
                    path: menu.path,
                    icon: menu.icon,
                };
            }
        });

        res.json(permissions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { register, login, getMe, getPermissions };