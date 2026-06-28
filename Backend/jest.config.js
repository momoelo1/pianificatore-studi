module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    // mongodb-memory-server downloads a binary on first run; give it room.
    testTimeout: 30000,
};
