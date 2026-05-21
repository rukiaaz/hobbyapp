# Hobby App Frontend

React + Vite scaffold for a hobby-focused social media app inspired by Instagram. This is a frontend starting point, now wired to Firebase Auth, Firestore, and Cloudinary uploads.

## Structure

```txt
src/
  components/
    auth/          Login and sign up screens
    chat/          User-to-user messaging UI
    explore/       Search and discovery screen
    feed/          Home feed composition and filtering
    hobbies/       Hobby filters and discovery components
    layout/        App shell navigation components
    onboarding/    Post-login Vibely profile setup
    posts/         Feed cards, post composer, and post grid components
    profile/       Profile summary components
    sidebar/       Secondary creator recommendation components
  data/            Mock fallback profile, post, category, and creator data
  services/        Firebase Auth/Firestore and Cloudinary upload setup
  App.jsx          Page composition
  main.jsx         React entry point
  styles.css       Global responsive styles and placeholder post art
```

## Features

- Firebase Email/Password authentication with required email verification, Google authentication, and password reset email flow
- Public-launch Firebase App Check + callable Cloud Functions plan for protected writes, rate limits, username reservations, reports, and signed uploads
- Post-login Vibely profile creation and profile editing with public/private profile data separation
- Firestore-backed user profiles
- Firestore-backed posts, likes, comments, and shares
- Cloudinary-backed signed post photo/video uploads through a modal composer
- Searchable Explore view with hobby trends and live + mock posts
- Hash-routed Home, Explore, Create, Messages, and Profile navigation
- User-to-user Firestore chat messages with image attachments, unread badges, profile peek, search, lightbox, and local-only nicknames
- Notifications inbox for unread messages plus like/comment activity on your own posts
- Local search history with removable chips and clean settings controls
- Stalked/recently viewed account history with an × remove button
- Saved posts, persisted follow/following state, public profile viewing, own-post edit/delete, and comment deletion
- Loading skeletons, safer media validation, structured report/block flows, and hobby detail routes
- Account privacy controls for discoverability and message permissions
- Responsive Instagram/Facebook-inspired feed UI with rounded Flutter-like cards, shadows, and smooth motion
- Mock fallback posts for scaffold/demo content

## Clone and local setup

Friends should create their own local environment file after cloning. Real Firebase and Cloudinary values are intentionally **not** uploaded to GitHub.

```bash
git clone https://github.com/rukiaaz/hobbyapp.git
cd hobbyapp
npm install
cp .env.example .env.local
```

On Windows PowerShell, use this instead of `cp`:

```powershell
Copy-Item .env.example .env.local
```

Fill `.env.local` with Firebase web app config values from the Firebase Console, then start the app:

```bash
npm run dev
```

## Firebase setup

Do not commit `.env.local`. The app reads Firebase values from Vite variables such as `VITE_FIREBASE_API_KEY` in `.env.local`.

Enable:

```txt
Authentication → Sign-in method → Email/Password → Enable
Authentication → Sign-in method → Google → Enable
Authentication → Templates → Email address verification → Customize if desired
Firestore Database → Create database
App Check → Register your web app with reCAPTCHA v3 or Enterprise
Functions → Enable/upgrade project if callable functions are used in production
```

For local development and deployment, make sure these domains are allowed:

```txt
Authentication → Settings → Authorized domains → localhost
Authentication → Settings → Authorized domains → hobbyapp-topaz.vercel.app
Authentication → Settings → Authorized domains → your-preview-or-custom-domain.com
```

### Firebase clone troubleshooting

If a friend sees a Firebase/API error after cloning, check these first:

- `auth/invalid-api-key`: `.env.local` is missing, has placeholder values, or the dev server was not restarted after editing it.
- `auth/configuration-not-found`: Firebase Authentication is not enabled for that Firebase project.
- `auth/operation-not-allowed`: enable Email/Password and Google in **Authentication → Sign-in method**.
- `auth/unauthorized-domain`: add the local/deployed domain in **Authentication → Settings → Authorized domains**.
- Firestore permission errors: create Firestore, deploy `firestore.rules`, and confirm callable functions are deployed.
- Cloudinary upload errors: add `VITE_CLOUDINARY_CLOUD_NAME` to `.env.local` and configure Cloudinary secrets in Firebase Functions. Unsigned upload presets are local fallback only.

