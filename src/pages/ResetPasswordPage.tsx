import { useState, FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../data/api";
import CoolSyncLogo from "../components/CoolSyncLogo";

interface ApiError {
  response?: { data?: { error?: string } };
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const linkValid = Boolean(email && token);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.post("Auth/reset-password", { email, token, newPassword: password });
      setDone(true);
    } catch (err) {
      const message = (err as ApiError).response?.data?.error;
      setError(message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.5rem", gap: "0.75rem" }}>
          <CoolSyncLogo size={56} />
          <h1 className="login-title">Choose a New Password</h1>
        </div>

        {!linkValid ? (
          <>
            <p className="auth-error">
              This reset link is incomplete. Please use the link from your email, or request a new one.
            </p>
            <Link to="/forgot-password" className="auth-link">Request a new link</Link>
          </>
        ) : done ? (
          <>
            <p className="auth-success" data-testid="reset-password-success">
              Your password has been reset. You can now sign in with your new password.
            </p>
            <Link to="/" className="auth-link">Go to sign in</Link>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <p className="login-text">New Password</p>
              <input
                className="login-input"
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                data-testid="reset-password-input"
              />
              <p className="login-text">Confirm Password</p>
              <input
                className="login-input"
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                data-testid="reset-password-confirm"
              />
              {error && <p className="auth-error" data-testid="reset-password-error">{error}</p>}
              <button className="button" type="submit" disabled={loading} data-testid="reset-password-submit">
                {loading ? "Resetting…" : "Reset Password"}
              </button>
            </form>
            <Link to="/" className="auth-link">Back to sign in</Link>
          </>
        )}
      </div>
      <p className="login-footer">Powered by NJ Filters © 2025</p>
    </div>
  );
}
