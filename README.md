# Hobby App Frontend

React + Vite scaffold for a hobby-focused social media app inspired by Instagram. This is a frontend starting point, now wired to Firebase Auth, Firestore, and Cloudinary uploads.

## Structure

```txt
src/
  components/
    auth/          Login and sign up screens
    chat/          User-to-user messaging UI
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

- Firebase Email/Password authentication with required email verification, plus Google authentication
- Post-login Vibely profile creation
- Firestore-backed user profiles
- Firestore-backed posts, likes, comments, and shares
- Cloudinary-backed post photo uploads
- User-to-user Firestore chat messages
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
- Cloudinary upload errors: add `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` to `.env.local`.

## Firestore rules

Paste this in **Firestore Database → Rules**:

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

    match /chats/{chatId} {
      allow read: if request.auth != null
        && request.auth.uid in resource.data.participants;
      allow create: if request.auth != null
        && request.auth.uid in request.resource.data.participants
        && request.resource.data.participants.size() == 2;
      allow update: if request.auth != null
        && request.auth.uid in resource.data.participants;
      allow delete: if false;

      match /messages/{messageId} {
        allow read: if request.auth != null
          && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
        allow create: if request.auth != null
          && request.resource.data.senderId == request.auth.uid
          && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
        allow update, delete: if false;
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
