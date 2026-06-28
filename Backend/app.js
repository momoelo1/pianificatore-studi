const express = require('express');
const cors = require('cors');

const sessionRoutes = require('./routes/sessionRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Browsers send the Origin header as scheme+host+port only (no path), so we
// compare on the origin. normalizeOrigin() strips any path/trailing slash a
// FRONTEND_URL value might include (e.g. a GitHub Pages project URL), which
// would otherwise never match the incoming Origin.
const normalizeOrigin = (value) => {
    if (!value) return '';
    try {
        return new URL(value).origin;
    } catch {
        return value.trim().replace(/\/+$/, '');
    }
};

const allowedOrigins = (process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:5173', 'http://127.0.0.1:5173']
).map(normalizeOrigin).filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // Allow non-browser requests (no Origin header, e.g. curl/Postman) and
        // any whitelisted origin.
        if (!origin || allowedOrigins.includes(normalizeOrigin(origin))) {
            return callback(null, true);
        }
        return callback(new Error(`Origine non consentita dal CORS: ${origin}`));
    },
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

module.exports = app;
