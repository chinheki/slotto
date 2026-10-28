# Slotto

A lightweight Chrome Extension MVP for interview scheduling workflows. The extension can be loaded locally without a build step and keeps the scheduling logic isolated from Chrome-specific adapters so it can later move into a web app.

## Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the extension:

   ```bash
   npm run build
   ```

3. Open Chrome and go to `chrome://extensions`.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the build folder: `/Users/bytedance/projects/heki/Slotto/dist`.

## Current MVP

- Generate interview candidate slots from local rules.
- Format output in Japanese, English, or Chinese.
- Mark generated slots as pending and exclude them from future suggestions.
- Right-click selected time text on supported sites and save it as a pending or confirmed local schedule.
- Insert generated availability into a focused editable field on supported pages.
- Detect the current Chrome primary account and use it as the Phase 1 sync owner.
- Attempt to load the primary account's Google Calendar events after OAuth is configured.

## Google Calendar OAuth Setup

To read real Google Calendar events, create a local `.env` file:

```bash
cp .env.example .env
```

Then set:

```bash
SLOTTO_GOOGLE_OAUTH_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
VITE_SLOTTO_GOOGLE_OAUTH_WEB_CLIENT_ID=YOUR_WEB_APPLICATION_CLIENT_ID.apps.googleusercontent.com
```

During `npm run build`, the value is injected into `dist/manifest.json`:

```json
"oauth2": {
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/calendar.events"
  ]
}
```

Without this client ID, the UI and storage flow work, but Google Calendar authorization will fail.

When connecting additional Google accounts, the extension also requests `userinfo.email` during the interactive account chooser flow so it can label the connected calendar account.

Additional Google accounts use `chrome.identity.launchWebAuthFlow`, so they need a separate Google OAuth client:

1. In Google Cloud Console, create another OAuth client with application type **Web application**.
2. Add this authorized redirect URI:

   ```text
   https://YOUR_EXTENSION_ID.chromiumapp.org/google
   ```

3. Put that Web application client ID in `.env` as `VITE_SLOTTO_GOOGLE_OAUTH_WEB_CLIENT_ID`.

The Chrome Extension client ID remains required for the current Chrome account flow.

## Architecture

- `src/services`: Pure scheduling, formatting, parsing, and date logic.
- `src/adapters`: Chrome storage adapter. A future web app can add another adapter here.
- `src/popup`: Extension popup UI.
- `src/background`: MV3 background service worker and context menu wiring.
- `src/content`: Page insertion bridge for Gmail, LinkedIn, BizReach, and Green.

Calendar API integration is intentionally stubbed for the first runnable shell. The service layer already accepts `busyEvents` and `pendingEvents`, so Google Calendar and Outlook adapters can be added without changing popup behavior.
