export function parseSelectedTimeText(text) {
  if (!text) {
    return null;
  }

  const normalized = text.replace(/\s+/g, ' ').trim();
  const dateMatch = normalized.match(/(\d{1,2})[\/月.-](\d{1,2})(?:日)?/);
  const timeMatch = normalized.match(/(\d{1,2}):(\d{2})\s*(?:[〜~\-–—]|から|to)\s*(\d{1,2}):(\d{2})/i);

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const now = new Date();
  const month = Number(dateMatch[1]) - 1;
  const day = Number(dateMatch[2]);
  const start = new Date(now.getFullYear(), month, day, Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
  const end = new Date(now.getFullYear(), month, day, Number(timeMatch[3]), Number(timeMatch[4]), 0, 0);

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  if (start < now && now.getMonth() > month) {
    start.setFullYear(now.getFullYear() + 1);
    end.setFullYear(now.getFullYear() + 1);
  }

  return {
    rawText: normalized,
    slot: {
      id: `${start.toISOString()}_${end.toISOString()}`,
      start: start.toISOString(),
      end: end.toISOString()
    }
  };
}
