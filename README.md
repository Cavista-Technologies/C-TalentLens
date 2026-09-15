# C-TalentLens
 
Frontend for C-TalentLens, a recruiting/ATS platform: requisitions, referrals, alerts/notifications, analytics, and leadership reporting. Built with React, TypeScript, and Vite.
 
## Architecture
 
```
src/
  pages/        Route-level page components (Dashboard, Requisitions, Referrals, Analytics, ...)
  features/     API clients and types grouped by domain (auth, requisitions, referrals, alerts, analytics, ...)
  components/   Shared UI (layout shell, feedback/toasts, ...)
  routes/       React Router route definitions and protected-route guard
  lib/          Fetch wrapper (apiClient), auth token storage, shared utilities
  styles/       Per-page and shared CSS
  config/       Runtime env config (env.ts)
```
 
## Prerequisites
 
- Node.js 20+
 
## Setup
 
```bash
npm install
cp .env.example .env   # then edit VITE_API_BASE_URL if needed
npm run dev
```
 
The dev server runs at `http://localhost:5173` by default and expects the [backend API](../C-TalentLens) running at `http://localhost:5144`.
 
If `.env` is missing, the app falls back to a deployed remote backend instead of localhost — always create `.env` from `.env.example` for local development.
 
## Scripts
 
| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview a production build locally |
 
## Configuration
 
Environment variables (see `.env.example`):
 
| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API |
| `VITE_CLOUDINARY_CLOUD_NAME` / `VITE_CLOUDINARY_UPLOAD_PRESET` | Unsigned Cloudinary upload config for referral resume uploads |
 
## Auth
 
Login issues an access token and a refresh token (see `src/lib/authToken.ts`, `src/features/auth`). The API client (`src/lib/apiClient.ts`) retries once on a 401 by refreshing, and a proactive timer in `AuthProvider` refreshes shortly before expiry so active sessions aren't interrupted. A failed refresh clears tokens and redirects to `/login` via `ProtectedRoute`.
 
## Demo accounts
 
See the backend README for seeded accounts (password `Password123` for all).
 
