import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Dedicated test config: jsdom + Testing Library, no react-compiler babel pass
// (not needed for tests, keeps the run fast). CSS imports are ignored.
export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        globals: true,
        css: false,
        setupFiles: ["./src/test/setup.js"],
        include: ["src/**/*.test.{js,jsx}"],
        // Pin the API base so tests don't depend on .env/.env.local; the mock
        // handlers expect same-origin relative URLs ("/api/...").
        env: { VITE_API_URL: "" },
    },
});
