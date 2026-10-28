// Chrome extension Google Calendar adapter for OAuth, event reads, and event writes.
import { toSlottoCalendarEvent } from '../services/googleEventMapper.js';

const CALENDAR_EVENTS_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
export const SLOTTO_PLACEHOLDER_PREFIX = '【Slotto占位】';

export async function fetchPrimaryGoogleCalendarEvents({ interactive = false, accountId = 'primary', timeMin, timeMax } = {}) {
  if (!hasChromeIdentity()) {
    return {
      ok: false,
      reason: 'chrome-identity-unavailable',
      message: 'Google Calendar access is available inside the Chrome extension.'
    };
  }

  const auth = await getPrimaryAuthToken(interactive);
  if (!auth.ok) {
    return {
      ok: false,
      reason: auth.reason,
      message: auth.message
    };
  }

  const token = auth.token;

  const result = await fetchEventsWithToken({
    token,
    accountId,
    timeMin,
    timeMax,
    onUnauthorized: () => chrome.identity.removeCachedAuthToken({ token })
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    events: result.events
  };
}

export async function createPrimaryPlaceholderEvents({ slots, title, description = '', accountId, accountEmail }) {
  const auth = await getPrimaryAuthToken(true);
  if (!auth.ok) {
    return auth;
  }

  const batchId = crypto.randomUUID();
  const createdEvents = [];

  for (const slot of slots) {
    const response = await fetch(CALENDAR_EVENTS_URL, {
      method: 'POST',
      headers: jsonHeaders(auth.token),
      body: JSON.stringify({
        summary: `${SLOTTO_PLACEHOLDER_PREFIX}${title || '面接'}`,
        start: { dateTime: slot.start },
        end: { dateTime: slot.end },
        description,
        extendedProperties: {
          private: {
            slottoPlaceholder: 'true',
            slottoPlaceholderBatchId: batchId
          }
        }
      })
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: 'calendar-api-error',
        message: `Google Calendar returned ${response.status} while creating placeholders.`
      };
    }

    createdEvents.push(toCalendarEvent(await response.json(), accountId, accountEmail));
  }

  return {
    ok: true,
    events: createdEvents
  };
}

export async function updatePrimaryPlaceholderBatch({ events, title, description = '' }) {
  const auth = await getPrimaryAuthToken(true);
  if (!auth.ok) {
    return auth;
  }

  const updatedEvents = [];
  for (const event of events) {
    const googleEventId = event.details?.googleEventId;
    if (!googleEventId) {
      continue;
    }

    const patchResponse = await fetch(`${CALENDAR_EVENTS_URL}/${encodeURIComponent(googleEventId)}`, {
      method: 'PATCH',
      headers: jsonHeaders(auth.token),
      body: JSON.stringify({
        summary: `${SLOTTO_PLACEHOLDER_PREFIX}${title || '面接'}`,
        description,
        extendedProperties: {
          private: {
            slottoPlaceholder: 'true',
            slottoPlaceholderBatchId: event.details?.placeholderBatchId || ''
          }
        }
      })
    });

    if (!patchResponse.ok) {
      return {
        ok: false,
        reason: 'calendar-api-error',
        message: `Google Calendar returned ${patchResponse.status} while updating placeholders.`
      };
    }

    updatedEvents.push(toCalendarEvent(await patchResponse.json(), event.sourceAccountId, event.sourceAccountEmail));
  }

  return {
    ok: true,
    events: updatedEvents
  };
}

export async function createPrimaryCalendarEvent({ event, accountId, accountEmail }) {
  const auth = await getPrimaryAuthToken(true);
  if (!auth.ok) {
    return auth;
  }

  const response = await fetch(CALENDAR_EVENTS_URL, {
    method: 'POST',
    headers: jsonHeaders(auth.token),
    body: JSON.stringify(toGoogleEventPayload(event))
  });

  if (!response.ok) {
    return {
      ok: false,
      reason: 'calendar-api-error',
      message: `Google Calendar returned ${response.status} while creating the event.`
    };
  }

  return {
    ok: true,
    event: toCalendarEvent(await response.json(), accountId, accountEmail)
  };
}

export async function updateGoogleCalendarEvent({ event, accountId, accountEmail, accessToken }) {
  const auth = accessToken ? { ok: true, token: accessToken } : await getPrimaryAuthToken(true);
  if (!auth.ok) {
    return auth;
  }

  const googleEventId = event.googleEventId;
  if (!googleEventId) {
    return {
      ok: false,
      reason: 'missing-event-id',
      message: 'Selected event does not have a Google Calendar event id.'
    };
  }

  const response = await fetch(`${CALENDAR_EVENTS_URL}/${encodeURIComponent(googleEventId)}`, {
    method: 'PATCH',
    headers: jsonHeaders(auth.token),
    body: JSON.stringify(toGoogleEventPayload(event))
  });

  if (response.status === 401) {
    return {
      ok: false,
      reason: 'token-expired',
      message: 'Calendar authorization expired. Please reconnect the account.'
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: 'calendar-api-error',
      message: `Google Calendar returned ${response.status} while updating the event.`
    };
  }

  return {
    ok: true,
    event: toCalendarEvent(await response.json(), accountId, accountEmail)
  };
}

export async function confirmPrimaryPlaceholderEvent({ event, siblingEvents }) {
  const auth = await getPrimaryAuthToken(true);
  if (!auth.ok) {
    return auth;
  }

  const googleEventId = event.details?.googleEventId;
  if (!googleEventId) {
    return {
      ok: false,
      reason: 'missing-event-id',
      message: 'Selected placeholder does not have a Google Calendar event id.'
    };
  }

  const confirmedTitle = removePlaceholderPrefix(event.details?.originalTitle || event.title);
  const patchResponse = await fetch(`${CALENDAR_EVENTS_URL}/${encodeURIComponent(googleEventId)}`, {
    method: 'PATCH',
    headers: jsonHeaders(auth.token),
    body: JSON.stringify({
      summary: confirmedTitle,
      extendedProperties: {
        private: {
          slottoPlaceholder: 'false',
          slottoPlaceholderBatchId: ''
        }
      }
    })
  });

  if (!patchResponse.ok) {
    return {
      ok: false,
      reason: 'calendar-api-error',
      message: `Google Calendar returned ${patchResponse.status} while confirming the placeholder.`
    };
  }

  const deletedEventIds = [];
  for (const sibling of siblingEvents) {
    const siblingGoogleEventId = sibling.details?.googleEventId;
    if (!siblingGoogleEventId || sibling.id === event.id) {
      continue;
    }
    const deleteResponse = await fetch(`${CALENDAR_EVENTS_URL}/${encodeURIComponent(siblingGoogleEventId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${auth.token}`
      }
    });
    if (deleteResponse.ok || deleteResponse.status === 410 || deleteResponse.status === 404) {
      deletedEventIds.push(sibling.id);
    }
  }

  return {
    ok: true,
    event: toCalendarEvent(await patchResponse.json(), event.sourceAccountId, event.sourceAccountEmail),
    deletedEventIds
  };
}

