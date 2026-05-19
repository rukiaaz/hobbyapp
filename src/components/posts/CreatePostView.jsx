import { useState } from 'react';
import PostComposer from './PostComposer.jsx';

export default function CreatePostView({ categories, errorMessage = '', isSubmitting = false, onCreatePost, profile }) {
  const [successMessage, setSuccessMessage] = useState('');

  async function handleCreatePost(postData) {
    setSuccessMessage('');

    const didCreate = await onCreatePost?.(postData);

    if (didCreate) {
      setSuccessMessage('Your hobby update is live in the feed.');
    }

    return didCreate;
  }

  return (
    <section className="create-view" aria-labelledby="create-view-title">
      <div className="create-hero">
        <div>
          <p className="eyebrow">Create</p>
          <h1 id="create-view-title">Turn today&apos;s progress into a post.</h1>
          <p>
            Keep it specific: what you tried, what changed, and what another hobbyist could learn
            from your session.
          </p>
        </div>

        <div className="create-tips" aria-label="Posting tips">
          <span>📷 Add a clear photo or short video</span>
          <span>🏷️ Pick the closest hobby category</span>
          <span>💬 Ask for tips, feedback, or encouragement</span>
        </div>
      </div>

      {successMessage && <p className="success-message">{successMessage}</p>}
      {errorMessage && <p className="auth-message">{errorMessage}</p>}

      <PostComposer
        categories={categories}
        isSubmitting={isSubmitting}
        onCreatePost={handleCreatePost}
        profile={profile}
      />
    </section>
  );
}
