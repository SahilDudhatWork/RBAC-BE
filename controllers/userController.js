const { User, Role } = require('../models');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');

// Handle email functionality with fallback
let sendEmail;
try {
  sendEmail = require('../utils/email').sendEmail;
} catch (error) {
  console.warn('Email module not available. Password reset emails will not be sent.');
  sendEmail = async (mailOptions) => {
    console.warn('Email not sent - email module not configured');
    console.log('Would send email:', mailOptions);
    return { message: 'Email not sent - email module not configured' };
  };
}

const getUsers = async (req, res) => {
    try {
        const userRole = req.user.Role.roleName;
        let where = {};

        if (userRole === 'admin') {
            where = { createdById: req.user.id };
        } else if (userRole !== 'superAdmin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const users = await User.findAll({
            where,
            attributes: { exclude: ['password'] },
            include: [
                { 
                    model: Role, 
                    attributes: ['id', 'roleName'] 
                },
                { 
                    model: User, 
                    as: 'createdBy', 
                    attributes: ['id', 'name', 'email'] 
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getUser = async (req, res) => {
    try {
        if (req.user.Role.roleName !== 'superAdmin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] },
            include: [
                { 
                    model: Role, 
                    attributes: ['id', 'roleName'] 
                },
                { 
                    model: User, 
                    as: 'createdBy', 
                    attributes: ['id', 'name', 'email'] 
                },
            ],
        });

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const createUser = async (req, res) => {
    try {
        if (!['superAdmin', 'admin'].includes(req.user.Role.roleName)) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { name, email, password, roleName } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required' });
        }

        const userExists = await User.findOne({ where: { email } });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const role = await Role.findOne({ where: { roleName } });
        if (!role) return res.status(400).json({ message: 'Role not found' });

        // Create user with plain password - the User model's beforeCreate hook will hash it
        const user = await User.create({
            name,
            email,
            password,
            roleId: role.id,
            createdById: req.user.id,
            isActive: true
        });

        // Fetch created user with role info
        const createdUser = await User.findByPk(user.id, {
            attributes: { exclude: ['password'] },
            include: [
                { 
                    model: Role, 
                    attributes: ['id', 'roleName'] 
                }
            ],
        });

        res.status(201).json(createdUser);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateUser = async (req, res) => {
    try {
        // Only superAdmin can update users
        if (req.user.Role.roleName !== 'superAdmin') {
            return res.status(403).json({ message: 'Not authorized. Only super admin can update users.' });
        }

        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { name, email, roleName, password } = req.body;

        // Update role if provided
        if (roleName) {
            const role = await Role.findOne({ where: { roleName } });
            if (!role) return res.status(400).json({ message: 'Role not found' });
            user.roleId = role.id;
        }

        // Update other fields
        if (name) user.name = name;
        if (email) {
            // Check if email is already taken by another user
            const existingUser = await User.findOne({ 
                where: { 
                    email, 
                    id: { [Op.ne]: user.id } 
                } 
            });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            user.email = email;
        }
        
        // Update password if provided
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
        }

        await user.save();

        // Fetch updated user with role info
        const updatedUser = await User.findByPk(user.id, {
            attributes: { exclude: ['password'] },
            include: [
                { 
                    model: Role, 
                    attributes: ['id', 'roleName'] 
                }
            ],
        });

        res.json({
            message: 'User updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        // Get the user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        user.password = hashedPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Find user by email
        const user = await User.findOne({ where: { email } });
        
        // For security, don't reveal if the email exists or not
        if (!user) {
            return res.json({ 
                message: 'If an account exists with this email, you will receive a password reset link.' 
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

        // Save token and expiry to user
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(resetTokenExpiry);
        await user.save();

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        // Send email
        const emailSubject = 'Password Reset Request';
        const emailText = `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
            `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
            `${resetUrl}\n\n` +
            `If you did not request this, please ignore this email and your password will remain unchanged.\n`;

        await sendEmail({
            to: user.email,
            subject: emailSubject,
            text: emailText,
        });

        res.json({ 
            message: 'If an account exists with this email, you will receive a password reset link.' 
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const validateResetToken = async (req, res) => {
    try {
        const { token } = req.params;
        
        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ 
                message: 'Password reset token is invalid or has expired.' 
            });
        }

        res.json({ valid: true });
    } catch (error) {
        console.error('Validate reset token error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ 
                message: 'Token and new password are required' 
            });
        }

        // Find user by token and check if it's not expired
        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ 
                message: 'Password reset token is invalid or has expired.' 
            });
        }

        // Update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        // Send confirmation email
        const emailSubject = 'Your password has been changed';
        const emailText = `Hello,\n\n` +
            `This is a confirmation that the password for your account ${user.email} has just been changed.\n`;

        await sendEmail({
            to: user.email,
            subject: emailSubject,
            text: emailText,
        });

        res.json({ message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteUser = async (req, res) => {
    try {
        if (req.user.Role.roleName !== 'superAdmin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (user.id === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete yourself' });
        }

        await user.destroy();
        res.json({ message: 'User removed successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    changePassword,
    forgotPassword,
    validateResetToken,
    resetPassword
};