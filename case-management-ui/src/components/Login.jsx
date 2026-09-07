import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError("");

    if (!email.trim()) {
      setLocalError("Please enter your email address.");
      return;
    }

    try {
      await login(email.trim(), password, remember);
    } catch (err) {
      setLocalError(
        err.message || "Failed to sign in. Please verify your email."
      );
    }
  };

  const handleQuickFill = (testEmail) => {
    setEmail(testEmail);
    setPassword("password123");
    setLocalError("");
  };

  const displayError = localError || error;

  return (
    <main className="login" aria-labelledby="login-title">
      <section className="login__brand" aria-label="Case management overview">
        <div className="login__brand-content">
          <a className="login__wordmark" href="/" aria-label="Casework home">
            <span className="login__mark" aria-hidden="true">
              C
            </span>
            <span>Casework</span>
          </a>
          <div className="login__intro">
            <p className="login__eyebrow">Enterprise Case Management</p>
            <h1>
              Every case.
              <br />A clearer path forward.
            </h1>
            <p className="login__description">
              The secure workspace for teams moving important work from intake
              to resolution. Group-scoped authorization powered by Camunda
              workflows.
            </p>
          </div>
          <div className="login__assurance">
            <span className="login__assurance-icon" aria-hidden="true">
              ✓
            </span>
            <span>Validated against Camunda Group & Role directory</span>
          </div>
        </div>
        <div className="login__orb login__orb--one" aria-hidden="true" />
        <div className="login__orb login__orb--two" aria-hidden="true" />
      </section>

      <section className="login__panel">
        <div className="login__form-wrap">
          <div className="login__heading">
            <p className="login__kicker">Welcome back</p>
            <h2 id="login-title">Sign in to your workspace</h2>
            <p>Enter your email to authenticate with your assigned group.</p>
          </div>

          <form className="login__form" onSubmit={handleSubmit}>
            {displayError && (
              <div className="login__error" role="alert">
                <span className="login__error-icon">⚠️</span>
                <span>{displayError}</span>
              </div>
            )}

            <div className="login__field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
              />
            </div>

            <div className="login__field">
              <div className="login__label-row">
                <label htmlFor="password">Password</label>
                <span className="login__hint-label">(pass-through)</span>
              </div>
              <div className="login__password-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter any password"
                  required
                />
                <button
                  className="login__password-toggle"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <label className="login__checkbox">
              <input
                type="checkbox"
                name="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Keep me signed in</span>
            </label>

            <button className="login__submit" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="login__spinner" aria-hidden="true" />
                  <span>Validating credentials…</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <div className="login__quick-fill">
            <span className="login__quick-title">Quick demo credentials:</span>
            <div className="login__quick-buttons">
              <button
                type="button"
                className="login__quick-btn"
                onClick={() => handleQuickFill("jane.doe@example.com")}
              >
                jane.doe@example.com (GROUP_BK)
              </button>
              <button
                type="button"
                className="login__quick-btn"
                onClick={() => handleQuickFill("sam@example.com")}
              >
                sam@example.com (GROUP_SAM_TEAM)
              </button>
              <button
                type="button"
                className="login__quick-btn"
                onClick={() => handleQuickFill("biz.confirm@example.com")}
              >
                biz.confirm@example.com (Business Confirmation)
              </button>
              <button
                type="button"
                className="login__quick-btn"
                onClick={() => handleQuickFill("legal.review@example.com")}
              >
                legal.review@example.com (Legal Review)
              </button>
              <button
                type="button"
                className="login__quick-btn"
                onClick={() => handleQuickFill("biz.approval@example.com")}
              >
                biz.approval@example.com (Business Approval)
              </button>
              <button
                type="button"
                className="login__quick-btn"
                onClick={() => handleQuickFill("finance.approval@example.com")}
              >
                finance.approval@example.com (Finance Approval)
              </button>
              <button
                type="button"
                className="login__quick-btn"
                onClick={() => handleQuickFill("procurement@example.com")}
              >
                procurement@example.com (Procurement Team)
              </button>
            </div>
          </div>

          <p className="login__support">
            Need help accessing your account?{" "}
            <a href="mailto:support@example.com">Contact support</a>
          </p>
        </div>
      </section>
    </main>
  );
}
