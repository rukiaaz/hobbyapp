# Hobby App Home Feed Roadmap

## Context

Hobby App currently has a React + Vite frontend scaffold with reusable components, mock hobby posts, a profile header, a post grid, and basic responsive styling. The next feature focus is a clearer Instagram-inspired **Home Feed** that shows hobby-related posts and works well on mobile and desktop.

## Approach

Create a dedicated home feed structure that keeps the app scaffold simple while making the post feed the main experience. The home screen should be the primary first screen, hobby tabs should filter posts, and placeholder gradient images should remain for now. Reuse the existing mock post data, hobby category tabs, post card UI, header, bottom navigation, and sidebar components. The plan will separate page-level composition from reusable UI components so future team members can expand the feed later with backend data, real images, authentication, and routing.

## Files to modify

- `src/App.jsx`
- `src/data/mockData.js`
- `src/components/feed/HomeFeed.jsx`
- `src/components/posts/PostCard.jsx`
- `src/components/hobbies/HobbyTabs.jsx`
- `src/components/layout/Header.jsx`
- `src/components/layout/BottomNav.jsx`
- `src/components/sidebar/SuggestedCreators.jsx`
- `src/styles.css`
- `README.md`

## Reuse

- `src/components/posts/PostCard.jsx` — reuse as the main feed item component.
- `src/components/hobbies/HobbyTabs.jsx` — reuse for hobby/category filtering UI.
- `src/components/layout/Header.jsx` — reuse for top navigation and search.
- `src/components/layout/BottomNav.jsx` — reuse as mobile-first navigation.
- `src/components/sidebar/SuggestedCreators.jsx` — reuse for desktop sidebar recommendations.
- `src/data/mockData.js` — expand existing hobby post data instead of adding backend/API logic.
- `src/styles.css` — build on current responsive CSS and placeholder gradient image system.

## Steps

- [x] Add a page-level home feed area in `App.jsx` or a new lightweight `HomeFeed` component if the project needs clearer separation.
- [x] Make hobby-related posts the primary content by showing `PostCard` items in a vertical feed on the main home screen.
- [x] Move the profile section lower, reduce its prominence, or keep it as a secondary scaffold section so the feed is clearly the main screen.
- [x] Keep `PostGrid` as a profile/discovery preview rather than the main home feed.
- [x] Expand mock post data with hobby/category IDs, creator info, timestamps, captions, likes, comments, and placeholder image styles.
- [x] Update `HobbyTabs` so it receives the active category and an `onCategoryChange` callback.
- [x] Add simple client-side filtering so selecting a hobby tab updates which posts appear in the home feed.
- [x] Improve `PostCard` readability for scaffold use: clear props, simple structure, and obvious placeholder actions.
- [x] Refine responsive layout:
  - [x] desktop: main feed column plus right sidebar
  - [x] tablet: single-column feed with sidebar stacked or hidden
  - [x] mobile: sticky header/top area, full-width post cards, bottom nav visible
- [x] Update README with the intended scaffold structure and future roadmap notes.

## Roadmap

### Phase 1 — Current scaffold cleanup

- Keep mock-only data.
- Keep placeholder gradient images.
- Confirm components are organized by feature folder.
- Ensure the home feed is easy to read and modify.

### Phase 2 — Home feed MVP

- Display hobby posts in a clear vertical feed as the main first screen.
- Add hobby category chips/tabs above the feed.
- Filter visible posts when a hobby category is selected.
- Add sample post metadata such as hobby name, creator, timestamp, likes, and comments.
- Keep CSS gradient placeholders for post imagery.
- Make desktop and mobile layouts feel intentional.

### Phase 3 — Interactive frontend enhancements

- [x] Add client-side filtering by hobby category.
- [x] Add simple like/save UI state.
- [x] Add empty states for categories with no posts.
- [x] Add searchable Explore view with hobby trend cards.
- [x] Add compact “post something” composer that opens a photo/video modal.
- [x] Add shared live post listener for Home and Explore.
- [x] Add profile editing and password reset UX.
- [x] Redesign Messages into vertical thread list + detail view with image messages, profile peek, local nicknames, and back navigation.
- [ ] Add mock loading skeletons if desired.

### Phase 4 — Future app expansion

- [x] Add hash routing for Home, Explore, Create, Messages, and Profile pages.
- [x] Replace core mock-only flows with Firebase Auth, Firestore, and Cloudinary integrations.
- [x] Add authentication and real user profiles.
- [x] Add upload/create post flow.
- [x] Add comments and follow/unfollow interactions.

## Verification

- Run `npm install` if dependencies are not installed.
- Run `npm run dev` and inspect the app in the browser.
- Check desktop layout around 1200px width.
- Check tablet layout around 768px width.
- Check mobile layout around 375px width.
- Confirm no unnecessary generated folders like `node_modules/` are staged for GitHub.
- Confirm the scaffold remains simple and mock-data based.

## Decisions

- Hobby tabs should filter posts in the scaffold.
- The home feed should be the main first screen.
- Keep CSS gradient placeholder images for now; do not add local image assets yet.