export async function deletePrimaryPlaceholderBatch({ events }) {
  const auth = await getPrimaryAuthToken(true);
  if (!auth.ok) {
    return auth;
  }

  const deletedEventIds = [];
  for (const event of events) {
    const googleEventId = event.details?.googleEventId;
    if (!googleEventId) {
      continue;
    }

    const deleteResponse = await fetch(`${CALENDAR_EVENTS_URL}/${encodeURIComponent(googleEventId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${auth.token}`
      }
    });
    if (deleteResponse.ok || deleteResponse.status === 410 || deleteResponse.status === 404) {
      deletedEventIds.push(event.id);
      continue;
    }

    return {
      ok: false,
      reason: 'calendar-api-error',
      message: `Google Calendar returned ${deleteResponse.status} while deleting placeholders.`
    };
  }

  return {
    ok: true,
    deletedEventIds
  };
}

export async function connectAdditionalGoogleCalendar({ timeMin, timeMax, loginHint = '' } = {}) {
  if (!hasWebAuthFlow()) {
    return {
      ok: false,
      reason: 'chrome-identity-unavailable',
      message: 'Google account chooser is available inside the Chrome extension.'
    };
  }

  const clientId = import.meta.env.VITE_SLOTTO_GOOGLE_OAUTH_WEB_CLIENT_ID;
  if (!clientId) {
    return {
      ok: false,
      reason: 'missing-web-client-id',
      message: 'Add another Google account requires VITE_SLOTTO_GOOGLE_OAUTH_WEB_CLIENT_ID. Create a Web application OAuth client and add the chrome.identity redirect URI.'
    };
  }

  let redirectUrl;
  try {
    const authUrl = buildAccountChooserUrl(clientId, loginHint);
    redirectUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    });
  } catch (error) {
    return {
      ok: false,
      reason: 'authorization-failed',
      message: error?.message ?? String(error)
    };
  }

  const token = extractAccessToken(redirectUrl);
  if (!token) {
    return {
      ok: false,
      reason: 'authorization-failed',
      message: 'Google did not return an access token.'
    };
  }

  const profile = await fetchGoogleProfile(token);
  if (!profile.ok) {
    return profile;
  }

  const accountId = `google:${profile.profile.id || profile.profile.email}`;
  const eventsResult = await fetchEventsWithToken({
    token,
    accountId,
    accountEmail: profile.profile.email,
    timeMin,
    timeMax
  });
  if (!eventsResult.ok) {
    return eventsResult;
  }

  return {
    ok: true,
    account: {
      id: accountId,
      provider: 'google',
      email: profile.profile.email,
      calendarId: 'primary',
      connectedAt: new Date().toISOString()
    },
    accessToken: token,
    events: eventsResult.events
  };
}

