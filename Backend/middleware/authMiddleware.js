const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Accesso negato. Token mancante.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.id, username: decoded.username, email: decoded.email };
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Sessione scaduta. Effettua di nuovo il login.' });
        }
        return res.status(401).json({ message: 'Token non valido.' });
    }
};

module.exports = authMiddleware;
