import { useState, useEffect } from "react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const API_SESSIONS = `${API_BASE}/api/sessions`;
const API_AUTH = `${API_BASE}/api/auth`;

function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  const [sessions, setSessions] = useState([]);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [studyData, setStudyData] = useState("");
  const [priority, setPriority] = useState("Media");
  const [file, setFile] = useState(null);
  const [sessionError, setSessionError] = useState("");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const authHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleLogout = () => {
    setUser(null);
    setSessions([]);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const handleAuthError = (response) => {
    if (response.status === 401) {
      handleLogout();
      return true;
    }
    return false;
  };

  const fetchSessions = async () => {
    if (!localStorage.getItem("token")) return;

    setFetching(true);
    try {
      const response = await fetch(API_SESSIONS, { headers: authHeaders() });
      const data = await response.json();

      if (handleAuthError(response)) return;

      if (!response.ok) {
        throw new Error(data.message || "Errore nel recupero sessioni");
      }

      setSessions(data);
    } catch (error) {
      console.error("Errore nel recupero sessioni:", error);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchSessions();
  }, [user]);

  const switchAuthMode = (toRegister) => {
    setIsRegisterMode(toRegister);
    setAuthError("");
    setAuthSuccess("");
    setUsername("");
    setEmail("");
    setPassword("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_AUTH}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.message || "Errore nel login");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      setUsername("");
      setPassword("");
    } catch {
      setAuthError("Errore di connessione al server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_AUTH}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.message || "Errore nella registrazione");
        return;
      }

      // Switch to login mode, then show success — order matters
      setIsRegisterMode(false);
      setUsername("");
      setEmail("");
      setPassword("");
      setAuthError("");
      setAuthSuccess("Registrazione avvenuta! Ora puoi accedere.");
    } catch {
      setAuthError("Errore di connessione al server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSessionError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("topic", topic);
      formData.append("studyData", studyData);
      formData.append("priority", priority);
      if (file) formData.append("file", file);

      const response = await fetch(API_SESSIONS, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });

      const data = await response.json();

      if (handleAuthError(response)) return;

      if (!response.ok) {
        setSessionError(data.message || "Errore nella creazione della sessione");
        return;
      }

      setSubject("");
      setTopic("");
      setStudyData("");
      setPriority("Media");
      setFile(null);
      await fetchSessions();
    } catch {
      setSessionError("Errore di connessione al server.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (id) => {
    setActionError("");
    try {
      const response = await fetch(`${API_SESSIONS}/${id}/complete`, {
        method: "PUT",
        headers: authHeaders(),
      });
      const data = await response.json();

      if (handleAuthError(response)) return;

      if (!response.ok) {
        setActionError(data.message || "Errore durante il completamento");
        return;
      }

      await fetchSessions();
    } catch {
      setActionError("Errore di connessione al server.");
    }
  };

  const handleDelete = async (id) => {
    setActionError("");
    try {
      const response = await fetch(`${API_SESSIONS}/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await response.json();

      if (handleAuthError(response)) return;

      if (!response.ok) {
        setActionError(data.message || "Errore durante l'eliminazione");
        return;
      }

      setConfirmDeleteId(null);
      await fetchSessions();
    } catch {
      setActionError("Errore di connessione al server.");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const isPastDue = (dateStr, completed) => {
    if (!dateStr || completed) return false;
    const today = new Date().toISOString().split("T")[0];
    return dateStr < today;
  };

  if (!user) {
    return (
      <div className="container auth-container">
        <h1>{isRegisterMode ? "Registrati" : "Accedi"}</h1>

        {authError && <p className="form-message error">{authError}</p>}
        {authSuccess && <p className="form-message success">{authSuccess}</p>}

        <form onSubmit={isRegisterMode ? handleRegister : handleLogin}>
          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Il tuo username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          {isRegisterMode && (
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="La tua email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="La tua password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isRegisterMode ? "new-password" : "current-password"}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading
              ? "Caricamento..."
              : isRegisterMode
              ? "Registrati"
              : "Accedi"}
          </button>
        </form>

        <p className="auth-switch">
          {isRegisterMode ? "Hai già un account?" : "Non hai un account?"}{" "}
          <button
            type="button"
            className="link-btn"
            onClick={() => switchAuthMode(!isRegisterMode)}
          >
            {isRegisterMode ? "Accedi" : "Registrati"}
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header-row">
        <h1>Pianificatore di Studio</h1>
        <button type="button" className="secondary" onClick={handleLogout}>
          Esci
        </button>
      </div>
      <p className="welcome">Ciao, {user.username}</p>

      <section className="add-session-section">
        <h2 className="section-title">Nuova sessione</h2>
        <form onSubmit={handleSubmit}>
          {sessionError && (
            <p className="form-message error">{sessionError}</p>
          )}

          <div className="form-grid">
            <div className="field">
              <label htmlFor="subject">Materia</label>
              <input
                id="subject"
                type="text"
                placeholder="Es. Matematica"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="topic">Argomento</label>
              <input
                id="topic"
                type="text"
                placeholder="Es. Derivate"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="studyData">Data</label>
              <input
                id="studyData"
                type="date"
                value={studyData}
                onChange={(e) => setStudyData(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="priority">Priorità</label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Bassa">Bassa</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label htmlFor="file">Allegato (opzionale)</label>
            <input
              id="file"
              type="file"
              key={file ? file.name : "empty"}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Salvataggio..." : "Aggiungi Sessione"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="section-title">Le tue sessioni</h2>

        {actionError && (
          <p className="form-message error" style={{ marginBottom: "1rem" }}>
            {actionError}
          </p>
        )}

        <div className="session-list">
          {fetching ? (
            <p className="empty-state loading-state">Caricamento sessioni...</p>
          ) : sessions.length === 0 ? (
            <p className="empty-state">
              Nessuna sessione. Aggiungine una qui sopra.
            </p>
          ) : (
            sessions.map((session) => {
              const overdue = isPastDue(session.studyData, session.completed);
              return (
                <article
                  key={session._id}
                  className={`session-card ${session.completed ? "completed" : ""} ${overdue ? "past-due" : ""}`}
                >
                  <div className="session-card-header">
                    <h3>{session.subject}</h3>
                    <span
                      className={`priority-badge ${session.priority?.toLowerCase()}`}
                    >
                      {session.priority}
                    </span>
                  </div>
                  <p>
                    <strong>Argomento:</strong> {session.topic}
                  </p>
                  <p className={overdue ? "overdue-text" : ""}>
                    <strong>Data:</strong> {formatDate(session.studyData)}
                    {overdue && (
                      <span className="overdue-badge">Scaduta</span>
                    )}
                  </p>
                  <p>
                    <strong>Stato:</strong>{" "}
                    <span
                      className={
                        session.completed ? "status-done" : "status-progress"
                      }
                    >
                      {session.completed ? "Completata" : "In corso"}
                    </span>
                  </p>
                  {session.fileUrl && (
                    <p>
                      <strong>File:</strong>{" "}
                      <a
                        href={session.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {session.fileName || "Visualizza allegato"}
                      </a>
                    </p>
                  )}
                  <div className="buttons">
                    {!session.completed && (
                      <button
                        type="button"
                        className="success"
                        onClick={() => handleComplete(session._id)}
                      >
                        ✓ Completa
                      </button>
                    )}
                    {confirmDeleteId === session._id ? (
                      <>
                        <span className="confirm-text">Sei sicuro?</span>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDelete(session._id)}
                        >
                          Sì, elimina
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Annulla
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="danger"
                        onClick={() => setConfirmDeleteId(session._id)}
                      >
                        Elimina
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
