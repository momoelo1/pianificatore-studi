const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const sessionRoutes = require('./routes/sessionRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());

app.use('/api/sessions', sessionRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.send('API funzionante!');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Errore interno del server.' });
});

mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('MongoDB connesso.');
    app.listen(process.env.PORT || 5000, () => {
        console.log(`Server attivo sulla porta ${process.env.PORT || 5000}`);
    });
}).catch((error) => {
    console.error('Errore connessione MongoDB:', error);
    process.exit(1);
});
