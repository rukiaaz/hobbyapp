import { hobbyCategories, posts, suggestedCreators, userProfile } from './data/mockData.js';
import HobbyTabs from './components/hobbies/HobbyTabs.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import Header from './components/layout/Header.jsx';
import PostCard from './components/posts/PostCard.jsx';
import PostGrid from './components/posts/PostGrid.jsx';
import ProfileHeader from './components/profile/ProfileHeader.jsx';
import SuggestedCreators from './components/sidebar/SuggestedCreators.jsx';

export default function App() {
  return (
    <div className="app-shell">
      <Header />

      <main className="layout">
        <section className="main-column" aria-label="Hobby feed">
          <ProfileHeader profile={userProfile} />
          <HobbyTabs categories={hobbyCategories} />
          <PostGrid posts={posts} />

          <section className="feed-stack" aria-label="Recent hobby posts">
            <div className="section-heading">
              <p>Fresh from your hobbies</p>
              <button type="button">View all</button>
            </div>

            {posts.slice(0, 3).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </section>
        </section>

        <aside className="side-column" aria-label="Suggested creators">
          <SuggestedCreators creators={suggestedCreators} />
        </aside>
      </main>

      <BottomNav />
    </div>
  );
}