## Firestore rules and backend functions

Production rules now live in `firestore.rules` and indexes live in `firestore.indexes.json`. Deploy them with Firebase instead of copying rules from the README:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

For public users, protected writes should go through callable Cloud Functions in `functions/`:

- profile create/update + username reservation
- post create/update/delete, likes, comments, saves, and shares
- chat creation, message send, and last-read updates
- block/report/follow actions
- Cloudinary signed upload parameters
- Firestore-backed rate-limit counters

The rules intentionally keep unauthenticated users out, separate public profile data from private account data, block direct counter tampering, and deny direct writes for collections that functions should own. For local migration only, `VITE_ALLOW_DIRECT_FIRESTORE_WRITES=true` can be used with relaxed/local rules. Do not enable that flag for public production.

### Firebase Functions setup

Install/deploy functions from the `functions/` folder in your Firebase project. Functions use these server-side environment variables/secrets:

```txt
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
CLOUDINARY_POST_FOLDER=hobby-app/posts
CLOUDINARY_CHAT_FOLDER=hobby-app/chats
ENFORCE_APP_CHECK=true
FUNCTIONS_REGION=us-central1
```

Rate limits are enforced server-side by callable functions, with client-side cooldowns only used for quick UX feedback. Initial limits are 5 posts/10 minutes, 50 posts/day, 10 comments/minute, 20 messages/minute, 5 reports/hour, 30 follows/hour, and short burst protection for likes/saves/shares.

### Moderator workflow

Reports are written to the `reports` collection with `status: open`, a reason, optional details, and a small target snapshot. Until a custom admin UI is added, moderators can review reports in the Firebase Console, update `status` to `reviewing`, `resolved`, or `dismissed`, and take manual action on the target post/user. Give moderators an `admin: true` custom claim if they need rules-backed read/update access to reports.

## Cloudinary setup

Firebase Storage is not required. Public production uploads use Cloudinary **signed uploads**. The browser asks Firebase Functions for a short-lived signature, uploads directly to Cloudinary, then saves the media metadata through a callable function. The app validates post images up to 25 MB, post videos up to 80 MB, and chat images up to 8 MB before upload.

1. Create/login to Cloudinary.
2. Copy your **Cloud name**, **API key**, and **API secret** from the Cloudinary dashboard.
3. Store the API key/secret only in Firebase Functions environment/secrets.
4. Add only the public cloud name to `.env.local`:

```env
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
```

Optional local fallback: create an unsigned preset and set `VITE_ALLOW_DIRECT_FIRESTORE_WRITES=true` plus `VITE_CLOUDINARY_UPLOAD_PRESET=...` only for local development. Do not use unsigned fallback for public production.

Restart the dev server after editing `.env.local`.

## App routes

Signed-in navigation uses hash routes so links survive refreshes and can be shared during local/dev hosting:

```txt
/#/home
/#/explore
/#/hobby/crafts
/#/create
/#/messages
/#/notifications
/#/profile
/#/settings
/#/public-profile
```

## Firestore indexes

Deploy checked-in indexes with:

```bash
firebase deploy --only firestore:indexes
```

Current composite indexes are tracked in `firestore.indexes.json` for user posts, chats, notifications, and reports. Single-field ordered subcollection queries such as saved posts/following/blocked users are handled by Firestore's automatic single-field indexes.

## Manual QA checklist

- Auth: sign up, verify email, log in, password reset, sign out.
- Profile: complete onboarding, edit profile, view public profile from feed/message/explore.
- Posts: create image/video post, validate large/unsupported media, edit own post, delete own post.
- Engagement: like, save/unsave, comment, delete own comment, share.
- Social: follow/unfollow a real Vibely user, verify follower/following counts change.
- Messages: search conversations, open a thread, send text/image, check unread badge, open image lightbox, use back arrow.
- Notifications/settings: toggle notification and privacy preferences, remove search history, remove stalked accounts with ×, unblock users.
- Safety: submit a reasoned report for a post/user and block/unblock a user.
- Discovery: Explore post/people/hobby filters and hobby detail route.
- Responsive: verify mobile (~375px), tablet (~768px), and desktop (~1200px).

## Run

```bash
npm run dev
```

For production build:

```bash
npm run build
npm run preview
```
