// Test helpers: create a user directly in the DB and mint a valid JWT for it,
// mirroring exactly what authRoutes/login produces.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function createUser({
    username = 'mario',
    email = 'mario@example.com',
    password = 'password123',
} = {}) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashedPassword });
    return { user, password };
}

function tokenFor(user) {
    return jwt.sign(
        { id: user._id.toString(), email: user.email, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function authHeader(user) {
    return { Authorization: `Bearer ${tokenFor(user)}` };
}

module.exports = { createUser, tokenFor, authHeader };
