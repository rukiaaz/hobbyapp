import { useState } from 'react';
import AuthInput from './AuthInput.jsx';

export default function LoginForm({ isLoading = false, onForgotPassword, onSubmit, onSwitchMode, statusMessage }) {
  const [email, setEmail] = useState('');
  function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    onSubmit?.({
      email: formData.get('email'),
      password: formData.get('password'),
    });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <AuthInput
        autoComplete="email"
        id="login-email"
        label="Email"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="avery@example.com"
        required
        type="email"
        value={email}
      />

      <AuthInput
        autoComplete="current-password"
        id="login-password"
        label="Password"
        minLength="6"
        name="password"
        placeholder="Enter your password"
        required
        type="password"
      />

      <div className="auth-row">
        <label className="checkbox-row">
          <input type="checkbox" />
          <span>Remember me</span>
        </label>
        <button className="text-button" onClick={() => onForgotPassword?.(email)} type="button">
          Forgot password?
        </button>
      </div>

      <button className="auth-submit" disabled={isLoading} type="submit">
        {isLoading ? 'Logging in...' : 'Log in'}
      </button>

      {statusMessage && <p className="auth-message">{statusMessage}</p>}

      <p className="auth-note">Email/password users must verify their email before entering the app.</p>

      <p className="auth-switch-copy">
        New to Hobby App?{' '}
        <button className="text-button" onClick={onSwitchMode} type="button">
          Create an account
        </button>
      </p>
    </form>
  );
}
