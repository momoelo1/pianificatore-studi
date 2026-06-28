import "@testing-library/jest-dom";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

afterEach(() => {
    cleanup();
});
