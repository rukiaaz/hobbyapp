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
- Post-login Vibely profile creation and profile editing
- Firestore-backed user profiles
- Firestore-backed posts, likes, comments, and shares
- Cloudinary-backed post photo/video uploads through a modal composer
- Searchable Explore view with hobby trends and live + mock posts
- Hash-routed Home, Explore, Create, Messages, and Profile navigation
- User-to-user Firestore chat messages with image attachments, unread badges, profile peek, search, lightbox, and local-only nicknames
- Saved posts, persisted follow/following state, public profile viewing, own-post edit/delete, and comment deletion
- Loading skeletons, safer media validation, report/block placeholder data model, and hobby detail routes
- Responsive Instagram-inspired feed UI
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
- Firestore permission errors: create Firestore and paste the rules below.
- Cloudinary upload errors: add `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` to `.env.local`; for post videos, make sure your unsigned preset allows video/auto uploads. Chat pictures use the same Cloudinary config.

## Firestore rules

Paste this in **Firestore Database → Rules**:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isUser(userId) {
      return signedIn() && request.auth.uid == userId;
    }

    function isPostAuthor(postId) {
      return signedIn()
        && get(/databases/$(database)/documents/posts/$(postId)).data.authorId == request.auth.uid;
    }

    match /users/{userId} {
      allow read: if signedIn();
      allow create, delete: if isUser(userId);
      allow update: if isUser(userId)
        || (signedIn() && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['followersCount', 'followingCount', 'postsCount']));

      match /savedPosts/{postId} {
        allow read, create, update, delete: if isUser(userId);
      }

      match /following/{targetId} {
        allow read: if signedIn();
        allow create, update, delete: if isUser(userId);
      }

      match /followers/{followerId} {
        allow read: if signedIn();
        allow create, update, delete: if isUser(followerId) || isUser(userId);
      }

      match /blockedUsers/{targetId} {
        allow read, create, update, delete: if isUser(userId);
      }

      match /privateSettings/{settingId} {
        allow read, create, update, delete: if isUser(userId);
      }
    }

    match /posts/{postId} {
      allow read: if signedIn();
      allow create: if signedIn()
        && request.resource.data.authorId == request.auth.uid;
      allow update: if signedIn() && (
        resource.data.authorId == request.auth.uid ||
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['likesCount', 'commentsCount', 'shareCount'])
      );
      allow delete: if signedIn()
        && resource.data.authorId == request.auth.uid;

      match /likes/{userId} {
        allow read: if signedIn();
        allow create, delete: if isUser(userId);
        allow update: if false;
      }

      match /comments/{commentId} {
        allow read: if signedIn();
        allow create: if signedIn()
          && request.resource.data.authorId == request.auth.uid;
        allow update: if false;
        allow delete: if signedIn()
          && (resource.data.authorId == request.auth.uid || isPostAuthor(postId));
      }
    }

    match /chats/{chatId} {
      allow read: if signedIn()
        && request.auth.uid in resource.data.participants;
      allow create: if signedIn()
        && request.auth.uid in request.resource.data.participants
        && request.resource.data.participants.size() == 2;
      allow update: if signedIn()
        && request.auth.uid in resource.data.participants;
      allow delete: if false;

      match /messages/{messageId} {
        allow read: if signedIn()
          && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
        allow create: if signedIn()
          && request.resource.data.senderId == request.auth.uid
          && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
        allow update, delete: if false;
      }
    }

    match /reports/{reportId} {
      allow create: if signedIn()
        && request.resource.data.reporterId == request.auth.uid;
      allow read, update, delete: if false;
    }
  }
}
```

## Cloudinary setup

Firebase Storage is not required. Post media uploads use Cloudinary unsigned uploads through the `auto/upload` endpoint so photos and short videos can share one flow. The app validates post images up to 25 MB, post videos up to 80 MB, and chat images up to 8 MB before upload.

1. Create/login to Cloudinary.
2. Go to **Settings → Upload → Upload presets**.
3. Create an **unsigned** upload preset.
4. Optional but recommended: set a folder like `hobby-app/posts` in the preset.
5. Copy your **Cloud name** from the Cloudinary dashboard.
6. Add these to `.env.local`:

```env
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-unsigned-upload-preset
```

Restart the dev server after editing `.env.local`.

## App routes

Signed-in navigation uses hash routes so links survive refreshes and can be shared during local/dev hosting:

```txt
/#/home
/#/explore
/#/hobby/crafts
/#/create
/#/messages
/#/profile
/#/public-profile
```

## Firestore indexes

Firestore may prompt you to create indexes from the browser console. Expected indexes:

```txt
posts: authorId ASC, createdAt DESC
chats: participants ARRAY_CONTAINS, updatedAt DESC or lastMessageAt DESC
users/{userId}/savedPosts: savedAt DESC
users/{userId}/following: createdAt DESC
users/{userId}/blockedUsers: createdAt DESC
```

## Manual QA checklist

- Auth: sign up, verify email, log in, password reset, sign out.
- Profile: complete onboarding, edit profile, view public profile from feed/message/explore.
- Posts: create image/video post, validate large/unsupported media, edit own post, delete own post.
- Engagement: like, save/unsave, comment, delete own comment, share.
- Social: follow/unfollow a real Vibely user, verify follower/following counts change.
- Messages: search conversations, open a thread, send text/image, check unread badge, open image lightbox, use back arrow.
- Safety: report a post/user and block/unblock a user placeholder flow.
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
