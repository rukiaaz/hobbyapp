import AuthInput from './AuthInput.jsx';

export default function SignupForm({ isLoading = false, onSocialSignIn, onSubmit, onSwitchMode, statusMessage }) {
  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    onSubmit?.({
      name: formData.get('name'),
      username: formData.get('username'),
      email: formData.get('email'),
      password: formData.get('password'),
    });
  }

  return (
    <form className="auth-form instagram-auth-form" onSubmit={handleSubmit}>
      <button className="google-auth-button" disabled={isLoading} onClick={onSocialSignIn} type="button">
        <span aria-hidden="true">f</span>
        Sign up with Facebook
      </button>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <AuthInput autoComplete="name" id="signup-name" label="Full name" name="name" placeholder="Full name" required />
      <AuthInput autoComplete="username" id="signup-username" label="Username" name="username" placeholder="Username" required />
      <AuthInput autoComplete="email" id="signup-email" label="Email" name="email" placeholder="Email" required type="email" />
      <AuthInput autoComplete="new-password" id="signup-password" label="Password" minLength="6" name="password" placeholder="Password" required type="password" />

      <button className="auth-submit" disabled={isLoading} type="submit">
        {isLoading ? 'Signing up...' : 'Sign up'}
      </button>

      {statusMessage && <p className="auth-message">{statusMessage}</p>}

      <p className="auth-note">By signing up, you agree to our Terms, Privacy Policy, and Cookies Policy.</p>

      <p className="auth-switch-copy">
        Have an account?{' '}
        <button className="text-button" onClick={onSwitchMode} type="button">
          Log in
        </button>
      </p>
    </form>
  );
}
