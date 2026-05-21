import assert from 'node:assert/strict';
import test from 'node:test';
import { enforceClientCooldown, resetClientCooldown } from './actionGuards.js';

test('client cooldown blocks rapid repeat actions', () => {
  resetClientCooldown();
  enforceClientCooldown('test-action', 1000);
  assert.throws(() => enforceClientCooldown('test-action', 1000), /Slow down/);
  resetClientCooldown('test-action');
  assert.doesNotThrow(() => enforceClientCooldown('test-action', 1000));
});
