# App Polish, Security, and Feature Plan

## Context

The app is moving toward real public users now, so the next pass should prioritize production safety and scale while also giving the UI a simple, charismatic Instagram/Facebook-style feel: rounded Flutter-like surfaces, soft shadows, smooth motion, clear hover/tap feedback, and polished desktop + phone layouts.

Code scan found:

- `src/App.jsx` owns hash routing, auth/profile state, Firestore listeners, local settings/history, notifications, and many top-level handlers. It works, but it is large enough that careful extraction will make future work safer.
- `src/services/posts.js`, `src/services/chats.js`, `src/services/vibelyProfile.js`, and `src/services/moderation.js` currently perform client-side Firestore writes directly.
- `src/services/firebase.js` has Firebase Auth/Firestore only; there is no App Check, Functions, or checked-in Firebase config yet.
- `src/utils/mediaValidation.js` already centralizes image/video file size/type checks and has tests in `src/utils/mediaValidation.test.js`.
- `src/styles.css` already has responsive breakpoints (`1180px`, `1050px`, `820px`, `560px`) and reduced-motion support; this should be refined rather than replaced.
- `README.md` documents Firestore rules, indexes, and Cloudinary unsigned uploads, but there is no committed `firestore.rules`, `firestore.indexes.json`, `firebase.json`, or backend/functions directory.
- Important public-launch risk: user docs are readable by signed-in users and currently include private-ish fields like `email`/`authProviders`; public profile data should be separated from private account data.

## Approach

Best backend decision: keep Firebase for realtime reads and auth, but add Firebase App Check plus Firebase Cloud Functions for security-sensitive and rate-limited writes. This is stronger than a frontend-only Firebase app because Firestore rules cannot enforce robust rate limits, Cloudinary signed upload restrictions, unique username reservations, or moderation workflows by themselves.

Recommended architecture:

1. Keep direct Firestore listeners for feeds, chats, profiles, saved posts, and notifications where realtime UX matters.
2. Move high-risk mutations behind callable Cloud Functions: create/update/delete post, comment, send message, report, follow/unfollow, profile create/update, username reservation, and Cloudinary upload signing.
3. Lock Firestore rules around validated schemas and user ownership. Once functions are in place, deny direct client writes for collections that should only be mutated by Admin SDK functions.
4. Add client-side cooldowns and disabled/loading states for instant UX feedback, but treat server-side rate limits as the source of truth.
5. Refactor UI in small slices and preserve current behavior while upgrading the visual system.
6. Ship visual polish and feature improvements after the safety layer, because the app is intended for public users now.

## Files to modify

Core frontend:

- `src/App.jsx` — reduce top-level complexity, route/action guards, public/private profile state, error boundaries.
- `src/services/firebase.js` — add App Check initialization and Functions integration.
- `src/services/posts.js` — switch risky writes to callable functions; add pagination/limits for feeds.
- `src/services/chats.js` — switch message sending/upload signing to callable functions; add rate-limit errors.
- `src/services/moderation.js` — structured report reasons/statuses and function-backed report creation.
- `src/services/vibelyProfile.js` — profile validation, username uniqueness, private account data split.
- `src/utils/mediaValidation.js` — stricter MIME/extension limits, optional video duration checks, shared constants.
- `src/components/auth/*` — stronger public-launch copy, form feedback, password/community guideline polish.
- `src/components/feed/HomeFeed.jsx`, `src/components/posts/PostCard.jsx`, `src/components/posts/PostComposer.jsx` — rate-limit UX, safer actions, polished cards/composer.
- `src/components/chat/ChatPanel.jsx` — cooldown UI, blocked-user behavior, message grouping/polish.
- `src/components/explore/ExploreView.jsx`, `src/components/profile/*`, `src/components/settings/SettingsView.jsx`, `src/components/notifications/NotificationsView.jsx` — responsive and feature polish.
- `src/components/layout/Header.jsx`, `src/components/layout/BottomNav.jsx` — Instagram/Facebook-inspired nav polish with better mobile ergonomics.
- `src/styles.css` — design-token cleanup, rounded surfaces, shadows, animations, responsive refinements.

Backend/config/docs to add or update:

- `functions/` — Firebase Cloud Functions for callable APIs, rate limits, Cloudinary signatures, moderation events.
- `firestore.rules` — checked-in production rules instead of README-only rules.
- `firestore.indexes.json` — checked-in indexes for feed/profile/chat queries.
- `firebase.json` and optionally `.firebaserc` — Firebase deploy config.
- `.env.example` — App Check key and Cloudinary signed-upload/function config notes.
- `README.md` — deployment, rate-limit policy, rules/indexes, and public-launch QA.

## Reuse

- `src/services/firebase.js` remains the single Firebase initialization point.
- `src/utils/mediaValidation.js` remains the media validation source and should be extended instead of duplicated.
- Existing service modules stay as the frontend data boundary; they will call Cloud Functions where needed instead of spreading API logic through components.
- Existing `LoadingSkeleton`, `empty-state`, `PostCard`, `PostComposer`, `ProfileHeader`, `ChatPanel`, and `BottomNav` patterns should be polished rather than rewritten.
- Existing CSS variables and breakpoints in `src/styles.css` should become the foundation for a small design system: radius, elevation, motion, color, spacing, and touch target tokens.

## Steps

### Phase 1 — Public-launch safety foundation

