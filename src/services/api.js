import { getFunctions, httpsCallable } from 'firebase/functions';
import app, { isFirebaseConfigured } from './firebase.js';

const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';
const useDirectFirestoreFallback = import.meta.env.VITE_ALLOW_DIRECT_FIRESTORE_WRITES === 'true';

let functionsInstance = null;

function getFunctionsClient() {
  if (!isFirebaseConfigured || !app) {
    return null;
  }

  if (!functionsInstance) {
    functionsInstance = getFunctions(app, functionsRegion);
  }

  return functionsInstance;
}

export function shouldUseDirectFirestoreFallback() {
  return useDirectFirestoreFallback;
}

export async function callAppFunction(name, payload = {}) {
  const functionsClient = getFunctionsClient();

  if (!functionsClient) {
    const error = new Error('Firebase Functions are not configured.');
    error.code = 'functions/not-configured';
    throw error;
  }

  const callable = httpsCallable(functionsClient, name);
  const result = await callable(payload);
  return result.data;
}

export function getServiceErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error?.code) {
    return fallback;
  }

  const messages = {
    'already-exists': 'That value is already taken. Choose another one.',
    'failed-precondition': 'This action needs one more setup step before it can continue.',
    'functions/not-configured': 'Backend functions are not configured for this environment.',
    'invalid-argument': error.message || 'Check the fields and try again.',
    'not-found': 'That item could not be found.',
    'permission-denied': error.message || 'You do not have permission to do that.',
    'resource-exhausted': error.message || 'Slow down and try again shortly.',
    'unauthenticated': 'Sign in before continuing.',
  };

  return `${messages[error.code] ?? fallback} (${error.code})`;
}
