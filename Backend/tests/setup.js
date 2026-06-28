// Shared test bootstrap: spins up an in-memory MongoDB, mocks Cloudinary so no
// network calls are made, and wipes collections between tests for isolation.
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// JWT_SECRET must exist before any route module reads it.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Deliberately include a path here: the browser Origin never has one, so this
// proves app.js normalizes FRONTEND_URL down to its origin before matching.
process.env.FRONTEND_URL = 'https://momoelo1.github.io/pianificatore-studi-frontend';

// Mock Cloudinary: config() is a no-op, uploader.destroy() resolves without a
// real API call. multer-storage-cloudinary is never exercised because tests
// post without files (or the file path is asserted separately).
jest.mock('cloudinary', () => ({
    v2: {
        config: jest.fn(),
        uploader: { destroy: jest.fn().mockResolvedValue({ result: 'ok' }) },
    },
}));

let mongo;

beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
    const { collections } = mongoose.connection;
    for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
});
