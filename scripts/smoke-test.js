// Minimal non-browser regression checks for manifest shape, availability
// generation, slot formatting, and selected-text parsing.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultSettings, sampleBusyEvents } from '../src/services/defaults.js';
import { formatSlots } from '../src/services/formatter.js';
import { toSlottoCalendarEvent } from '../src/services/googleEventMapper.js';
import { parseSelectedTimeText } from '../src/services/parser.js';
import { generateAvailability } from '../src/services/scheduler.js';

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.background.type, 'module');
assert.ok(manifest.permissions.includes('alarms'));
assert.ok(manifest.permissions.includes('notifications'));

const slots = generateAvailability({
  busyEvents: sampleBusyEvents,
  pendingEvents: [],
  settings: defaultSettings,
  now: new Date('2026-05-25T09:00:00+09:00')
});
assert.ok(slots.length > 0);
assert.match(formatSlots(slots.slice(0, 1), 'ja'), /\d{1,2}\/\d{1,2}\(.+\)/);
for (const slot of slots) {
  const start = new Date(slot.start);
  const durationMinutes = (new Date(slot.end) - start) / 60000;
  assert.ok([0, 30].includes(start.getUTCMinutes()));
  assert.equal(durationMinutes % 30, 0);
}

const parsed = parseSelectedTimeText('5/27 18:30-20:00');
assert.ok(parsed);
assert.equal(new Date(parsed.slot.start).getHours(), 18);
assert.equal(new Date(parsed.slot.end).getHours(), 20);

const allDayEvent = toSlottoCalendarEvent({
  id: 'puzzle',
  summary: '解谜',
  start: { date: '2026-06-04' },
  end: { date: '2026-06-05' }
}, {
  accountId: 'google:test',
  accountEmail: 'test@example.com'
});
assert.equal(allDayEvent.details.isAllDay, true);
assert.equal(allDayEvent.details.allDayStartDate, '2026-06-04');
assert.equal(allDayEvent.details.allDayEndDateExclusive, '2026-06-05');
assert.equal(new Date(allDayEvent.start).getHours(), 0);
assert.equal(new Date(allDayEvent.end).getHours(), 0);
assert.match(formatSlots([allDayEvent], 'zh'), /全天/);

console.log('smoke test ok');
