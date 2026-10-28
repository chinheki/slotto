// Default user settings and sample calendar data for extension and web shells.
export const defaultSettings = {
  calendars: {
    google: true,
    outlook: true
  },
  rules: {
    avoidWeekends: true,
    avoidBeforeHour: 10,
    avoidAfterHour: 21,
    avoidWorkHours: false,
    addBufferMinutes: 30,
    avoidPendingSlots: true,
    maxInterviewsPerDay: 2
  },
  language: 'ja',
  outputLanguages: ['ja'],
  calendarView: 'month',
  calendarDensity: 'comfortable',
  availabilityStartTime: '08:00',
  availabilityEndTime: '22:00',
  avoidWeekendsAndHolidays: true,
  useFixedDuration: true,
  slotDurationMinutes: 60,
  generatedSlotCount: 3,
  remindersEnabled: true,
  reminderLeadMinutes: 30,
  placeholderEventTitle: '面接',
  pendingExpirationHours: 48
};

export const sampleBusyEvents = [
  {
    id: 'sample-google-1',
    provider: 'google',
    title: 'Existing meeting',
    start: nextIsoAt(1, 18, 0),
    end: nextIsoAt(1, 19, 0),
    status: 'confirmed'
  },
  {
    id: 'sample-outlook-1',
    provider: 'outlook',
    title: 'Focus block',
    start: nextIsoAt(2, 19, 30),
    end: nextIsoAt(2, 20, 30),
    status: 'confirmed'
  }
];

function nextIsoAt(daysFromToday, hour, minute) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}
