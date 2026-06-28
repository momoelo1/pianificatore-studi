const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const { createUser } = require('./helpers');

describe('POST /api/auth/register', () => {
    it('rejects missing fields with 400', async () => {
        const res = await request(app).post('/api/auth/register').send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Campi obbligatori!');
    });

    it('rejects a username shorter than 3 characters', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'ab', email: 'a@b.com', password: 'password123' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Username/);
    });

    it('rejects an invalid email', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'mario', email: 'not-an-email', password: 'password123' });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Email non valida.');
    });

    it('rejects a password shorter than 6 characters', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'mario', email: 'a@b.com', password: '123' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/password/i);
    });

    it('registers a valid user, hashes the password, and lowercases the email', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'Mario', email: 'MARIO@Example.com', password: 'password123' });
        expect(res.status).toBe(201);

        const stored = await User.findOne({ username: 'Mario' });
        expect(stored).not.toBeNull();
        expect(stored.email).toBe('mario@example.com');
        expect(stored.password).not.toBe('password123');
    });

    it('rejects a duplicate username or email with 400', async () => {
        await createUser({ username: 'mario', email: 'mario@example.com' });
        const res = await request(app)
            .post('/api/auth/register')
            .send({ username: 'mario', email: 'other@example.com', password: 'password123' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/già esistenti/);
    });
});

describe('POST /api/auth/login', () => {
    it('rejects missing credentials with 400', async () => {
        const res = await request(app).post('/api/auth/login').send({ username: 'mario' });
        expect(res.status).toBe(400);
    });

    it('returns 400 for an unknown user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'ghost', password: 'password123' });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Credenziali non valide.');
    });

    it('returns 400 for a wrong password', async () => {
        await createUser({ username: 'mario', password: 'password123' });
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'mario', password: 'wrongpass' });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Credenziali non valide.');
    });

    it('returns a token and user payload on success', async () => {
        await createUser({ username: 'mario', email: 'mario@example.com', password: 'password123' });
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'mario', password: 'password123' });
        expect(res.status).toBe(200);
        expect(typeof res.body.token).toBe('string');
        expect(res.body.user).toMatchObject({ username: 'mario', email: 'mario@example.com' });
        expect(res.body.user.password).toBeUndefined();
    });

    it('returns 500 when JWT_SECRET is not configured', async () => {
        await createUser({ username: 'mario', password: 'password123' });
        const original = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;
        const res = await request(app)
            .post('/api/auth/login')
            .send({ username: 'mario', password: 'password123' });
        process.env.JWT_SECRET = original;
        expect(res.status).toBe(500);
    });
});

describe('GET /api/auth/users', () => {
    it('requires authentication', async () => {
        const res = await request(app).get('/api/auth/users');
        expect(res.status).toBe(401);
    });
});
