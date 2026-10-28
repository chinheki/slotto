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

- [x] 2026-10-28 UTC: prepare local-change handoff and rerun extension build, smoke test, and web build before backup; browser/OAuth/device validation remains pending.

- [x] Combine web calendar and candidate time views into one main screen
- [x] Move web candidate generation options back onto the main screen
- [x] Keep web settings focused on display language and account settings
- [x] Implement no-backend Google Web OAuth for Web App
- [x] Read Web App Google Calendar events into the main calendar
- [x] Handle Google all-day events as date-only exclusive-end events
- [x] Deduplicate cached Google events after all-day/timed event changes
- [x] Add hard refresh calendar button to clear Google event cache before reload
- [x] Allow manual candidate selection on occupied calendar times
- [x] Add reconnect action for additional Google Calendar accounts
- [x] Move web settings behind a separate screen switch
- [x] Add PWA install metadata and service worker for web app
- [x] Create mobile-first web app shell under web/
- [x] Reuse shared scheduling services in the web app
- [x] Rename extension display name to Slotto
- [x] Set concept 03 PNG assets as the active extension icon
- [x] Generate SVG icon concepts
- [x] Start manual time selection with no pre-filled suggested slots
- [x] Preserve generated candidate text after creating placeholder events
- [x] Randomize candidate time generation from valid free slots
- [x] Align generated candidate starts to 0 or 30 minutes
- [x] Restrict selectable duration increments to 30 minutes
- [x] Add configurable system and pixel-mascot event reminders
- [x] Add a 10-second delayed reminder test button
- [x] Replace the reminder parrot with the provided pixel character
- [x] Fix notification image loading with an absolute extension URL and icon fallback

## P1

- [ ] Improve recurring event edit behavior
- [ ] Separate meeting URL from description in event edit flow
- [ ] Create OAuth setup documentation
- [ ] Create storage and authorization documentation
- [ ] Create placeholder event state documentation
- [ ] Clean up unused legacy files

## P2

- [ ] Add Web App flow to reconnect additional Google Calendar accounts per browser/device
- [ ] Add Web App Google Calendar event creation
- [ ] Add Web App placeholder event creation
- [ ] Outlook Calendar integration
- [ ] Gmail message parsing
- [ ] LinkedIn / BizReach / Green page parsing
- [ ] AI-assisted time parsing
- [ ] Chrome Web Store release checklist
- [ ] Privacy policy draft

## Later

- [ ] Add Firebase DB for Slotto user and connected calendar account sync
- [ ] Backend sync option
- [ ] Team/shared scheduling
- [ ] Calendar color and urgency classification
- [ ] Interview pipeline CRM
- [ ] Mobile experience
