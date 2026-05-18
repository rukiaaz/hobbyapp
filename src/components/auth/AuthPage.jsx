import { useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../../services/firebase.js';
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
      'Firebase Auth is not fully enabled for this project. In Firebase Console, open Authentication and enable Email/Password and Google sign-in.',
    'auth/email-already-in-use': 'That email is already registered. Try logging in instead.',
    'auth/invalid-api-key': 'The Firebase API key is invalid. Check VITE_FIREBASE_API_KEY in .env.local.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/network-request-failed': 'Network request failed. Check your internet connection and try again.',
    'auth/operation-not-allowed':
      'This sign-in provider is not enabled. Enable Email/Password and Google in Firebase Console → Authentication → Sign-in method.',
    'auth/popup-blocked': 'The Google sign-in popup was blocked. Allow popups for this site and try again.',
    'auth/popup-closed-by-user': 'The Google sign-in popup was closed before completing sign-in.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
    'auth/unauthorized-domain':
      'This domain is not authorized in Firebase Authentication settings. Add localhost or your deployed domain in Authorized domains.',
    'auth/weak-password': 'Password should be at least 6 characters.',
  };

  return `${messages[error.code] ?? fallback} (${error.code})`;
}

export default function AuthPage({ mode = 'login', onComplete, onModeChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const isSignup = mode === 'signup';
  const title = isSignup ? 'Create your Hobby App account' : 'Welcome back to Hobby App';
  const subtitle = isSignup
    ? 'Start following hobby communities and sharing your progress.'
    : 'Log in to return to your hobbies, creators, and saved inspiration.';

  useEffect(() => {
    setStatusMessage('');
  }, [mode]);

  async function runAuthAction(action, missingConfigMessage) {
    if (!isFirebaseConfigured) {
      setStatusMessage(missingConfigMessage);
      return;
    }

    setIsLoading(true);
    setStatusMessage('');

    try {
      await action();
      onComplete?.();
    } catch (error) {
      setStatusMessage(getFriendlyAuthError(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin({ email, password }) {
    await runAuthAction(
      () => signInWithEmailAndPassword(auth, email, password),
      'Add your Firebase values to .env.local before logging in.',
    );
  }

  async function handleSignup({ email, name, password }) {
    await runAuthAction(async () => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
    }, 'Add your Firebase values to .env.local before creating an account.');
  }

  async function handleGoogleSignIn() {
    await runAuthAction(
      () => signInWithPopup(auth, googleProvider),
      'Add your Firebase values to .env.local before using Google sign-in.',
    );
  }

  return (
    <main className="auth-layout" aria-labelledby="auth-title">
      <section className="auth-hero-panel" aria-label="Hobby App authentication intro">
        <p className="eyebrow">Hobby App</p>
        <h1>Share progress, not perfection.</h1>
        <p>
          A social space for makers, runners, musicians, cooks, gardeners, artists, and every
          hobbyist in between.
        </p>

        <div className="auth-preview-stack" aria-label="Sample hobby highlights">
          <article>
            <span>🎨</span>
            <div>
              <strong>Ceramics club</strong>
              <p>248 makers shared glaze tests this week.</p>
            </div>
          </article>
          <article>
            <span>🥾</span>
            <div>
              <strong>Outdoor streaks</strong>
              <p>Trail runners are posting sunrise routes.</p>
            </div>
          </article>
          <article>
            <span>🍳</span>
            <div>
              <strong>Weekend bakes</strong>
              <p>Focaccia experiments are trending.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="auth-card" aria-label={isSignup ? 'Sign up form' : 'Login form'}>
        <div className="auth-card-header">
          <p className="eyebrow">{isSignup ? 'Sign up' : 'Log in'}</p>
          <h2 id="auth-title">{title}</h2>
          <p>{subtitle}</p>
        </div>

        <div className="auth-switcher" aria-label="Authentication screen switcher">
          <button
            className={!isSignup ? 'active' : ''}
            onClick={() => onModeChange?.('login')}
            type="button"
          >
            Log in
          </button>
          <button
            className={isSignup ? 'active' : ''}
            onClick={() => onModeChange?.('signup')}
            type="button"
          >
            Sign up
          </button>
        </div>

        <button className="google-auth-button" disabled={isLoading} onClick={handleGoogleSignIn} type="button">
          <span aria-hidden="true">G</span>
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or use email and password</span>
        </div>

        {isSignup ? (
          <SignupForm
            isLoading={isLoading}
            onSubmit={handleSignup}
            onSwitchMode={() => onModeChange?.('login')}
            statusMessage={statusMessage}
          />
        ) : (
          <LoginForm
            isLoading={isLoading}
            onSubmit={handleLogin}
            onSwitchMode={() => onModeChange?.('signup')}
            statusMessage={statusMessage}
          />
        )}
      </section>
    </main>
  );
}
