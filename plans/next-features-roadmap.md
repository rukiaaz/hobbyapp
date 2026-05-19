# Hobby App Next Features Roadmap

## Context

Hobby App now has Firebase authentication, Vibely profiles, Firestore-backed posts, post photo/video upload through Cloudinary, searchable Explore, hash-routed app views, and redesigned Messages with image attachments, profile peek, local nicknames, and back navigation. The next work should focus on making the app feel more complete, safer to use, and easier to grow without adding too much complexity at once.

## Approach

Prioritize features in this order: first strengthen reliability/security and data rules, then add social features users expect, then improve discovery/profile depth, then polish mobile performance and deployment quality. Keep reusing the current React + Firebase + Cloudinary setup. Avoid adding a new backend until Firebase limits or moderation needs require it.

## Recommended feature priorities

### Phase 1 — Needed foundation / app quality

These are the most important before adding many more social features.

- Firestore rules update for new chat image fields and post media fields.
- Loading states and skeletons for feed, explore, profile, and messages.
- Empty/error states that tell users what to do next.
- Safer Cloudinary validation notes: accepted file types, size limits, and upload failure handling.
- Basic moderation controls: delete own posts, delete own comments, block/report user placeholder flow.
- Persist saved/bookmarked posts instead of local-only save state.
- Add simple environment/deployment checklist for Firebase + Cloudinary + Vercel.

### Phase 2 — Social features users will expect

- Follow/unfollow stored in Firestore instead of local sidebar state.
- Following/followers counts and lists.
- A Following feed filter next to All/Explore.
- Real profile pages for other users from posts, messages, and creator cards.
- User posts tab on profiles, showing live posts by that user.
- Comment improvements: comment list preview, delete own comments, comment timestamps.
- Notifications for likes, comments, follows, and messages.

### Phase 3 — Better messaging

- Unread message badges and last-read tracking.
- Message timestamps grouped by day.
- Image lightbox for chat images.
- Optional video/audio message support later.
- Search conversations by display name/nickname.
- Persist nicknames in Firestore private user settings if local-only becomes limiting.
- Block user from message detail screen.

### Phase 4 — Discovery and hobby depth

- Dedicated hobby pages such as `/#/hobby/crafts`.
- Trending posts based on engagement and recency.
- Better Explore ranking instead of simple likes/comments sorting.
- Search filters for posts, people, and hobbies.
- Suggested creators based on shared hobbies.
- Hobby onboarding interests beyond one main hobby.
- Hashtags or hobby tags in captions.

### Phase 5 — Creation workflow polish

- Draft persistence while the modal is open or after refresh.
- Media validation before upload: type, size, duration for video.
- Upload progress indicator.
- Multiple photos per post / carousel.
- Edit own post captions and categories.
- Post delete with confirmation.
- Accessibility pass for modal focus trap and keyboard navigation.

### Phase 6 — Production readiness

- Route-level code splitting to reduce the Vite/Firebase bundle warning.
- Basic automated tests for auth helpers, services, and key components.
- Error boundary for app-wide Firebase or rendering errors.
- Analytics events for signups, posts, follows, and messages.
- Document required Firestore indexes.
- Final README cleanup with screenshots and demo account notes.

## Files to modify

Likely core files for the next implementation rounds:

- `src/App.jsx` — shared listeners, routing, global state, notifications entry points.
- `src/services/posts.js` — post delete/edit, saved posts, user post queries, media validation helpers.
- `src/services/chats.js` — unread counts, last-read tracking, optional private chat settings.
- `src/services/vibelyProfile.js` — follow/follower data, profile page query helpers, private user settings.
- `src/components/feed/HomeFeed.jsx` — Following feed, skeletons, saved posts.
- `src/components/posts/PostCard.jsx` — delete/edit menu, save persistence, richer comments.
- `src/components/posts/PostComposer.jsx` — upload progress, validation, drafts, carousel later.
- `src/components/chat/ChatPanel.jsx` — unread badges, message grouping, image lightbox.
- `src/components/profile/ProfileView.jsx` — my posts, followers/following, public profile layout.
- `src/components/explore/ExploreView.jsx` — people search, better ranking, hobby pages.
- `src/components/sidebar/SuggestedCreators.jsx` — Firestore follow/unfollow.
- `src/styles.css` — loading skeletons, mobile polish, new cards/modals.
- `README.md` — updated Firebase rules, indexes, deployment checklist.

## Reuse

- `src/services/firebase.js` — keep one Firebase app/Auth/Firestore setup.
- `src/services/posts.js` — reuse `listenToPosts`, `createPost`, `togglePostLike`, comment/share helpers.
- `src/services/chats.js` — reuse chat IDs, `listenToUserChats`, `listenToMessages`, and Cloudinary image upload pattern.
- `src/services/vibelyProfile.js` — reuse profile mapping and profile listener patterns for public profiles/follows.
- `src/components/posts/PostComposer.jsx` — extend current modal rather than creating a separate upload flow.
- `src/components/posts/PostCard.jsx` — extend card actions for save/delete/edit/report.
- `src/components/chat/ChatPanel.jsx` — extend current list/detail model for unread badges and profile actions.
- `src/components/hobbies/HobbyTabs.jsx` — reuse for feed and hobby page filters.

## Steps

- [x] Update README Firestore rules for all current fields and planned near-term features.
- [x] Add loading skeleton components/styles for feed, explore, profile, and messages.
- [x] Persist saved posts in Firestore under user-specific documents or post subcollections.
- [x] Add follow/unfollow persistence and follower/following counts.
- [x] Create public profile viewing from post author, suggested creator, and message profile peek.
- [x] Add profile post grid backed by live posts for the selected user.
- [x] Add own-post menu: edit caption/category and delete post.
- [x] Add comment management: preview, delete own comment, clearer timestamps.
- [x] Add unread message count and last-read tracking.
- [x] Add chat image lightbox and conversation search.
- [x] Add upload progress and media validation for posts and chat images.
- [x] Add hobby detail routes/pages and people/post search filters.
- [x] Add block/report placeholder UI and Firestore data model.
- [x] Add route-level code splitting and basic tests.
- [x] Update README with indexes, rules, env setup, and manual QA checklist.

## Verification

- Run `npm run build` after every implementation slice.
- Run `npm run dev` and manually test:
  - sign up/login/password reset
  - onboarding/profile edit
  - create image post and video post
  - like/comment/share/save
  - Explore search/filter
  - message list/detail/back arrow
  - send text and image messages
  - profile peek and local nickname behavior
- Check mobile widths around 375px, tablet around 768px, and desktop around 1200px.
- Verify Vercel deployment after pushing.
- Verify Firebase rules allow intended actions and deny unrelated writes.
- Confirm Cloudinary unsigned preset supports intended media types and size limits.

## Suggested next implementation slice

Do **Phase 1 + saved posts** next:

1. Update Firestore rules/documentation for current chat/post media fields.
2. Add skeleton loading states and clearer errors.
3. Persist saved posts for the current user.
4. Add delete own post/comment basics.

This gives the app a stronger base before building larger social features like follows, notifications, and public profile pages.