export async function fetchAdditionalGoogleCalendarEvents({ account, accessToken, timeMin, timeMax }) {
  if (!accessToken) {
    return {
      ok: false,
      reason: 'authorization-required',
      message: 'Calendar reconnect is required before live events can be shown.'
    };
  }

  return fetchEventsWithToken({
    token: accessToken,
    accountId: account.id,
    accountEmail: account.email,
    timeMin,
    timeMax
  });
}

async function fetchEventsWithToken({ token, accountId, accountEmail = '', timeMin, timeMax, onUnauthorized }) {
  const url = new URL(CALENDAR_EVENTS_URL);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');
  url.searchParams.set('timeMin', timeMin ?? rangeStartIso());
  url.searchParams.set('timeMax', timeMax ?? rangeEndIso());

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status === 401) {
    await onUnauthorized?.();
    return {
      ok: false,
      reason: 'token-expired',
      message: 'Calendar authorization expired. Please reconnect the account.'
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
      .map((item) => toCalendarEvent(item, accountId, accountEmail))
      .filter(Boolean)
  };
}

function toCalendarEvent(item, accountId, accountEmail) {
  return toSlottoCalendarEvent(item, {
    accountId,
    accountEmail,
    placeholderPrefix: SLOTTO_PLACEHOLDER_PREFIX
  });
}

function toGoogleEventPayload(event) {
  const descriptionParts = [event.description?.trim(), event.meetingUrl?.trim()].filter(Boolean);
  return {
    summary: event.title || 'New event',
    start: { dateTime: event.start },
    end: { dateTime: event.end },
    location: event.location || '',
    description: descriptionParts.join('\n\n')
  };
}

async function getPrimaryAuthToken(interactive) {
  if (!hasChromeIdentity()) {
    return {
      ok: false,
      reason: 'chrome-identity-unavailable',
      message: 'Google Calendar access is available inside the Chrome extension.'
    };
  }

  try {
    const result = await chrome.identity.getAuthToken({
      interactive,
      scopes: [CALENDAR_SCOPE]
    });
    const token = typeof result === 'string' ? result : result?.token;
    if (!token) {
      return {
        ok: false,
        reason: 'authorization-required',
        message: 'Calendar authorization is required.'
      };
    }
    return { ok: true, token };
  } catch (error) {
    return {
      ok: false,
      reason: interactive ? 'authorization-failed' : 'authorization-required',
      message: getIdentityErrorMessage(error, interactive)
    };
  }
}

function jsonHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

function removePlaceholderPrefix(title = '') {
  return title.replace(SLOTTO_PLACEHOLDER_PREFIX, '').trim();
}

async function fetchGoogleProfile(token) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${token}`
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

function buildAccountChooserUrl(clientId, loginHint = '') {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('redirect_uri', chrome.identity.getRedirectURL('google'));
  url.searchParams.set('scope', `${CALENDAR_SCOPE} https://www.googleapis.com/auth/userinfo.email`);
  url.searchParams.set('prompt', 'select_account consent');
  if (loginHint) {
    url.searchParams.set('login_hint', loginHint);
  }
  return url.toString();
}

function extractAccessToken(redirectUrl) {
  const url = new URL(redirectUrl);
  const params = new URLSearchParams(url.hash.replace(/^#/, ''));
  return params.get('access_token');
}

function rangeStartIso() {
  const date = new Date();
  date.setDate(date.getDate() - 14);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function rangeEndIso() {
  const date = new Date();
  date.setDate(date.getDate() + 90);
  date.setHours(23, 59, 59, 999);
  return date.toISOString();
}

function getIdentityErrorMessage(error, interactive) {
  const raw = error?.message ?? String(error);
  if (!interactive) {
    return 'Calendar reconnect is required before live events can be shown.';
  }
  if (raw.includes('OAuth2 not granted or revoked')) {
    return 'Google Calendar permission was not granted.';
  }
  return raw;
}

function hasChromeIdentity() {
  return typeof chrome !== 'undefined' && chrome.identity?.getAuthToken;
}

function hasWebAuthFlow() {
  return typeof chrome !== 'undefined' && chrome.identity?.launchWebAuthFlow;
}
