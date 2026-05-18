import { useEffect, useState } from 'react';

export default function PostComposer({ categories, isSubmitting = false, onCreatePost, profile }) {
  const [caption, setCaption] = useState('');
  const [categoryId, setCategoryId] = useState(categories[1]?.id ?? 'crafts');
  const [hobby, setHobby] = useState(profile?.mainHobby ?? '');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return undefined;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  function handleSubmit(event) {
    event.preventDefault();

    onCreatePost?.({
      caption,
      categoryId,
      hobby,
      imageFile,
      title,
    });

    setCaption('');
    setHobby(profile?.mainHobby ?? '');
    setImageFile(null);
    setTitle('');
    event.currentTarget.reset();
  }

  return (
    <section className="post-composer" aria-labelledby="post-composer-title">
      <div>
        <p className="eyebrow">Create post</p>
        <h2 id="post-composer-title">Share a hobby update</h2>
        <p>Upload a photo, choose a hobby category, and post your progress to the feed.</p>
      </div>

      <form className="composer-form" onSubmit={handleSubmit}>
        <label className="auth-field" htmlFor="post-title">
          <span>Post title</span>
          <input
            id="post-title"
            maxLength="80"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Today&apos;s pottery wheel practice"
            required
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
          />
        </label>

        <label className="upload-dropzone" htmlFor="post-photo">
          <input
            accept="image/*"
            id="post-photo"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          {imagePreview ? (
            <img alt="Selected post preview" src={imagePreview} />
          ) : (
            <span>📷 Upload a photo</span>
          )}
        </label>

        <button className="auth-submit" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Posting...' : 'Post to feed'}
        </button>
      </form>
    </section>
  );
}
