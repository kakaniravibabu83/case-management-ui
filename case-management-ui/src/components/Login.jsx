import { useState } from "react";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="login" aria-labelledby="login-title">
      <section className="login__brand" aria-label="Case management overview">
        <div className="login__brand-content">
          <a className="login__wordmark" href="/" aria-label="Casework home">
            <span className="login__mark" aria-hidden="true">C</span>
            <span>Casework</span>
          </a>
          <div className="login__intro">
            <p className="login__eyebrow">Case management, considered</p>
            <h1>Every case.<br />A clearer path forward.</h1>
            <p className="login__description">
              The secure workspace for teams moving important work from intake to resolution.
            </p>
          </div>
          <div className="login__assurance">
            <span className="login__assurance-icon" aria-hidden="true">✓</span>
            <span>Protected by enterprise-grade security</span>
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
            <p>Enter your details to continue managing your cases.</p>
          </div>

          <form className="login__form" onSubmit={handleSubmit}>
            <div className="login__field">
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" required autoFocus />
            </div>
            <div className="login__field">
              <div className="login__label-row">
                <label htmlFor="password">Password</label>
                <a href="#reset-password">Forgot password?</a>
              </div>
              <div className="login__password-wrap">
                <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" required />
                <button className="login__password-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <label className="login__checkbox">
              <input type="checkbox" name="remember" />
              <span>Keep me signed in</span>
            </label>
            <button className="login__submit" type="submit">Sign in <span aria-hidden="true">→</span></button>
            {submitted && <p className="login__message" role="status">Your credentials are ready to be securely verified.</p>}
          </form>

          <p className="login__support">Need help accessing your account? <a href="mailto:support@example.com">Contact support</a></p>
        </div>
      </section>
    </main>
  );
}
