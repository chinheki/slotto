// Google Calendar Web OAuth adapter for the no-backend Slotto web app phase.
import { toSlottoCalendarEvent } from '../../../src/services/googleEventMapper.js';

const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const USERINFO_SCOPE = 'https://www.googleapis.com/auth/userinfo.email';
const PLACEHOLDER_CLIENT_ID = 'YOUR_WEB_APPLICATION_CLIENT_ID.apps.googleusercontent.com';

let googleIdentityPromise;

export const googleWebClientId = import.meta.env.VITE_SLOTTO_GOOGLE_OAUTH_WEB_CLIENT_ID || PLACEHOLDER_CLIENT_ID;

export function hasConfiguredGoogleWebClient() {
  return Boolean(googleWebClientId) && googleWebClientId !== PLACEHOLDER_CLIENT_ID;
}

export async function connectGoogleCalendarWeb({ timeMin, timeMax } = {}) {
  if (!hasConfiguredGoogleWebClient()) {
    return missingClientResult();
  }

  const tokenResult = await requestGoogleAccessToken({ prompt: 'select_account consent' });
  if (!tokenResult.ok) {
    return tokenResult;
  }

  const profileResult = await fetchGoogleProfile(tokenResult.accessToken);
  if (!profileResult.ok) {
    return profileResult;
  }

  const profile = profileResult.profile;
  const account = {
    id: `google-web:${profile.id || profile.email}`,
    provider: 'google',
    email: profile.email,
    name: profile.name || profile.email,
    picture: profile.picture || '',
    accessToken: tokenResult.accessToken,
    expiresAt: new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString(),
    connectedAt: new Date().toISOString(),
    lastSyncedAt: ''
  };

  const eventsResult = await fetchGoogleCalendarWebEvents({ account, timeMin, timeMax });
  if (!eventsResult.ok) {
    return eventsResult;
  }

  return {
    ok: true,
    account: {
      ...account,
      lastSyncedAt: new Date().toISOString(),
      eventCount: eventsResult.events.length
    },
    events: eventsResult.events
  };
}

export async function fetchGoogleCalendarWebEvents({ account, timeMin, timeMax }) {
  if (!hasConfiguredGoogleWebClient()) {
    return missingClientResult();
  }

  if (!account?.accessToken) {
    return {
      ok: false,
      reason: 'missing-token',
      message: 'Google Calendar reconnect is required.'
    };
  }

  if (account.expiresAt && new Date(account.expiresAt).getTime() <= Date.now()) {
    return {
      ok: false,
      reason: 'token-expired',
      message: 'Google Calendar authorization expired. Please reconnect this account.'
    };
  }

  const url = new URL(CALENDAR_EVENTS_URL);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');
  url.searchParams.set('timeMin', timeMin ?? rangeStartIso());
  url.searchParams.set('timeMax', timeMax ?? rangeEndIso());

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${account.accessToken}`
    }
  });

  if (response.status === 401) {
    return {
      ok: false,
      reason: 'token-expired',
      message: 'Google Calendar authorization expired. Please reconnect this account.'
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: 'calendar-api-error',
      message: `Google Calendar returned ${response.status}.`
    };
  }

  const payload = await response.json();
  return {
    ok: true,
    events: (payload.items ?? [])
      .filter((item) => item.status !== 'cancelled')
      .map((item) => toCalendarEvent(item, account))
      .filter(Boolean)
  };
}

async function requestGoogleAccessToken({ prompt }) {
  try {
    await loadGoogleIdentityServices();
  } catch (error) {
    return {
      ok: false,
      reason: 'identity-script-error',
      message: error?.message ?? String(error)
    };
  }

  return new Promise((resolve) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: googleWebClientId,
      scope: `${CALENDAR_SCOPE} ${USERINFO_SCOPE}`,
      callback: (response) => {
        if (response?.error) {
          resolve({
            ok: false,
            reason: 'authorization-failed',
            message: response.error_description || response.error
          });
          return;
        }
        resolve({
          ok: true,
          accessToken: response.access_token,
          expiresIn: Number(response.expires_in || 3600)
        });
      }
    });

    tokenClient.requestAccessToken({ prompt });
  });
}

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (!googleIdentityPromise) {
    googleIdentityPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT_URL}"]`);
      if (existingScript) {
        existingScript.addEventListener('load', resolve, { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = GOOGLE_IDENTITY_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Google Identity Services.'));
      document.head.append(script);
    });
  }

  return googleIdentityPromise;
}

async function fetchGoogleProfile(accessToken) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    return {
      ok: false,
      reason: 'profile-api-error',
      message: `Google profile returned ${response.status}.`
    };
  }

  return {
    ok: true,
    profile: await response.json()
  };
}

function toCalendarEvent(item, account) {
  return toSlottoCalendarEvent(item, {
    accountId: account.id,
    accountEmail: account.email
  });
}

function missingClientResult() {
  return {
    ok: false,
    reason: 'missing-web-client-id',
    message: 'Set VITE_SLOTTO_GOOGLE_OAUTH_WEB_CLIENT_ID to a Google Web application OAuth client ID.'
  };
}

function rangeStartIso() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 14);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

function rangeEndIso() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 90);
  date.setUTCHours(23, 59, 59, 999);
  return date.toISOString();
}
