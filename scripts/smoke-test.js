// Minimal non-browser regression checks for manifest shape, availability
// generation, slot formatting, and selected-text parsing.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultSettings, sampleBusyEvents } from '../src/services/defaults.js';
import { formatSlots } from '../src/services/formatter.js';
import { parseSelectedTimeText } from '../src/services/parser.js';
import { generateAvailability } from '../src/services/scheduler.js';

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.background.type, 'module');

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

console.log('smoke test ok');
