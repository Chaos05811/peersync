import { useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";

import { auth } from "../lib/firebase";

function getFriendlyError(error) {
  if (!error?.code) {
    return "Something went wrong. Please try again.";
  }

  const messages = {
    "auth/email-already-in-use": "That email address is already registered.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/missing-password": "Enter your password.",
    "auth/weak-password": "Use a password with at least 6 characters."
  };

  return messages[error.code] || "Authentication failed. Please try again.";
}

export function AuthPanel({
  authReady,
  authUser,
  compact = false,
  title = "Sign in to continue",
  subtitle = "Use Firebase Authentication to access the workspace.",
  onAuthenticated
}) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState(authUser?.displayName || "");
  const [email, setEmail] = useState(authUser?.email || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const needsName = useMemo(
    () => Boolean(authUser && !authUser.displayName?.trim()),
    [authUser]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      if (!authUser) {
        if (mode === "register") {
          const credentials = await createUserWithEmailAndPassword(
            auth,
            email.trim(),
            password
          );

          if (username.trim()) {
            await updateProfile(credentials.user, {
              displayName: username.trim()
            });
          }
        } else {
          await signInWithEmailAndPassword(auth, email.trim(), password);
        }
      } else if (username.trim()) {
        await updateProfile(authUser, {
          displayName: username.trim()
        });
        await authUser.reload();
      }

      setPassword("");
      onAuthenticated?.();
    } catch (submitError) {
      setError(getFriendlyError(submitError));
    } finally {
      setBusy(false);
    }
  }

  if (!authReady) {
    return (
      <section className={`auth-card${compact ? " compact" : ""}`}>
        <div className="section-kicker">Authentication</div>
        <h3>Checking your session</h3>
        <p className="muted-copy">Connecting to Firebase Authentication.</p>
      </section>
    );
  }

  if (authUser && !needsName) {
    return (
      <section className={`auth-card${compact ? " compact" : ""}`}>
        <div className="section-kicker">Signed In</div>
        <h3>{authUser.displayName}</h3>
        <p className="muted-copy">{authUser.email}</p>
        <div className="auth-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={() => signOut(auth)}
          >
            Sign Out
          </button>
          {onAuthenticated ? (
            <button className="primary-button" type="button" onClick={onAuthenticated}>
              Continue
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={`auth-card${compact ? " compact" : ""}`}>
      <div className="section-kicker">Authentication</div>
      <h3>{needsName ? "Choose your username" : title}</h3>
      <p className="muted-copy">
        {needsName ? "This name will appear in live collaboration." : subtitle}
      </p>

      <form className="auth-form" onSubmit={handleSubmit}>
        {mode === "register" || needsName ? (
          <label className="field">
            <span>Username</span>
            <input
              className="text-input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your display name"
              required
            />
          </label>
        ) : null}

        {!needsName ? (
          <>
            <label className="field">
              <span>Email</span>
              <input
                className="text-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                className="text-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 6 characters"
                required
              />
            </label>
          </>
        ) : null}

        {error ? <p className="error-copy">{error}</p> : null}

        <button className="primary-button full-width" type="submit" disabled={busy}>
          {busy
            ? "Please wait..."
            : needsName
              ? "Save Username"
              : mode === "register"
                ? "Create Account"
                : "Sign In"}
        </button>
      </form>

      {!needsName ? (
        <button
          className="link-button"
          type="button"
          onClick={() => setMode(mode === "register" ? "login" : "register")}
        >
          {mode === "register"
            ? "Already have an account? Sign in"
            : "Need an account? Create one"}
        </button>
      ) : null}
    </section>
  );
}
