import { useEffect, useState } from 'react';
import { validatePostMediaFile } from '../../utils/mediaValidation.js';

function getMediaKind(file) {
  if (!file) {
    return '';
  }

  return file.type.startsWith('video/') ? 'video' : 'image';
}

export default function PostComposer({ categories, isSubmitting = false, onCreatePost, profile }) {
  const [caption, setCaption] = useState('');
  const [categoryId, setCategoryId] = useState(categories[1]?.id ?? 'crafts');
  const [hobby, setHobby] = useState(profile?.mainHobby ?? '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localError, setLocalError] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState('');
  const [title, setTitle] = useState('');

  const mediaKind = getMediaKind(mediaFile);

  useEffect(() => {
    if (!mediaFile) {
      setMediaPreview('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(mediaFile);
    setMediaPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [mediaFile]);

  useEffect(() => {
    if (!isModalOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSubmitting) {
        closeComposer();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isSubmitting]);

  function clearDraft() {
    setCaption('');
    setHobby(profile?.mainHobby ?? '');
    setLocalError('');
    setMediaFile(null);
    setTitle('');
  }

  function closeComposer() {
    clearDraft();
    setIsModalOpen(false);
  }

  function resetForm(form) {
    clearDraft();
    form.reset();
  }

  function handleMediaChange(file) {
    const validation = validatePostMediaFile(file);

    if (!validation.isValid) {
      setLocalError(validation.message);
      setMediaFile(null);
      return;
    }

    setLocalError('');
    setMediaFile(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validation = validatePostMediaFile(mediaFile);

    if (!validation.isValid) {
      setLocalError(validation.message);
      return;
    }

    const form = event.currentTarget;
    const didCreate = await onCreatePost?.({
      caption,
      categoryId,
      hobby,
      mediaFile,
      title,
    });

    if (didCreate === false) {
      return;
    }

    resetForm(form);
    setIsModalOpen(false);
  }

  return (
    <>
      <section className="post-composer post-composer-compact" aria-label="Create a post">
        <div className="mini-avatar" aria-hidden="true">
          {profile?.avatar || profile?.displayName?.slice(0, 1) || 'H'}
        </div>
        <button className="composer-trigger" onClick={() => setIsModalOpen(true)} type="button">
          Post something about {profile?.mainHobby || 'your hobby'}...
        </button>
        <button
          className="composer-media-shortcut"
          onClick={() => setIsModalOpen(true)}
          type="button"
          aria-label="Create a photo or video post"
        >
          📷
        </button>
      </section>

      {isModalOpen && (
        <div
          className="composer-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              closeComposer();
            }
          }}
        >
          <section
            className="post-composer composer-modal"
            role="dialog"
            aria-labelledby="post-composer-title"
            aria-modal="true"
          >
            <div className="composer-modal-header">
              <div>
                <p className="eyebrow">Create post</p>
                <h2 id="post-composer-title">Share a hobby update</h2>
                <p>Write the update first, then add a photo or video from your device.</p>
              </div>
              <button
                className="more-button"
                disabled={isSubmitting}
                onClick={closeComposer}
                type="button"
                aria-label="Close post composer"
              >
                ×
              </button>
            </div>

            <form className="composer-form composer-modal-form" onSubmit={handleSubmit}>
              <label className="auth-field" htmlFor="post-title">
                <span>Post title</span>
                <input
                  id="post-title"
                  maxLength="80"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Today&apos;s pottery wheel practice"
                  required
                  value={title}
                />
              </label>

              <div className="composer-grid">
                <label className="auth-field" htmlFor="post-category">
                  <span>Category</span>
                  <select
                    id="post-category"
                    onChange={(event) => setCategoryId(event.target.value)}
                    value={categoryId}
                  >
                    {categories
                      .filter((category) => category.id !== 'all')
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="auth-field" htmlFor="post-hobby">
                  <span>Hobby</span>
                  <input
                    id="post-hobby"
                    maxLength="40"
                    onChange={(event) => setHobby(event.target.value)}
                    placeholder="Ceramics"
                    required
                    value={hobby}
                  />
                </label>
              </div>

              <label className="auth-field" htmlFor="post-caption">
                <span>Caption</span>
                <textarea
                  id="post-caption"
                  maxLength="240"
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="What did you make, learn, or try today?"
                  required
                  rows="3"
                  value={caption}
                />
              </label>

              <div className={`upload-dropzone ${mediaPreview ? 'has-preview' : ''}`}>
                <input
                  accept="image/*,video/*"
                  id="post-media"
                  onChange={(event) => handleMediaChange(event.target.files?.[0] ?? null)}
                  type="file"
                />
                {mediaPreview && (
                  mediaKind === 'video' ? (
                    <video controls playsInline preload="metadata" src={mediaPreview} />
                  ) : (
                    <img alt="Selected post preview" src={mediaPreview} />
                  )
                )}
                <label className={mediaPreview ? 'media-change-button' : 'upload-placeholder'} htmlFor="post-media">
                  <span aria-hidden="true">{mediaPreview ? '↻' : '＋'}</span>
                  <strong>{mediaPreview ? 'Change media' : 'Add photo or video'}</strong>
                  {!mediaPreview && <small>Tap the icon to choose media from your device</small>}
                </label>
              </div>

              {localError && <p className="auth-message">{localError}</p>}

              {isSubmitting && (
                <div className="upload-progress" aria-label="Uploading media and publishing post">
                  <span />
                </div>
              )}

              <div className="composer-modal-actions">
                <button className="text-button" disabled={isSubmitting} onClick={closeComposer} type="button">
                  Cancel
                </button>
                <button className="auth-submit" disabled={isSubmitting} type="submit">
                  {isSubmitting ? 'Posting...' : 'Post to feed'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
