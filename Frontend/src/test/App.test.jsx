import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

// Helper: build a fetch mock that responds based on URL + method.
function mockFetch(handlers) {
    return vi.fn(async (url, options = {}) => {
        const method = options.method || "GET";
        const key = `${method} ${url}`;
        const handler = handlers[key] ?? handlers[url];
        if (!handler) {
            throw new Error(`Unhandled fetch: ${key}`);
        }
        const { status = 200, body = {} } = handler;
        return {
            ok: status >= 200 && status < 300,
            status,
            json: async () => body,
        };
    });
}

beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
});

describe("auth screen (no user)", () => {
    it("renders the login form by default", () => {
        render(<App />);
        expect(screen.getByRole("heading", { name: "Accedi" })).toBeInTheDocument();
        // Email field is only shown in register mode.
        expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    });

    it("switches to register mode and reveals the email field", async () => {
        const user = userEvent.setup();
        render(<App />);
        await user.click(screen.getByRole("button", { name: "Registrati" }));
        expect(screen.getByRole("heading", { name: "Registrati" })).toBeInTheDocument();
        expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });
});

describe("login flow", () => {
    it("stores token + user and renders the planner on success", async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            "fetch",
            mockFetch({
                "POST /api/auth/login": {
                    status: 200,
                    body: {
                        token: "jwt-token",
                        user: { id: "1", username: "mario", email: "mario@example.com" },
                    },
                },
                "/api/sessions": { status: 200, body: [] },
            })
        );

        render(<App />);
        await user.type(screen.getByLabelText("Username"), "mario");
        await user.type(screen.getByLabelText("Password"), "password123");
        await user.click(screen.getByRole("button", { name: "Accedi" }));

        await waitFor(() =>
            expect(screen.getByText("Pianificatore di Studio")).toBeInTheDocument()
        );
        expect(localStorage.getItem("token")).toBe("jwt-token");
        expect(screen.getByText("Ciao, mario")).toBeInTheDocument();
    });

    it("shows the server error message on failed login", async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            "fetch",
            mockFetch({
                "POST /api/auth/login": {
                    status: 400,
                    body: { message: "Credenziali non valide." },
                },
            })
        );

        render(<App />);
        await user.type(screen.getByLabelText("Username"), "mario");
        await user.type(screen.getByLabelText("Password"), "wrong");
        await user.click(screen.getByRole("button", { name: "Accedi" }));

        await waitFor(() =>
            expect(screen.getByText("Credenziali non valide.")).toBeInTheDocument()
        );
        expect(localStorage.getItem("token")).toBeNull();
    });
});

describe("register flow", () => {
    it("returns to login mode and shows a success message", async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            "fetch",
            mockFetch({
                "POST /api/auth/register": {
                    status: 201,
                    body: { message: "Utente registrato con successo." },
                },
            })
        );

        render(<App />);
        await user.click(screen.getByRole("button", { name: "Registrati" }));
        await user.type(screen.getByLabelText("Username"), "mario");
        await user.type(screen.getByLabelText("Email"), "mario@example.com");
        await user.type(screen.getByLabelText("Password"), "password123");
        await user.click(screen.getByRole("button", { name: "Registrati" }));

        await waitFor(() =>
            expect(
                screen.getByText("Registrazione avvenuta! Ora puoi accedere.")
            ).toBeInTheDocument()
        );
        // Back on the login screen.
        expect(screen.getByRole("heading", { name: "Accedi" })).toBeInTheDocument();
    });
});

describe("planner (logged-in user)", () => {
    beforeEach(() => {
        localStorage.setItem("token", "jwt-token");
        localStorage.setItem(
            "user",
            JSON.stringify({ id: "1", username: "mario", email: "mario@example.com" })
        );
    });

    it("shows the empty state when there are no sessions", async () => {
        vi.stubGlobal(
            "fetch",
            mockFetch({ "/api/sessions": { status: 200, body: [] } })
        );
        render(<App />);
        await waitFor(() =>
            expect(
                screen.getByText("Nessuna sessione. Aggiungine una qui sopra.")
            ).toBeInTheDocument()
        );
    });

    it("renders the fetched sessions", async () => {
        vi.stubGlobal(
            "fetch",
            mockFetch({
                "/api/sessions": {
                    status: 200,
                    body: [
                        {
                            _id: "s1",
                            subject: "Matematica",
                            topic: "Derivate",
                            studyData: "2026-07-01",
                            priority: "Alta",
                            completed: false,
                        },
                    ],
                },
            })
        );
        render(<App />);
        await waitFor(() =>
            expect(screen.getByText("Matematica")).toBeInTheDocument()
        );
        expect(screen.getByText("Derivate")).toBeInTheDocument();
    });

    it("logs out and returns to the auth screen, clearing storage", async () => {
        const user = userEvent.setup();
        vi.stubGlobal(
            "fetch",
            mockFetch({ "/api/sessions": { status: 200, body: [] } })
        );
        render(<App />);
        await waitFor(() =>
            expect(screen.getByText("Pianificatore di Studio")).toBeInTheDocument()
        );
        await user.click(screen.getByRole("button", { name: "Esci" }));
        expect(screen.getByRole("heading", { name: "Accedi" })).toBeInTheDocument();
        expect(localStorage.getItem("token")).toBeNull();
    });
});
