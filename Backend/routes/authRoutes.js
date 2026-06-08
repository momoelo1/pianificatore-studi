const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/users', authMiddleware, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore nel recupero utenti.' });
    }
})

router.post('/register', async (req, res) => {
    try {
        const username = (req.body.username ?? '').trim();
        const email = (req.body.email ?? '').trim().toLowerCase();
        const password = req.body.password ?? '';

        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Campi obbligatori!' });
        }

        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({ message: 'Username deve essere tra 3 e 30 caratteri.' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Email non valida.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'La password deve avere almeno 6 caratteri.' });
        }

        const existingUser = await User.findOne({
            $or: [{ username }, { email }],
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Username o email già esistenti.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            email,
            password: hashedPassword,
        });

        await newUser.save();
        res.status(201).json({ message: 'Utente registrato con successo.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Errore del server.' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Campi obbligatori.' });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ message: 'Configurazione server incompleta.' });
        }

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({ message: 'Credenziali non valide.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Credenziali non valide.' });
        }

        const token = jwt.sign(
            {
                id: user._id.toString(),
                email: user.email,
                username: user.username,
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({message: "Login riuscito.", token, user: {id: user._id, username: user.username, email: user.email}});
    } catch (error) {
        return res.status(500).json({message: "Errore del server."});
    }
});

module.exports = router;
