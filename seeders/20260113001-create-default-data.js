'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Clear existing data first
        console.log('Clearing existing data...');
        await queryInterface.bulkDelete('Permissions', null, {});
        await queryInterface.bulkDelete('Roles', null, {});
        await queryInterface.bulkDelete('Menus', null, {});
        console.log('Existing data cleared.');

        // Insert Menus
        const menuData = [
            {
                name: 'Dashboard',
                path: '/dashboard',
                icon: 'home',
                order: 1,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Users',
                path: '/users',
                icon: 'users',
                order: 2,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Roles',
                path: '/roles',
                icon: 'shield',
                order: 3,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Menu Management',
                path: '/menus',
                icon: 'menu',
                order: 4,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Settings',
                path: '/settings',
                icon: 'settings',
                order: 5,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Workspace',
                path: '/workspace',
                icon: 'briefcase',
                order: 6,
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date('2026-01-05T10:31:16.040Z')
            }
        ];

        // Insert menus and get their IDs
        await queryInterface.bulkInsert('Menus', menuData);
        const insertedMenus = await queryInterface.sequelize.query(
            'SELECT id, name FROM `Menus`',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        
        const menuMap = {};
        insertedMenus.forEach(menu => {
            menuMap[menu.name] = menu.id;
        });

        // Create roles with permissions
        const rolesData = [
            {
                roleName: 'superAdmin',
                description: 'Can manage everything – roles, menus, users',
                isActive: true,
                createdAt: new Date('2026-01-05T07:23:22.065Z'),
                updatedAt: new Date('2026-01-05T07:23:22.065Z')
            },
            {
                roleName: 'admin',
                description: 'Can manage users under them',
                isActive: true,
                createdAt: new Date('2026-01-05T07:23:22.156Z'),
                updatedAt: new Date('2026-01-05T09:57:12.040Z')
            },
            {
                roleName: 'user',
                description: 'Only assigned menus with permissions',
                isActive: true,
                createdAt: new Date('2026-01-05T07:23:22.197Z'),
                updatedAt: new Date('2026-01-05T10:30:44.063Z')
            }
        ];

        // Insert roles
        await queryInterface.bulkInsert('Roles', rolesData);
        const insertedRoles = await queryInterface.sequelize.query(
            'SELECT id, `roleName` FROM `Roles`',
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        const roleMap = {};
        insertedRoles.forEach(role => {
            roleMap[role.roleName] = role.id;
        });

        // Prepare permissions for each role
        const permissions = [];
        const now = new Date();

        // Super Admin Permissions (all permissions)
        insertedMenus.forEach(menu => {
            permissions.push({
                roleId: roleMap['superAdmin'],
                menuId: menu.id,
                read: true,
                create: true,
                edit: true,
                delete: true,
                createdAt: now,
                updatedAt: now
            });
        });

        // Admin Permissions
        insertedMenus.forEach(menu => {
            const isDashboardOrUsers = ['Dashboard', 'Users'].includes(menu.name);
            const isUsers = menu.name === 'Users';
            
            permissions.push({
                roleId: roleMap['admin'],
                menuId: menu.id,
                read: isDashboardOrUsers,
                create: isUsers,
                edit: false,
                delete: false,
                createdAt: now,
                updatedAt: now
            });
        });

        // User Permissions (only dashboard read)
        insertedMenus.forEach(menu => {
            const isDashboard = menu.name === 'Dashboard';
            
            permissions.push({
                roleId: roleMap['user'],
                menuId: menu.id,
                read: isDashboard,
                create: false,
                edit: false,
                delete: false,
                createdAt: now,
                updatedAt: now
            });
        });

        // Insert all permissions
        await queryInterface.bulkInsert('Permissions', permissions);

        console.log('Default roles, menus, and permissions created successfully!');
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('Permissions', null, {});
        await queryInterface.bulkDelete('Roles', null, {});
        await queryInterface.bulkDelete('Menus', null, {});
    }
};