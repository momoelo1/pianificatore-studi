const request = require('supertest');
const app = require('../app');

// setup.js sets FRONTEND_URL to "https://momoelo1.github.io/pianificatore-studi-frontend"
// (with a path) on purpose — the browser's Origin header is "https://momoelo1.github.io".
describe('CORS', () => {
    it('allows the frontend origin even though FRONTEND_URL includes a path', async () => {
        const res = await request(app)
            .get('/')
            .set('Origin', 'https://momoelo1.github.io');
        expect(res.headers['access-control-allow-origin']).toBe('https://momoelo1.github.io');
    });

    it('does not grant an allow-origin header to an unknown origin', async () => {
        const res = await request(app)
            .get('/')
            .set('Origin', 'https://evil.example.com');
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('answers the login preflight (OPTIONS) for the allowed origin', async () => {
        const res = await request(app)
            .options('/api/auth/login')
            .set('Origin', 'https://momoelo1.github.io')
            .set('Access-Control-Request-Method', 'POST');
        expect(res.headers['access-control-allow-origin']).toBe('https://momoelo1.github.io');
        expect(res.status).toBeLessThan(400);
    });
});
