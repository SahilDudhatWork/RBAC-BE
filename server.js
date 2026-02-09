const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./config/database');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/menus', require('./routes/menuRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/activities', require('./routes/activityRoutes'));

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', db: sequelize.authenticate() ? 'connected' : 'failed' });
});

// Sync DB and start server
const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: false }).then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`MySQL Connected: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT}`);
    });
}).catch(err => {
    console.error('Unable to connect to the database:', err);
});