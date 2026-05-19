export const MEDIA_LIMITS = {
  chatImageBytes: 8 * 1024 * 1024,
  postImageBytes: 25 * 1024 * 1024,
  postVideoBytes: 80 * 1024 * 1024,
};

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 MB';
  }

  const megabytes = bytes / (1024 * 1024);
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

function createValidationResult(isValid, message = '') {
  return { isValid, message };
}

export function validatePostMediaFile(file) {
  if (!file) {
    return createValidationResult(true);
  }

  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  if (!isImage && !isVideo) {
    return createValidationResult(false, 'Choose an image or video file for posts.');
  }

  const maxBytes = isVideo ? MEDIA_LIMITS.postVideoBytes : MEDIA_LIMITS.postImageBytes;

  if (file.size > maxBytes) {
    return createValidationResult(
      false,
      `${isVideo ? 'Videos' : 'Images'} must be ${formatBytes(maxBytes)} or smaller.`,
    );
  }

  return createValidationResult(true);
}

export function validateChatImageFile(file) {
  if (!file) {
    return createValidationResult(true);
  }

  if (!file.type.startsWith('image/')) {
    return createValidationResult(false, 'Chat attachments must be image files.');
  }

  if (file.size > MEDIA_LIMITS.chatImageBytes) {
    return createValidationResult(false, `Chat images must be ${formatBytes(MEDIA_LIMITS.chatImageBytes)} or smaller.`);
  }

  return createValidationResult(true);
}
