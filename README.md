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
    posts/         Feed cards and post grid components
    profile/       Profile summary components
    sidebar/       Secondary creator recommendation components
  data/            Mock profile, post, category, and creator data
  services/        Firebase app/auth setup
  App.jsx          Page composition
  main.jsx         React entry point
  styles.css       Global responsive styles and placeholder post art
```

## Components

- `Header` — top navigation, search, signed-in user state, and sign out
- `AuthPage` — responsive login/sign up screen shell with Email/Password and Google sign-in
- `LoginForm` — Firebase Email/Password login form
- `SignupForm` — Firebase Email/Password account creation form
- `HomeFeed` — main home screen feed with client-side hobby filtering
- `ProfileHeader` — user profile, bio, stats, and edit profile placeholder
- `PostGrid` — responsive mock user post grid for profile/discovery previews
- `PostCard` — feed-style hobby post card
- `BottomNav` — mobile navigation placeholder
- `HobbyTabs` — clickable hobby category filters
- `SuggestedCreators` — sample creator recommendations

## Current scaffold behavior

- Login/sign up is the first screen until the user is authenticated.
- After sign-in, the home feed and the rest of the scaffold UI are unlocked.
- Hobby tabs filter the mock posts by category.
- Post visuals use CSS gradient placeholders for now.
- Profile and creator sections remain secondary scaffold areas for future pages.
- Login and sign up screens are connected to Firebase Auth when environment values are provided.

## Firebase setup

Install dependencies with npm, then copy the example environment file:

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with your Firebase web app config from the Firebase Console.

In Firebase Console, enable these providers:

```txt
Authentication → Sign-in method → Email/Password → Enable
Authentication → Sign-in method → Google → Enable
```

For local development, make sure this domain is allowed:

```txt
Authentication → Settings → Authorized domains → localhost
```

## Run

```bash
npm run dev
```

For production build:

```bash
npm run build
npm run preview
```
