const request = require('supertest');
const app = require('../app');
const StudySession = require('../models/StudySession');
const { createUser, authHeader } = require('./helpers');

const validSession = {
    subject: 'Matematica',
    topic: 'Derivate',
    studyData: '2026-07-01',
    priority: 'Alta',
};

describe('GET /api/sessions', () => {
    it('requires authentication', async () => {
        const res = await request(app).get('/api/sessions');
        expect(res.status).toBe(401);
    });

    it('returns only the authenticated user\'s sessions', async () => {
        const { user: mario } = await createUser({ username: 'mario', email: 'mario@example.com' });
        const { user: luigi } = await createUser({ username: 'luigi', email: 'luigi@example.com' });

        await StudySession.create({ ...validSession, user: mario._id });
        await StudySession.create({ ...validSession, subject: 'Storia', user: luigi._id });

        const res = await request(app).get('/api/sessions').set(authHeader(mario));
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0].subject).toBe('Matematica');
    });
});

describe('POST /api/sessions', () => {
    it('creates a session for the authenticated user (no file)', async () => {
        const { user } = await createUser();
        const res = await request(app)
            .post('/api/sessions')
            .set(authHeader(user))
            .field('subject', validSession.subject)
            .field('topic', validSession.topic)
            .field('studyData', validSession.studyData)
            .field('priority', validSession.priority);

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({
            subject: 'Matematica',
            topic: 'Derivate',
            priority: 'Alta',
            completed: false,
            fileName: '',
            fileUrl: '',
        });
        expect(res.body.user).toBe(user._id.toString());
    });

    it('rejects an invalid priority (not in enum) with 400', async () => {
        const { user } = await createUser();
        const res = await request(app)
            .post('/api/sessions')
            .set(authHeader(user))
            .field('subject', 'X')
            .field('topic', 'Y')
            .field('studyData', '2026-07-01')
            .field('priority', 'Urgentissima');
        expect(res.status).toBe(400);
    });

    it('rejects a missing required field with 400', async () => {
        const { user } = await createUser();
        const res = await request(app)
            .post('/api/sessions')
            .set(authHeader(user))
            .field('topic', 'Y')
            .field('studyData', '2026-07-01')
            .field('priority', 'Alta');
        expect(res.status).toBe(400);
    });

    it('requires authentication', async () => {
        const res = await request(app).post('/api/sessions').field('subject', 'X');
        expect(res.status).toBe(401);
    });
});

describe('PUT /api/sessions/:id/complete', () => {
    it('marks the user\'s own session as completed', async () => {
        const { user } = await createUser();
        const session = await StudySession.create({ ...validSession, user: user._id });
        const res = await request(app)
            .put(`/api/sessions/${session._id}/complete`)
            .set(authHeader(user));
        expect(res.status).toBe(200);
        expect(res.body.completed).toBe(true);
    });

    it('returns 404 when completing another user\'s session', async () => {
        const { user: mario } = await createUser({ username: 'mario', email: 'mario@example.com' });
        const { user: luigi } = await createUser({ username: 'luigi', email: 'luigi@example.com' });
        const session = await StudySession.create({ ...validSession, user: mario._id });
        const res = await request(app)
            .put(`/api/sessions/${session._id}/complete`)
            .set(authHeader(luigi));
        expect(res.status).toBe(404);
    });

    it('returns 404 for a non-existent session id', async () => {
        const { user } = await createUser();
        const res = await request(app)
            .put('/api/sessions/64b7c0e0e0e0e0e0e0e0e0e0/complete')
            .set(authHeader(user));
        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/sessions/:id', () => {
    it('deletes the user\'s own session', async () => {
        const { user } = await createUser();
        const session = await StudySession.create({ ...validSession, user: user._id });
        const res = await request(app)
            .delete(`/api/sessions/${session._id}`)
            .set(authHeader(user));
        expect(res.status).toBe(200);
        expect(await StudySession.findById(session._id)).toBeNull();
    });

    it('returns 404 when deleting another user\'s session', async () => {
        const { user: mario } = await createUser({ username: 'mario', email: 'mario@example.com' });
        const { user: luigi } = await createUser({ username: 'luigi', email: 'luigi@example.com' });
        const session = await StudySession.create({ ...validSession, user: mario._id });
        const res = await request(app)
            .delete(`/api/sessions/${session._id}`)
            .set(authHeader(luigi));
        expect(res.status).toBe(404);
        expect(await StudySession.findById(session._id)).not.toBeNull();
    });
});
