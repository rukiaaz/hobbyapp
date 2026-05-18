export default function SuggestedCreators({ creators }) {
  return (
    <section className="suggested-card">
      <div className="section-heading">
        <p>Suggested creators</p>
        <button type="button">Refresh</button>
      </div>

      <div className="creator-list">
        {creators.map((creator) => (
          <article className="creator-row" key={creator.id}>
            <div className="mini-avatar" aria-hidden="true">
              {creator.name.slice(0, 1)}
            </div>
            <div>
              <strong>{creator.name}</strong>
              <p>{creator.handle} · {creator.hobby}</p>
              <span>{creator.followers} followers</span>
            </div>
            <button type="button">Follow</button>
          </article>
        ))}
      </div>
    </section>
  );
}
