export function expirePendingEvents(pendingEvents, expirationHours, now = new Date()) {
  const maxAgeMs = expirationHours * 60 * 60 * 1000;
  return pendingEvents.filter((event) => {
    if (!event.createdAt) {
      return true;
    }
    return now.getTime() - new Date(event.createdAt).getTime() < maxAgeMs;
  });
}
