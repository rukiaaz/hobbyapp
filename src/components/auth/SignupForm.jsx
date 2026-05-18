import AuthInput from './AuthInput.jsx';

export default function SignupForm({ isLoading = false, onSubmit, onSwitchMode, statusMessage }) {
  function handleSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    onSubmit?.({
      name: formData.get('name'),
      username: formData.get('username'),
      email: formData.get('email'),
      password: formData.get('password'),
      hobby: formData.get('hobby'),
    });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="auth-form-grid">
        <AuthInput
          autoComplete="name"
          id="signup-name"
          label="Full name"
          name="name"
          placeholder="Avery Stone"
          required
        />

        <AuthInput
          autoComplete="username"
          id="signup-username"
          label="Username"
          name="username"
          placeholder="averymakes"
          required
        />
      </div>

      <AuthInput
        autoComplete="email"
        id="signup-email"
        label="Email"
        name="email"
        placeholder="avery@example.com"
        required
        type="email"
      />

      <AuthInput
        autoComplete="new-password"
        id="signup-password"
        label="Password"
        minLength="6"
        name="password"
        placeholder="Create a password"
        required
        type="password"
      />

      <label className="auth-field" htmlFor="signup-hobby">
        <span>Main hobby</span>
        <select id="signup-hobby" name="hobby" defaultValue="" required>
          <option value="" disabled>
            Choose a hobby
          </option>
          <option>Ceramics</option>
          <option>Trail Running</option>
          <option>Music Production</option>
          <option>Houseplants</option>
          <option>Baking</option>
          <option>Urban Sketching</option>
        </select>
      </label>

      <label className="checkbox-row">
        <input required type="checkbox" />
        <span>I agree to the placeholder community guidelines.</span>
      </label>

      <button className="auth-submit" disabled={isLoading} type="submit">
        {isLoading ? 'Creating account...' : 'Create account'}
      </button>

      {statusMessage && <p className="auth-message">{statusMessage}</p>}

      <p className="auth-note">Use a real email. We send a verification link before unlocking the app.</p>

      <p className="auth-switch-copy">
        Already have an account?{' '}
        <button className="text-button" onClick={onSwitchMode} type="button">
          Log in
        </button>
      </p>
    </form>
  );
}
