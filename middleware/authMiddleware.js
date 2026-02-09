const jwt = require('jsonwebtoken');
const { User, Role, Menu, Permission } = require('../models');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findByPk(decoded.id, {
                include: [{ model: Role }],
                attributes: { exclude: ['password'] },
            });

            if (!req.user) return res.status(401).json({ message: 'Not authorized' });

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const checkPermission = (requiredPermission, menuName) => {
    return async (req, res, next) => {
        try {
            if (req.user.Role.roleName === 'superAdmin') return next();

            const menu = await Menu.findOne({
                where: { name: menuName },
                include: {
                    model: Role,
                    where: { id: req.user.roleId },
                    through: { where: { [requiredPermission]: true } },
                },
            });

            if (!menu) {
                return res.status(403).json({ message: `No ${requiredPermission} permission for ${menuName}` });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error' });
        }
    };
};

// Middleware to check if user is an admin
const admin = (req, res, next) => {
    if (req.user && req.user.Role && req.user.Role.name === 'Admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, checkPermission, admin };