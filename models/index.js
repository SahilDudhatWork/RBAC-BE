const sequelize = require('../config/database');
const User = require('./User');
const Role = require('./Role');
const Menu = require('./Menu');
const Permission = require('./Permission');
const Product = require('./Product');
const Activity = require('./Activity');

// Associations
Role.belongsToMany(Menu, { through: Permission, foreignKey: 'roleId' });
Menu.belongsToMany(Role, { through: Permission, foreignKey: 'menuId' });

User.belongsTo(Role, { foreignKey: 'roleId' });
Role.hasMany(User, { foreignKey: 'roleId' });

User.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });

Menu.belongsTo(User, { as: 'createdBy', foreignKey: 'createdById' });

// Additional model associations can be added here

// Activity associations
Activity.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Activity, { foreignKey: 'userId' });

const models = { sequelize, User, Role, Menu, Permission, Product, Activity };

// Sync all models
// sequelize.sync({ alter: true }).then(() => {
//   console.log('Database & tables synced');
// });

module.exports = models;