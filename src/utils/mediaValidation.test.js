import assert from 'node:assert/strict';
import test from 'node:test';
import { MEDIA_LIMITS, formatBytes, validateChatImageFile, validatePostMediaFile } from './mediaValidation.js';

function file(type, size) {
  return { type, size };
}

test('formatBytes returns readable MB values', () => {
  assert.equal(formatBytes(1024 * 1024), '1.0 MB');
  assert.equal(formatBytes(12 * 1024 * 1024), '12 MB');
});

test('post validation accepts images and videos within limits', () => {
  assert.equal(validatePostMediaFile(file('image/png', MEDIA_LIMITS.postImageBytes)).isValid, true);
  assert.equal(validatePostMediaFile(file('video/mp4', MEDIA_LIMITS.postVideoBytes)).isValid, true);
});

test('post validation rejects unsupported files', () => {
  assert.equal(validatePostMediaFile(file('application/pdf', 100)).isValid, false);
});

test('chat validation only accepts small images', () => {
  assert.equal(validateChatImageFile(file('image/jpeg', MEDIA_LIMITS.chatImageBytes)).isValid, true);
  assert.equal(validateChatImageFile(file('video/mp4', 100)).isValid, false);
  assert.equal(validateChatImageFile(file('image/jpeg', MEDIA_LIMITS.chatImageBytes + 1)).isValid, false);
});
