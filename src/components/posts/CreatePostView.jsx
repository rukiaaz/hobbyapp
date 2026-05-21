import { useState } from 'react';
import AppIcon from '../common/AppIcon.jsx';
import PostComposer from './PostComposer.jsx';

const studioModes = [
  { id: 'post', label: 'Create post', helper: 'Share a photo and caption to the feed.' },
  { id: 'story', label: 'Create story', helper: 'Preview a lightweight story composer shell.' },
  { id: 'reel', label: 'Create reel', helper: 'Preview a reel editor shell with controls.' },
];

function StoryPreview() {
  return (
    <div className="creation-preview-card story-preview-card">
      <div className="story-preview-phone">
        <div className="story-preview-stage">
          <div className="story-preview-gradient" />
          <div className="story-preview-ui">
            <div className="story-preview-bar" />
            <div className="story-preview-tags">
              <span>Your story</span>
              <span>Close friends</span>
            </div>
            <div className="story-preview-actions">
              <button type="button">Aa</button>
              <button type="button">Stickers</button>
              <button type="button">Music</button>
            </div>
          </div>
        </div>
      </div>
      <p>Story tools appear as a visual shell for now. We can wire upload/publish behavior next.</p>
    </div>
  );
}

function ReelPreview() {
  return (
    <div className="creation-preview-card reel-preview-card">
      <div className="story-preview-phone">
        <div className="story-preview-stage reel-preview-stage">
          <div className="story-preview-gradient sunset" />
          <div className="reel-editor-overlay">
            <div className="reel-timeline" />
            <div className="reel-editor-actions">
              <button type="button">Audio</button>
              <button type="button">Text</button>
              <button type="button">Clips</button>
            </div>
            <div className="reel-editor-bottom">
              <button type="button">Edit cover</button>
              <button type="button">Next</button>
            </div>
          </div>
        </div>
      </div>
      <p>Reel editing is represented as a studio preview for now, matching the wireframe structure.</p>
    </div>
  );
}

export default function CreatePostView({ categories, errorMessage = '', isSubmitting = false, onCreatePost, profile }) {
  const [activeMode, setActiveMode] = useState('post');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleCreatePost(postData) {
    setSuccessMessage('');
    const didCreate = await onCreatePost?.(postData);
    if (didCreate) {
      setSuccessMessage('Your hobby update is live in the feed.');
    }
    return didCreate;
  }

  const activeStudioMode = studioModes.find((mode) => mode.id === activeMode) ?? studioModes[0];

  return (
    <section className="create-view" aria-labelledby="create-view-title">
      <div className="create-studio-header">
        <div>
          <p className="eyebrow">Create</p>
          <h1 id="create-view-title">A single studio for posts, stories, and reels.</h1>
          <p>Start by matching the wireframe layout. We can wire the deeper creator tools after the UI pass.</p>
        </div>
        <div className="create-studio-badge">
          <AppIcon name="create" size={18} />
          <span>{activeStudioMode.label}</span>
        </div>
      </div>

      <div className="create-studio-tabs" aria-label="Creation modes">
        {studioModes.map((mode) => (
          <button
            className={mode.id === activeMode ? 'active' : ''}
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            type="button"
          >
            <strong>{mode.label}</strong>
            <small>{mode.helper}</small>
          </button>
        ))}
      </div>

      {successMessage && <p className="success-message">{successMessage}</p>}
      {errorMessage && <p className="auth-message">{errorMessage}</p>}

      {activeMode === 'post' ? (
        <div className="create-studio-content">
          <PostComposer
            categories={categories}
            isSubmitting={isSubmitting}
            onCreatePost={handleCreatePost}
            profile={profile}
          />
          <div className="creation-preview-card">
            <div className="section-heading">
              <div>
                <p>Post preview</p>
                <span>Desktop and mobile friendly composition</span>
              </div>
            </div>
            <div className="post-preview-surface">
              <div className="post-preview-media" />
              <div className="post-preview-copy">
                <strong>{profile?.displayName || 'Your profile'}</strong>
                <p>Use the composer to create the final feed entry. This side mirrors the wireframe preview block.</p>
              </div>
            </div>
          </div>
        </div>
      ) : activeMode === 'story' ? (
        <StoryPreview />
      ) : (
        <ReelPreview />
      )}
    </section>
  );
}
