# Tasks

## P0

- [ ] Update README to match current Google Calendar implementation
- [ ] Harden Google Calendar token expiration handling
- [ ] Add conflict checks before creating normal calendar events
- [ ] Add conflict checks before creating placeholder events
- [ ] Make placeholder create/delete operations recover from partial API failure
- [ ] Define timezone policy and apply it consistently
- [ ] Add tests for availability generation edge cases
- [ ] Add tests for placeholder batch create/edit/confirm/delete
- [ ] Add Google Calendar API mock tests

## Done

- [x] Preserve generated candidate text after creating placeholder events
- [x] Randomize candidate time generation from valid free slots
- [x] Align generated candidate starts to 0 or 30 minutes
- [x] Restrict selectable duration increments to 30 minutes

## P1

- [ ] Improve additional Google account reconnect flow
- [ ] Add manual refresh calendar button
- [ ] Handle all-day events correctly in availability calculation
- [ ] Improve recurring event edit behavior
- [ ] Separate meeting URL from description in event edit flow
- [ ] Create OAuth setup documentation
- [ ] Create storage and authorization documentation
- [ ] Create placeholder event state documentation
- [ ] Clean up unused legacy files

## P2

- [ ] Outlook Calendar integration
- [ ] Gmail message parsing
- [ ] LinkedIn / BizReach / Green page parsing
- [ ] AI-assisted time parsing
- [ ] Chrome Web Store release checklist
- [ ] Privacy policy draft
- [ ] Web App shell exploration

## Later

- [ ] Backend sync option
- [ ] Team/shared scheduling
- [ ] Calendar color and urgency classification
- [ ] Interview pipeline CRM
- [ ] Mobile experience
