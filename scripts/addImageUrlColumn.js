const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

async function addImageUrlColumn() {
    try {
        // Check if the imageUrl column exists
        const [results] = await sequelize.query(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = '${process.env.DB_NAME}' 
             AND TABLE_NAME = 'products' 
             AND COLUMN_NAME = 'imageUrl'`
        );

        if (results.length === 0) {
            // Add the imageUrl column if it doesn't exist
            console.log('Adding imageUrl column to products table...');
            await sequelize.query(
                `ALTER TABLE products 
                 ADD COLUMN imageUrl VARCHAR(255) NULL DEFAULT NULL 
                 AFTER stock`,
                { type: QueryTypes.RAW }
            );
            console.log('Successfully added imageUrl column to products table');
        } else {
            console.log('imageUrl column already exists in products table');
        }
    } catch (error) {
        console.error('Error adding imageUrl column:', error);
    } finally {
        await sequelize.close();
    }
}

// Run the function
addImageUrlColumn();
