# Slotto Web

Mobile-first web shell for Slotto.

## Run

```bash
npm run web:dev
```

## Build

```bash
npm run web:build
```

## Current Scope

- Reuses shared scheduling and formatting services from `src/services`.
- Stores web data in browser `localStorage`.
- Supports random candidate generation, manual candidate addition, multilingual reply text, copy/share, and local placeholder management.
- Includes PWA manifest, mobile home-screen icons, iOS app metadata, and a production service worker.
- Supports no-backend Google Calendar Web OAuth with local token storage.
- Reads connected Google Calendar events into the web calendar and availability generator.
- Server-side sync is not implemented yet.

## Google Calendar Web OAuth

Set a Web application OAuth client ID before connecting Google Calendar:

```bash
VITE_SLOTTO_GOOGLE_OAUTH_WEB_CLIENT_ID=YOUR_WEB_APPLICATION_CLIENT_ID.apps.googleusercontent.com
```

For local development, add this authorized JavaScript origin in Google Cloud Console:

```text
http://localhost:5173
```

The Phase 1 web app stores access tokens in browser `localStorage`. Each browser/device must reconnect Google accounts.

## Mobile Home Screen

On iPhone Safari, open the site and use Share -> Add to Home Screen.

On Android Chrome, open the site and use Install app or Add to Home screen.
