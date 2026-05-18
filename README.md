# Hobby App Frontend

React + Vite scaffold for a hobby-focused social media app inspired by Instagram. This is a frontend starting point only, not a finished product.

## Structure

```txt
src/
  components/
    auth/          Login and sign up scaffold screens
    feed/          Home feed composition and filtering
    hobbies/       Hobby filters and discovery components
    layout/        App shell navigation components
    onboarding/    Post-login Vibely profile setup
    posts/         Feed cards, post composer, and post grid components
    profile/       Profile summary components
    sidebar/       Secondary creator recommendation components
  data/            Mock profile, post, category, and creator data
  services/        Firebase Auth/Firestore and Cloudinary upload setup
  App.jsx          Page composition
  main.jsx         React entry point
  styles.css       Global responsive styles and placeholder post art
```

## Components

- `Header` — top navigation, search, signed-in user state, and sign out
- `AuthPage` — responsive login/sign up screen shell with Email/Password and Google sign-in
- `LoginForm` — Firebase Email/Password login form
- `SignupForm` — Firebase Email/Password account creation form
- `VibelyOnboarding` — post-login profile setup asking display name, username, hobby, and bio
- `HomeFeed` — main home screen feed with client-side hobby filtering
- `ProfileHeader` — user profile, bio, stats, and edit profile placeholder
- `PostGrid` — responsive mock user post grid for profile/discovery previews
- `PostComposer` — authenticated post creation form with Cloudinary image upload
- `PostCard` — feed-style hobby post card with like, comment, and share actions
- `BottomNav` — mobile navigation placeholder
- `HobbyTabs` — clickable hobby category filters
- `SuggestedCreators` — sample creator recommendations

## Current scaffold behavior

- Login/sign up is the first screen until the user is authenticated.
- After sign-in, users create a Vibely account/profile before the feed is unlocked.
- Signed-in users can create posts, upload photos, like posts, comment, and share.
- Hobby tabs filter live Firestore posts and mock posts by category.
- Uploaded photos are stored in Cloudinary, while post metadata is stored in Firestore.
- Posts without uploaded photos use CSS gradient placeholders.
- Vibely profile data is saved to Firestore under `users/{firebaseUserId}`.

## Firebase setup

Install dependencies with npm, then copy the example environment file:

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with your Firebase web app config from the Firebase Console.

In Firebase Console, enable these providers and services:

```txt
Authentication → Sign-in method → Email/Password → Enable
Authentication → Sign-in method → Google → Enable
Firestore Database → Create database
```

For local development, make sure this domain is allowed:

```txt
Authentication → Settings → Authorized domains → localhost
```

Create Firestore Database, then publish rules like this:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null
        && request.auth.uid == userId;
    }

    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.authorId == request.auth.uid;
      allow update: if request.auth != null
        && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['likesCount', 'commentsCount', 'shareCount']);
      allow delete: if request.auth != null
        && resource.data.authorId == request.auth.uid;

      match /likes/{userId} {
        allow read: if request.auth != null;
        allow create, delete: if request.auth != null
          && request.auth.uid == userId;
        allow update: if false;
      }

      match /comments/{commentId} {
        allow read: if request.auth != null;
        allow create: if request.auth != null
          && request.resource.data.authorId == request.auth.uid;
        allow update, delete: if request.auth != null
          && resource.data.authorId == request.auth.uid;
      }
    }
  }
}
```

## Cloudinary setup

Firebase Storage is not required. Image uploads use Cloudinary unsigned uploads.

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

## Run

```bash
npm run dev
```

For production build:

```bash
npm run build
npm run preview
```
