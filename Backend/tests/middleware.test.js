const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const { createUser } = require('./helpers');

// The middleware is exercised through a protected route (GET /api/sessions).
describe('authMiddleware', () => {
    it('rejects a request with no Authorization header (401)', async () => {
        const res = await request(app).get('/api/sessions');
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/Token mancante/);
    });

    it('rejects a header that does not start with "Bearer " (401)', async () => {
        const res = await request(app)
            .get('/api/sessions')
            .set('Authorization', 'Token abc');
        expect(res.status).toBe(401);
    });

    it('rejects a malformed/invalid token (401)', async () => {
        const res = await request(app)
            .get('/api/sessions')
            .set('Authorization', 'Bearer not.a.real.token');
        expect(res.status).toBe(401);
        expect(res.body.message).toBe('Token non valido.');
    });

    it('rejects an expired token with a session-expired message (401)', async () => {
        const { user } = await createUser();
        const expired = jwt.sign(
            { id: user._id.toString(), username: user.username, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: -10 }
        );
        const res = await request(app)
            .get('/api/sessions')
            .set('Authorization', `Bearer ${expired}`);
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/Sessione scaduta/);
    });
});
