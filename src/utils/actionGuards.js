const actionTimestamps = new Map();

const DEFAULT_COOLDOWNS_MS = {
  comment: 3500,
  follow: 1200,
  message: 900,
  post: 8000,
  reaction: 500,
  report: 10000,
  save: 500,
  share: 1200,
  uploadSignature: 1000,
};

function createCooldownError(action, remainingMs) {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const error = new Error(`Slow down — try ${action} again in ${seconds}s.`);
  error.code = 'rate-limit/client-cooldown';
  error.retryAfterSeconds = seconds;
  return error;
}

export function enforceClientCooldown(action, overrideMs) {
  const cooldownMs = overrideMs ?? DEFAULT_COOLDOWNS_MS[action] ?? 1000;
  const now = Date.now();
  const lastRunAt = actionTimestamps.get(action) ?? 0;
  const remainingMs = cooldownMs - (now - lastRunAt);

  if (remainingMs > 0) {
    throw createCooldownError(action, remainingMs);
  }

  actionTimestamps.set(action, now);
}

export function resetClientCooldown(action) {
  if (action) {
    actionTimestamps.delete(action);
    return;
  }

  actionTimestamps.clear();
}
