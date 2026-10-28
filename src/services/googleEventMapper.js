// Shared Google Calendar event mapper for extension and web adapters.
export function toSlottoCalendarEvent(item, { accountId, accountEmail = '', placeholderPrefix = '' }) {
  const isAllDay = Boolean(item.start?.date && item.end?.date);
  const start = isAllDay ? dateOnlyToLocalMidnightIso(item.start.date) : item.start?.dateTime;
  const end = isAllDay ? dateOnlyToLocalMidnightIso(item.end.date) : item.end?.dateTime;
  if (!start || !end) {
    return null;
  }

  const isSlottoPlaceholder = isPlaceholderEvent(item, placeholderPrefix);
  const originalTitle = item.summary || '(No title)';

  return {
    id: `${accountId}-${item.id}`,
    provider: 'google',
    title: isSlottoPlaceholder ? removePlaceholderPrefix(originalTitle, placeholderPrefix) : originalTitle,
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    status: isSlottoPlaceholder ? 'pending' : 'confirmed',
    sourceAccountId: accountId,
    sourceAccountEmail: accountEmail,
    details: {
      googleEventId: item.id,
      originalTitle,
      isAllDay,
      allDayStartDate: item.start?.date || '',
      allDayEndDateExclusive: item.end?.date || '',
      isSlottoPlaceholder,
      placeholderBatchId: item.extendedProperties?.private?.slottoPlaceholderBatchId || '',
      description: item.description || '',
      location: item.location || '',
      htmlLink: item.htmlLink || '',
      hangoutLink: item.hangoutLink || '',
      conferenceLinks: getConferenceLinks(item),
      recurrence: item.recurrence ?? [],
      recurringEventId: item.recurringEventId || '',
      eventType: item.eventType || '',
      organizer: item.organizer ? {
        email: item.organizer.email || '',
        displayName: item.organizer.displayName || ''
      } : null,
      creator: item.creator ? {
        email: item.creator.email || '',
        displayName: item.creator.displayName || ''
      } : null,
      attendees: (item.attendees ?? []).map((attendee) => ({
        email: attendee.email || '',
        displayName: attendee.displayName || '',
        responseStatus: attendee.responseStatus || ''
      })),
      status: item.status || '',
      visibility: item.visibility || '',
      updated: item.updated || '',
      created: item.created || ''
    }
  };
}

export function dateOnlyToLocalMidnightIso(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}

function isPlaceholderEvent(item, placeholderPrefix) {
  return Boolean(placeholderPrefix && item.summary?.startsWith(placeholderPrefix))
    || item.extendedProperties?.private?.slottoPlaceholder === 'true';
}

function removePlaceholderPrefix(title = '', placeholderPrefix) {
  return placeholderPrefix ? title.replace(placeholderPrefix, '').trim() : title;
}

function getConferenceLinks(item) {
  const entryPoints = item.conferenceData?.entryPoints ?? [];
  return entryPoints
    .filter((entryPoint) => entryPoint.uri)
    .map((entryPoint) => ({
      type: entryPoint.entryPointType || '',
      uri: entryPoint.uri,
      label: entryPoint.label || ''
    }));
}
