import { useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import { Lock, Mail, User, Waypoints } from "lucide-react";

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

function Field({
  icon: Icon,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false
}) {
  return (
    <label className="portal-field">
      <span>{label}</span>
      <div className="portal-input-wrap">
        <Icon className="portal-input-icon" />
        <input
          className="portal-input"
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
        />
      </div>
    </label>
  );
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
        <div className="portal-brand">
          <span className="portal-brand-mark">
            <Waypoints className="portal-brand-icon" />
          </span>
          <span>PeerSync</span>
        </div>
        <h2>Checking your session</h2>
        <p className="portal-copy">Connecting to Firebase Authentication.</p>
      </section>
    );
  }

  if (authUser && !needsName) {
    return (
      <section className={`auth-card${compact ? " compact" : ""}`}>
        <div className="portal-brand">
          <span className="portal-brand-mark">
            <Waypoints className="portal-brand-icon" />
          </span>
          <span>PeerSync</span>
        </div>
        <h2>{authUser.displayName}</h2>
        <p className="portal-copy">{authUser.email}</p>
        <div className="portal-action-row">
          <button className="ghost-button" type="button" onClick={() => signOut(auth)}>
            Sign out
          </button>
          {onAuthenticated ? (
            <button className="gradient-button" type="button" onClick={onAuthenticated}>
              Continue
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={`auth-card${compact ? " compact" : ""}`}>
      <div className="portal-brand">
        <span className="portal-brand-mark">
          <Waypoints className="portal-brand-icon" />
        </span>
        <span>PeerSync</span>
      </div>

      {!needsName ? (
        <div className="portal-tabs">
          <button
            className={`portal-tab${mode === "login" ? " active" : ""}`}
            type="button"
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            className={`portal-tab${mode === "register" ? " active" : ""}`}
            type="button"
            onClick={() => setMode("register")}
          >
            Sign up
          </button>
        </div>
      ) : null}

      <h2>{needsName ? "Choose your username" : title}</h2>
      <p className="portal-copy">
        {needsName ? "This name will appear in the live collaborator list." : subtitle}
      </p>

      <form className="portal-form" onSubmit={handleSubmit}>
        {(mode === "register" || needsName) && (
          <Field
            icon={User}
            label="Username"
            value={username}
            onChange={setUsername}
            placeholder="aanya"
            required
          />
        )}

        {!needsName && (
          <>
            <Field
              icon={Mail}
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              required
            />
            <Field
              icon={Lock}
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
            />
          </>
        )}

        {error ? <p className="portal-error">{error}</p> : null}

        <button className="gradient-button full-width" type="submit" disabled={busy}>
          {busy
            ? "Please wait..."
            : needsName
              ? "Save username"
              : mode === "register"
                ? "Create account"
                : "Sign in"}
        </button>
      </form>
    </section>
  );
}