- [x] Add Firebase config files: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, and a `functions/` workspace.
- [x] Add Firebase App Check in `src/services/firebase.js` and document required env values.
- [x] Split public profile data from private account data: remove `email`/`authProviders` from readable `users/{uid}` docs going forward and store private fields under a private subcollection/doc.
- [x] Add username reservation/uniqueness via a Cloud Function and `usernames/{username}` docs.
- [x] Replace Cloudinary unsigned uploads with signed upload parameters from a callable function; restrict folder/resource type/size in Cloudinary settings and docs.
- [x] Add schema validation and max lengths for profiles, posts, comments, messages, reports, and saved/follow docs in both functions and Firestore rules.
- [x] Add server-side rate limits using Firestore transaction counters, with initial policy:
  - posts: 5 per 10 minutes, 50 per day
  - comments: 10 per minute, 150 per day
  - messages: 20 per minute, 500 per day, plus per-chat burst limits
  - reports: 5 per hour, 30 per day
  - follows: 30 per hour
  - likes/saves/shares: short burst protection and idempotent writes
- [x] Add reusable client-side cooldown/disabled states so users get immediate feedback before server rejection.

### Phase 2 — Firestore rules and data integrity

- [x] Lock down rules so unauthenticated users cannot read app data.
- [x] Restrict `users/{uid}` writes to the owner or Admin SDK functions and validate allowed fields.
- [x] Restrict post/comment/chat/report mutations to function-backed paths where practical.
- [x] Ensure blocked users are filtered from UI and cannot continue sending messages through functions.
- [x] Prevent negative counters and direct arbitrary counter updates.
- [x] Add checked-in indexes for ordered feed, user posts, saved posts, following, blocked users, and chat queries.

### Phase 3 — UI polish: simple, rounded, charismatic

- [x] Normalize design tokens in `src/styles.css`: large rounded corners, soft shadows, pill buttons, subtle gradients, consistent spacing, and touch targets of at least 44px.
- [x] Polish `Header` and `BottomNav` into an Instagram/Facebook-inspired shell: clean icons/labels, active states, notification badge, sticky/floating mobile feel, and smooth hover/tap effects.
- [x] Polish feed cards: rounded media, lighter metadata, better action button states, skeletons, and cleaner post menus.
- [x] Polish composer modal: bottom-sheet behavior on phones, desktop centered card, focus trap, close/escape behavior, upload progress, and draft preservation.
- [x] Polish chat: message bubbles, day separators, image previews, blocked-user state, mobile full-screen thread, and smoother list/detail transitions.
- [x] Polish profile/explore/settings/notifications: consistent card hierarchy, empty states, responsive grids, and friendlier copy.
- [x] Keep `prefers-reduced-motion` support and make animations subtle: fade/slide/scale only, no noisy motion.

### Phase 4 — Scalability and code cleanliness

- [x] Add feed/profile pagination or query limits; stop listening to all posts/users for public scale.
- [x] Refactor `src/App.jsx` into focused hooks/helpers where useful, such as auth/profile state, route state, notifications, local preferences, and social actions.
- [x] Add a shared error boundary and friendly fallback UI for route-level failures.
- [x] Standardize service error messages so components do not duplicate backend/rules wording.
- [x] Add tests for validation/rate-limit helper logic and service mappers; consider component tests if test dependencies are approved.

### Phase 5 — High-value public features

- [x] Replace placeholder reports with reason selection, optional details, target snapshots, and an admin-review status field.
- [x] Add account privacy settings: public/private profile, message permissions, and search discoverability.
- [x] Add profile interests/tags beyond one main hobby and use them for suggested creators.
- [x] Add follow notifications and better notification persistence instead of deriving everything client-side.
- [x] Add post drafts and saved-post collections.
- [x] Add lightweight admin/moderator tooling or documented Firestore console workflow for reports.

## Verification

- Run `npm test` for validation/unit coverage.
- Run `npm run build` to verify production bundle health.
- If functions are added, run Firebase emulator tests/manual checks for callable functions and rules.
- Manual QA in `npm run dev`:
  - auth/login/signup/email verification/password reset
  - onboarding/profile edit and username uniqueness
  - post create/edit/delete, like/save/comment/share with rate limits
  - chat text/image send, unread state, block/report, message cooldowns
  - explore/search/hobby/public-profile flows with paginated/limited data
  - settings/history/notification preference/privacy flows
- Responsive QA at approximately `375px`, `430px`, `768px`, `1024px`, and `1200px+`.
- Security QA:
  - unauthenticated reads/writes fail
  - cross-user profile/post/chat writes fail
  - direct counter tampering fails
  - report/message/post spam is blocked by server limits
  - private fields are not readable through public profile docs
- Upload QA with valid/invalid image/video types, size limits, failed signatures, and blocked Cloudinary presets.
- Accessibility QA: keyboard navigation, visible focus states, dialog focus/escape, labels, aria-live messages, reduced motion, color contrast.

## Decisions

- Backend: use Firebase Cloud Functions + App Check for public-launch safety; keep Firestore realtime reads where they are useful.
- Priority: do safety/security/rate limits first, then UI polish, then feature expansion. All requested areas are included, but the public-launch risks come first.
- Visual direction: simple charismatic Instagram x Facebook UI with Flutter-like rounded cards/buttons, soft shadows, smooth animations, and no sharp edges.
