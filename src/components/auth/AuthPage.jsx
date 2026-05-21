import { useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { posts } from '../../data/mockData.js';
import { auth, googleProvider, isFirebaseConfigured } from '../../services/firebase.js';
import AppIcon from '../common/AppIcon.jsx';
import LoginForm from './LoginForm.jsx';
import SignupForm from './SignupForm.jsx';

function getFriendlyAuthError(error) {
  const fallback = 'Authentication failed. Please check your details and try again.';

  if (!error?.code) {
    return fallback;
  }

  const messages = {
    'auth/account-exists-with-different-credential':
      'This email already uses a different sign-in method. Try email/password or another provider.',
    'auth/cancelled-popup-request': 'The Google sign-in popup was cancelled. Try again.',
    'auth/configuration-not-found':
      'Firebase Auth is not fully enabled for this project. Enable Email/Password and Google sign-in first.',
    'auth/email-already-in-use': 'That email is already registered. Try logging in instead.',
    'auth/invalid-api-key': 'The Firebase API key is invalid. Check VITE_FIREBASE_API_KEY in .env.local.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/network-request-failed': 'Network request failed. Check your internet connection and try again.',
    'auth/operation-not-allowed': 'This sign-in provider is not enabled. Enable Email/Password and Google.',
    'auth/popup-blocked': 'The Google sign-in popup was blocked. Allow popups for this site and try again.',
    'auth/popup-closed-by-user': 'The Google sign-in popup was closed before completing sign-in.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/user-not-found': 'No account exists for that email yet. Try signing up instead.',
    'auth/unauthorized-domain': 'This domain is not authorized in Firebase Authentication settings.',
    'auth/weak-password': 'Password should be at least 6 characters.',
  };

  return `${messages[error.code] ?? fallback} (${error.code})`;
}

function needsEmailVerification(user) {
  return user?.providerData.some((provider) => provider.providerId === 'password') && !user.emailVerified;
}

function RecoveryForm({ email, isLoading, onBack, onChangeEmail, onSubmit, statusMessage }) {
  return (
    <div className="auth-card auth-single-card" aria-label="Trouble logging in">
      <div className="auth-illustration">
        <span className="auth-illustration-ring">
          <AppIcon name="lock" size={30} />
        </span>
      </div>
      <div className="auth-card-header auth-card-center">
        <h2>Trouble logging in?</h2>
        <p>Enter your email, phone, or username and we&apos;ll send you a link to get back into your account.</p>
      </div>
      <form className="auth-form instagram-auth-form" onSubmit={onSubmit}>
        <label className="auth-field compact-field" htmlFor="recovery-email">
          <span>Email</span>
          <input
            id="recovery-email"
            onChange={(event) => onChangeEmail(event.target.value)}
            placeholder="Email, phone number, or username"
            required
            type="email"
            value={email}
          />
        </label>
        <button className="auth-submit" disabled={isLoading} type="submit">
          {isLoading ? 'Sending...' : 'Send login link'}
        </button>
        {statusMessage && <p className="auth-message">{statusMessage}</p>}
        <button className="text-button auth-inline-link" onClick={onBack} type="button">
          Back to login
        </button>
      </form>
    </div>
  );
}

function RecoverySent({ email, onBack, onNext, statusMessage }) {
  return (
    <div className="auth-card auth-single-card" aria-label="Check your email">
      <div className="auth-illustration">
        <span className="auth-illustration-ring vibrant">
          <AppIcon name="check" size={30} />
        </span>
      </div>
      <div className="auth-card-header auth-card-center">
        <h2>Check your email</h2>
        <p>We sent a login link to {email || 'your inbox'}. Please check your email and tap the link to get back into your account.</p>
      </div>
      {statusMessage && <p className="auth-message">{statusMessage}</p>}
      <div className="auth-aux-actions">
        <button className="auth-submit" onClick={onNext} type="button">
          Create new password
        </button>
        <button className="text-button auth-inline-link" onClick={onBack} type="button">
          Back to login
        </button>
      </div>
    </div>
  );
}

function ResetPasswordMock({ isLoading, onBackToLogin, onSubmit, statusMessage }) {
  return (
    <div className="auth-card auth-single-card" aria-label="Create new password">
      <div className="auth-illustration">
        <span className="auth-illustration-ring">
          <AppIcon name="lock" size={30} />
        </span>
      </div>
      <div className="auth-card-header auth-card-center">
        <h2>Create new password</h2>
        <p>This screen mirrors the wireframe. Hook it to Firebase reset confirmation next if you want the full live flow.</p>
      </div>
      <form className="auth-form instagram-auth-form" onSubmit={onSubmit}>
        <label className="auth-field compact-field" htmlFor="reset-password">
          <span>New password</span>
          <input id="reset-password" minLength="6" name="password" placeholder="New password" required type="password" />
        </label>
        <label className="auth-field compact-field" htmlFor="reset-confirm">
          <span>Confirm new password</span>
          <input id="reset-confirm" minLength="6" name="confirmPassword" placeholder="Confirm new password" required type="password" />
        </label>
        <button className="auth-submit" disabled={isLoading} type="submit">
          Reset password
        </button>
        {statusMessage && <p className="auth-message">{statusMessage}</p>}
        <button className="text-button auth-inline-link" onClick={onBackToLogin} type="button">
          Back to login
        </button>
      </form>
    </div>
  );
}

export default function AuthPage({ initialMessage = '', mode = 'login', onComplete, onModeChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(initialMessage);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const collagePosts = useMemo(() => posts.slice(0, 8), []);
  const isSignup = mode === 'signup';
  const isRecover = mode === 'recover';
  const isRecoverSent = mode === 'recover-sent';
  const isReset = mode === 'reset';

  useEffect(() => {
    setStatusMessage(initialMessage);
  }, [initialMessage]);

  async function runAuthAction(action, missingConfigMessage) {
    if (!isFirebaseConfigured) {
      setStatusMessage(missingConfigMessage);
      return;
    }

    setIsLoading(true);
    setStatusMessage('');

    try {
      const result = await action();
      if (result?.user) {
        onComplete?.(result.user);
      }
    } catch (error) {
      setStatusMessage(getFriendlyAuthError(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin({ email, password }) {
    await runAuthAction(async () => {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      if (needsEmailVerification(userCredential.user)) {
        try {
          await sendEmailVerification(userCredential.user);
        } catch (error) {
          if (error.code !== 'auth/too-many-requests') {
            throw error;
          }
        }

        await signOut(auth);
        setStatusMessage('Please verify your email before entering Vibely. We sent a verification link to your inbox.');
        return null;
      }

      return userCredential;
    }, 'Firebase is not configured. Add your keys to .env.local and restart the dev server.');
  }

  async function handleSignup({ email, name, password }) {
    await runAuthAction(async () => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      setStatusMessage('Account created. We sent a verification email. Verify it first, then log in to continue.');
      onModeChange?.('login');
      return null;
    }, 'Firebase is not configured. Add your keys to .env.local and restart the dev server.');
  }

  async function handlePasswordResetSubmit(event) {
    event.preventDefault();

    if (!recoveryEmail) {
      setStatusMessage('Enter your email first.');
      return;
    }

    await runAuthAction(async () => {
      await sendPasswordResetEmail(auth, recoveryEmail);
      onModeChange?.('recover-sent');
      setStatusMessage('Password reset email sent. Check your inbox and spam folder.');
      return null;
    }, 'Firebase is not configured. Add your keys to .env.local and restart the dev server.');
  }

  async function handleGoogleSignIn() {
    if (!isFirebaseConfigured) {
      setStatusMessage('Firebase is not configured. Add your keys to .env.local and restart the dev server.');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Opening Google account picker...');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      onComplete?.(result.user);
    } catch (error) {
      setStatusMessage(getFriendlyAuthError(error));
    } finally {
      setIsLoading(false);
    }
  }

  function handleRecoveryEntry(email) {
    setRecoveryEmail(email);
    setStatusMessage('');
    onModeChange?.('recover');
  }

  function handleResetMockSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');

    if (password !== confirmPassword) {
      setStatusMessage('Passwords do not match.');
      return;
    }

    setStatusMessage('Password screen complete. Wire this step to Firebase reset confirmation when you are ready.');
    onModeChange?.('login');
  }

  return (
    <main className={`auth-layout vibe-auth-layout ${isSignup ? 'signup-screen' : ''} ${isRecover || isRecoverSent || isReset ? 'single-screen' : ''}`} aria-labelledby="auth-title">
      {!isRecover && !isRecoverSent && !isReset && (
        <section className={`auth-wireframe-showcase ${isSignup ? 'signup' : 'login'}`} aria-label="Vibely authentication intro">
          <div className="auth-showcase-brand">
            <span className="brand-wordmark">Vibely</span>
            <p>Capture and share the world&apos;s moments.</p>
          </div>
          <div className="auth-collage-grid">
            {collagePosts.map((post) => (
              <div className="auth-collage-tile" key={post.id}>
                <img alt="" src={post.imageUrl} />
              </div>
            ))}
          </div>
        </section>
      )}

      {isRecover ? (
        <RecoveryForm
          email={recoveryEmail}
          isLoading={isLoading}
          onBack={() => onModeChange?.('login')}
          onChangeEmail={setRecoveryEmail}
          onSubmit={handlePasswordResetSubmit}
          statusMessage={statusMessage}
        />
      ) : isRecoverSent ? (
        <RecoverySent
          email={recoveryEmail}
          onBack={() => onModeChange?.('login')}
          onNext={() => onModeChange?.('reset')}
          statusMessage={statusMessage}
        />
      ) : isReset ? (
        <ResetPasswordMock
          isLoading={isLoading}
          onBackToLogin={() => onModeChange?.('login')}
          onSubmit={handleResetMockSubmit}
          statusMessage={statusMessage}
        />
      ) : (
        <section className="auth-card auth-wireframe-card" aria-label={isSignup ? 'Sign up form' : 'Login form'}>
          <div className="auth-card-header auth-card-center">
            <span className="brand-wordmark auth-logo-wordmark">Vibely</span>
            <p id="auth-title">
              {isSignup
                ? 'Sign up to see photos and videos from your friends.'
                : 'Sign in to see photos, videos, and hobby updates from your circle.'}
            </p>
          </div>

          {isSignup ? (
            <SignupForm
              isLoading={isLoading}
              onSocialSignIn={handleGoogleSignIn}
              onSubmit={handleSignup}
              onSwitchMode={() => onModeChange?.('login')}
              statusMessage={statusMessage}
            />
          ) : (
            <LoginForm
              isLoading={isLoading}
              onForgotPassword={handleRecoveryEntry}
              onSocialSignIn={handleGoogleSignIn}
              onSubmit={handleLogin}
              onSwitchMode={() => onModeChange?.('signup')}
              statusMessage={statusMessage}
            />
          )}
        </section>
      )}
    </main>
  );
}
