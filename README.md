# Hobby App Frontend

React + Vite scaffold for a hobby-focused social media app inspired by Instagram. This is a frontend starting point only, not a finished product.

## Structure

```txt
src/
  components/
    hobbies/       Hobby filters and discovery components
    layout/        App shell navigation components
    posts/         Feed cards and post grid components
    profile/       Profile summary components
    sidebar/       Secondary creator recommendation components
  data/            Mock profile, post, category, and creator data
  App.jsx          Page composition
  main.jsx         React entry point
  styles.css       Global responsive styles and placeholder post art
```

## Components

- `Header` — top navigation and search
- `ProfileHeader` — user profile, bio, stats, and edit profile placeholder
- `PostGrid` — responsive mock user post grid
- `PostCard` — feed-style hobby post card
- `BottomNav` — mobile navigation placeholder
- `HobbyTabs` — hobby category filters
- `SuggestedCreators` — sample creator recommendations

## Run

```bash
npm install
npm run dev
```
