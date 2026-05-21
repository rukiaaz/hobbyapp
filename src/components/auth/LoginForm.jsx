import { useState } from 'react';
import AuthInput from './AuthInput.jsx';

export default function LoginForm({ isLoading = false, onForgotPassword, onSocialSignIn, onSubmit, onSwitchMode, statusMessage }) {
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
    <form className="auth-form instagram-auth-form" onSubmit={handleSubmit}>
      <AuthInput
        autoComplete="email"
        id="login-email"
        label="Phone number, username, or email"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Phone number, username, or email"
        required
        type="text"
        value={email}
      />

      <AuthInput
        autoComplete="current-password"
        id="login-password"
        label="Password"
        minLength="6"
        name="password"
        placeholder="Password"
        required
        type="password"
      />

      <button className="auth-submit" disabled={isLoading} type="submit">
        {isLoading ? 'Logging in...' : 'Log in'}
      </button>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <button className="google-auth-button" disabled={isLoading} onClick={onSocialSignIn} type="button">
        <span aria-hidden="true">f</span>
        Log in with Facebook
      </button>

      <button className="text-button auth-inline-link" onClick={() => onForgotPassword?.(email)} type="button">
        Forgot password?
      </button>

      {statusMessage && <p className="auth-message">{statusMessage}</p>}

      <p className="auth-switch-copy">
        Don&apos;t have an account?{' '}
        <button className="text-button" onClick={onSwitchMode} type="button">
          Sign up
        </button>
      </p>
    </form>
  );
}
