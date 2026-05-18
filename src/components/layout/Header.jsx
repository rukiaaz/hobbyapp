export default function Header() {
  return (
    <header className="top-nav">
      <a className="brand" href="#top" aria-label="Hobby App home">
        <span className="brand-mark">H</span>
        <span>Hobby App</span>
      </a>

      <label className="search-box">
        <span className="sr-only">Search hobbies, makers, or posts</span>
        <input type="search" placeholder="Search hobbies" />
      </label>

      <nav className="nav-actions" aria-label="Primary navigation">
        <button type="button">Explore</button>
        <button type="button">Create</button>
        <button className="icon-button" type="button" aria-label="Notifications">
          ♡
        </button>
      </nav>
    </header>
  );
}
