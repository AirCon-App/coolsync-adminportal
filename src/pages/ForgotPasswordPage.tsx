import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import api from "../data/api";
import CoolSyncLogo from "../components/CoolSyncLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("Auth/forgot-password", { email });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.5rem", gap: "0.75rem" }}>
          <CoolSyncLogo size={56} />
          <h1 className="login-title">Reset Password</h1>
        </div>

        {submitted ? (
          <>
            <p className="auth-success" data-testid="forgot-password-success">
              If that email is registered, a reset link is on its way. Check your inbox — the link expires in 24 hours.
            </p>
            <Link to="/" className="auth-link">Back to sign in</Link>
          </>
        ) : (
          <>
            <p className="login-text" style={{ marginBottom: "0.75rem" }}>
              Enter your account email and we&apos;ll send you a link to reset your password.
            </p>
            <form onSubmit={handleSubmit}>
              <p className="login-text">Email</p>
              <input
                className="login-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                data-testid="forgot-password-email"
              />
              {error && <p className="auth-error" data-testid="forgot-password-error">{error}</p>}
              <button className="button" type="submit" disabled={loading} data-testid="forgot-password-submit">
                {loading ? "Sending…" : "Send Reset Link"}
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
