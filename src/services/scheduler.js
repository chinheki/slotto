// Availability generation and local interview event helpers.
// All candidate slot boundaries are emitted as UTC ISO strings.
import { addMinutes, isWeekend, overlaps, slotId, startOfDay } from './dateTime.js';
import japaneseHolidays from 'japanese-holidays';

const DEFAULT_SEARCH_DAYS = 14;
const STEP_MINUTES = 30;

export function generateAvailability({ busyEvents, pendingEvents, settings, now = new Date() }) {
  const eventsToAvoid = [
    ...busyEvents,
    ...(settings.rules.avoidPendingSlots ? pendingEvents : [])
  ];
  const slots = [];
  const interviewsByDay = new Map();
  const searchStart = addMinutes(now, 60);

  const maxResults = clamp(settings.generatedSlotCount ?? 3, 1, 10);
  const slotDurationMinutes = roundToStep(settings.slotDurationMinutes ?? 60, STEP_MINUTES);
  const [startHour, startMinute] = parseTime(settings.availabilityStartTime ?? '08:00');
  const [endHour, endMinute] = parseTime(settings.availabilityEndTime ?? '22:00');
  const bufferMinutes = settings.rules.addBufferMinutes ?? 30;
  const candidates = [];

  for (let dayOffset = 0; dayOffset < DEFAULT_SEARCH_DAYS; dayOffset += 1) {
    const day = startOfDay(addMinutes(searchStart, dayOffset * 24 * 60));

    if (settings.avoidWeekendsAndHolidays && (isWeekend(day) || isJapaneseHoliday(day))) {
      continue;
    }

    const dayStart = new Date(day);
    dayStart.setHours(startHour, startMinute, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    if (dayEnd <= dayStart) {
      continue;
    }

    const freeRanges = getFreeRanges({
      rangeStart: roundUpToStep(new Date(Math.max(dayStart.getTime(), searchStart.getTime())), STEP_MINUTES),
      rangeEnd: dayEnd,
      events: eventsToAvoid,
      bufferMinutes
    });

    for (const range of freeRanges) {
      if (!settings.useFixedDuration) {
        const alignedStart = roundUpToStep(range.start, STEP_MINUTES);
        const alignedEnd = roundDownToStep(range.end, STEP_MINUTES);
        if (alignedEnd > alignedStart) {
          candidates.push({
            id: slotId(alignedStart, alignedEnd),
            start: alignedStart.toISOString(),
            end: alignedEnd.toISOString()
          });
        }
        continue;
      }

      for (let slotStart = roundUpToStep(range.start, STEP_MINUTES); addMinutes(slotStart, slotDurationMinutes) <= range.end; slotStart = addMinutes(slotStart, STEP_MINUTES)) {
        const slotEnd = addMinutes(slotStart, slotDurationMinutes);
        candidates.push({
          id: slotId(slotStart, slotEnd),
          start: slotStart.toISOString(),
          end: slotEnd.toISOString()
        });
      }
    }
  }

  for (const candidate of shuffle(candidates)) {
    if (slots.length >= maxResults) {
      break;
    }
    const dayKey = candidate.start.slice(0, 10);
    const currentDayCount = interviewsByDay.get(dayKey) ?? 0;
    if (settings.rules.maxInterviewsPerDay && currentDayCount >= settings.rules.maxInterviewsPerDay) {
      continue;
    }
    if (hasConflict(new Date(candidate.start), new Date(candidate.end), slots, 0)) {
      continue;
    }

    slots.push(candidate);
    interviewsByDay.set(dayKey, currentDayCount + 1);
  }

  return slots.sort((a, b) => new Date(a.start) - new Date(b.start));
}

export function createInterviewEvent({ slot, company, title, status }) {
  return {
    id: `interview-${crypto.randomUUID()}`,
    provider: 'local',
    title: title || `${company || 'Interview'} schedule`,
    start: slot.start,
    end: slot.end,
    status,
    company: company || undefined,
    createdAt: new Date().toISOString()
  };
}

function hasConflict(slotStart, slotEnd, events, bufferMinutes) {
  return events.some((event) => {
    const eventStart = addMinutes(new Date(event.start), -bufferMinutes);
    const eventEnd = addMinutes(new Date(event.end), bufferMinutes);
    return overlaps(slotStart, slotEnd, eventStart, eventEnd);
  });
}

function getFreeRanges({ rangeStart, rangeEnd, events, bufferMinutes }) {
  const busyRanges = events
    .map((event) => ({
      start: addMinutes(new Date(event.start), -bufferMinutes),
      end: addMinutes(new Date(event.end), bufferMinutes)
    }))
    .filter((event) => overlaps(rangeStart, rangeEnd, event.start, event.end))
    .sort((a, b) => a.start - b.start);

  const freeRanges = [];
  let cursor = rangeStart;

  for (const busy of busyRanges) {
    if (busy.start > cursor) {
      freeRanges.push({ start: cursor, end: new Date(Math.min(busy.start.getTime(), rangeEnd.getTime())) });
    }
    if (busy.end > cursor) {
      cursor = new Date(Math.max(cursor.getTime(), busy.end.getTime()));
    }
    if (cursor >= rangeEnd) {
      break;
    }
  }

  if (cursor < rangeEnd) {
    freeRanges.push({ start: cursor, end: rangeEnd });
  }

  return freeRanges.filter((range) => range.end > range.start);
}

function parseTime(value) {
  const [hour, minute] = String(value).split(':').map(Number);
  return [
    Number.isFinite(hour) ? hour : 8,
    Number.isFinite(minute) ? minute : 0
  ];
}

function roundUpToStep(date, stepMinutes) {
  const result = new Date(date);
  const totalMinutes = result.getUTCHours() * 60 + result.getUTCMinutes();
  const roundedMinutes = Math.ceil(totalMinutes / stepMinutes) * stepMinutes;
  result.setUTCHours(Math.floor(roundedMinutes / 60) % 24, roundedMinutes % 60, 0, 0);
  if (roundedMinutes >= 24 * 60) {
    result.setUTCDate(result.getUTCDate() + 1);
  }
  return result;
}

function roundDownToStep(date, stepMinutes) {
  const result = new Date(date);
  const totalMinutes = result.getUTCHours() * 60 + result.getUTCMinutes();
  const roundedMinutes = Math.floor(totalMinutes / stepMinutes) * stepMinutes;
  result.setUTCHours(Math.floor(roundedMinutes / 60), roundedMinutes % 60, 0, 0);
  return result;
}

function roundToStep(value, stepMinutes) {
  return Math.max(stepMinutes, Math.round((Number(value) || stepMinutes) / stepMinutes) * stepMinutes);
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function isJapaneseHoliday(date) {
  return Boolean(japaneseHolidays.isHoliday(date));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || min));
}
