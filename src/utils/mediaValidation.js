export const MEDIA_LIMITS = {
  chatImageBytes: 8 * 1024 * 1024,
  postImageBytes: 25 * 1024 * 1024,
  postVideoBytes: 80 * 1024 * 1024,
  postVideoSeconds: 90,
};

const POST_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const POST_VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);
const CHAT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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

function getFileType(file) {
  return (file?.type || '').toLowerCase();
}

export function validatePostMediaFile(file) {
  if (!file) {
    return createValidationResult(true);
  }

  const fileType = getFileType(file);
  const isImage = POST_IMAGE_TYPES.has(fileType);
  const isVideo = POST_VIDEO_TYPES.has(fileType);

  if (!isImage && !isVideo) {
    return createValidationResult(false, 'Choose a JPG, PNG, WebP, GIF, MP4, MOV, or WebM file for posts.');
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

  const fileType = getFileType(file);

  if (!CHAT_IMAGE_TYPES.has(fileType)) {
    return createValidationResult(false, 'Chat attachments must be JPG, PNG, WebP, or GIF images.');
  }

  if (file.size > MEDIA_LIMITS.chatImageBytes) {
    return createValidationResult(false, `Chat images must be ${formatBytes(MEDIA_LIMITS.chatImageBytes)} or smaller.`);
  }

  return createValidationResult(true);
}
