# Slotto - Product Requirement Document (PRD)

## 1. Product Overview

### Product Name

Slotto

### Product Type

Chrome Extension for job interview scheduling workflow automation.

### Vision

Help professionals manage interview scheduling workflows across Gmail, LinkedIn, BizReach, and calendar platforms with minimal manual coordination.

### Problem Statement

Professionals actively job searching often face the following issues:

* Repeatedly checking multiple calendars for availability
* Manually formatting candidate time slots
* Double-booking pending interview slots
* Managing scheduling across Google Calendar and Outlook simultaneously
* Handling multilingual recruiter communication
* Tracking tentative vs confirmed interview schedules
* Mental overhead from repetitive scheduling tasks

Current calendar tools are generic and do not understand interview-specific workflows.

---

# 2. Core Product Concept

The extension acts as an "Interview Scheduling Layer" on top of existing calendar systems.

Instead of replacing calendars, the extension:

* Aggregates calendar availability
* Applies user-defined scheduling preferences
* Generates candidate interview slots
* Tracks pending interview reservations
* Helps convert tentative schedules into confirmed events
* Integrates directly into recruiter communication workflows

---

# 3. MVP Scope

## Included in MVP

### Calendar Integration

* Google Calendar integration
* Microsoft Outlook Calendar integration
* If no calendar account is connected, show a calendar-level connect prompt before normal scheduling workflows.
* Google Calendar connection supports using the current Chrome signed-in Google account or choosing another Google account during OAuth.
* Users can connect multiple Google Calendar accounts to one plugin account.
* Calendar availability is shared across Chrome profiles after the user signs into the plugin account.

### Availability Generation

* Generate interview candidate slots
* Apply scheduling rules/preferences
* Support multilingual output

### Calendar Month View

* When the extension popup opens, the first screen shows a Google Calendar-style month view.
* The month view is the primary navigation surface for checking availability, pending slots, and confirmed interviews.
* Users can move between months and select a date before generating or managing interview slots.

### Pending Slot Management

* Mark proposed interview slots as pending
* Exclude pending slots from future suggestions
* Auto-expire pending slots after configurable time
* Phase 1 pending slots are written as real Google Calendar placeholder events in the primary calendar.
* Placeholder events are identified by the title prefix `【Slotto占位】`.

### Context Menu Integration

* Right-click selected time text in Gmail/BizReach
* Add directly into calendar workflow

### Interview Event Management

* Create tentative interview events
* Convert tentative → confirmed
* Replace pending slots

---

## Excluded from MVP

* Native mobile app
* AI email parsing
* Automatic recruiter email detection
* Advanced analytics dashboard
* Team/shared scheduling
* Interview pipeline CRM
* Real-time collaborative scheduling

---

# 4. User Personas

## Primary Persona

### Active Mid/Senior Career Professional

Characteristics:

* Frequently coordinating interviews
* Uses multiple calendars
* Receives recruiter outreach regularly
* Works across international companies
* Needs multilingual communication
* Values productivity and reduced scheduling friction

Examples:

* Software engineers
* Consultants
* Product managers
* Designers
* Senior professionals in job search

---

# 5. User Flows

## Flow A - Generate Availability

### Scenario

User receives recruiter message asking for available interview times.

### Steps

1. User clicks extension icon
2. Popup opens to a Google Calendar-style month view
3. User reviews visible busy, pending, and confirmed interview slots on the month calendar
4. User selects:

   * Calendar sources
   * Daily availability time band
   * Weekend / holiday avoidance
   * Output languages
   * Slot duration or maximum free-range mode
   * Buffer time
   * Number of generated time ranges
5. User clicks "Generate Availability"
6. System:

   * Reads busy slots
   * Reads pending slots
   * Applies rules
   * Generates candidate times
7. User copies generated response
8. User optionally marks generated slots as pending

## Flow A2 - Manually Select Availability

### Scenario

User wants to manually choose candidate interview slots directly from the calendar.

### Steps

1. User opens the Calendar page.
2. User clicks "Select time slots".
3. Calendar switches to week view.
4. Extension starts with no pre-filled suggested slots.
5. User adds time slots directly on the calendar.
6. Each selected slot:

   * Starts only on the hour or half hour
   * Is exactly one hour long
   * Is highlighted on the calendar
   * Can be clicked again to remove it from the selection

7. User clicks "Confirm selection".
8. Extension switches to the Availability page.
9. Generated response text is already filled from the selected slots.
10. User can switch output languages.
11. User clicks create placeholder events.
12. Extension opens a placeholder dialog.
13. User enters:

   * Title (required, default: `面接`)
   * Details (optional)

14. Extension creates placeholder events from the selected slots.
15. The generated candidate text remains unchanged after placeholder creation.
16. Candidate slots refresh only when the user clicks random candidate generation.

### Expected Output

Japanese:

5/27(火) 18:30〜20:00
5/28(水) 19:00〜20:00
5/29(木) 18:00〜19:00

English:

May 27 (Tue) 18:30-20:00 JST
May 28 (Wed) 19:00-20:00 JST

Chinese:

5/27（周二）18:30-20:00
5/28（周三）19:00-20:00

---

### Candidate Time Generation Rules

* Automatically generated candidate slots are randomly selected from valid free slots.
* Candidate start times must be aligned to the hour or half hour.
* User-selectable duration values use 30-minute increments.
* Creating placeholder events must not clear or recalculate the generated response text.
* Clicking the random candidate generation button recalculates and replaces candidate slots.

---

## Flow B - Add Confirmed Interview

### Scenario

Recruiter confirms an interview time.

### Steps

1. User highlights interview time text in Gmail/BizReach
2. Right click
3. Select "Add Interview Schedule"
4. Popup opens
5. System attempts to parse:

   * Date
   * Time
   * Timezone
6. User inputs:

   * Company name
   * Event title
   * Status (Pending / Confirmed)
7. User optionally selects:

   * Replace pending slot
   * Remove tentative reservation
8. System creates calendar event

## Flow B2 - Create Calendar Event Directly

### Scenario

User wants to create a schedule directly from the extension calendar.

### Steps

1. User opens the Calendar page.
2. User clicks an empty time cell in day or week view, or clicks the "Create event" button.
3. Extension opens a lightweight create-event dialog.
4. User enters:

   * Title
   * Start / end time
   * Location
   * Details
   * Meeting URL

5. User saves.
6. Extension creates the event in the primary Google Calendar account.
7. Calendar cache updates immediately and the created event is selected in the details panel.

## Flow B3 - Edit Existing Calendar Event

### Scenario

User wants to update a confirmed schedule from the extension calendar.

### Steps

1. User opens the Calendar page.
2. User clicks an existing confirmed Google Calendar event.
3. Extension shows the event details panel.
4. User clicks "Edit event".
5. User updates title, start/end time, location, meeting URL, or details.
6. Extension writes the update back to the event's source Google Calendar account.
7. Calendar cache updates immediately and the edited event remains selected.

### Notes

* Events from the primary Chrome Google account can be edited through Chrome identity.
* Events from additionally connected accounts require a valid local authorization token; if it has expired or is missing, the user must reconnect that account.

---

# 6. Core Features

## 6.1 Calendar Aggregation

### Requirements

* Connect multiple calendar providers
* Merge busy slots into unified timeline
* Normalize timezone handling
* Support read/write permissions

### Supported Providers

#### MVP

* Google Calendar
* Outlook Calendar

#### Future

* Apple Calendar
* Notion Calendar
* CalDAV

---

## 6.2 Scheduling Rules Engine

### Rule Examples

#### Time Rules

* Avoid weekends
* Avoid before 10:00
* Avoid after 21:00
* Avoid lunch time
* Avoid work hours

#### Buffer Rules

* Add 30 minute buffer
* Add commute buffer

#### Preference Rules

* Prefer grouped interviews
* Prefer evening interviews
* Limit interviews per day
* Avoid fragmented schedules

#### Pending Rules

* Avoid pending slots
* Reserve tentative availability

---

## 6.3 Pending Slot System

### Purpose

Prevent accidental double-booking before recruiter confirmation.

### States

#### Available

Slot is free.

#### Pending

Slot proposed to recruiter but not confirmed.

In Phase 1, pending slots are represented by actual Google Calendar events in the primary calendar.

Placeholder event rules:

* Generated candidate slots can be written to the primary Google Calendar as placeholder reservations.
* Placeholder titles start with `【Slotto占位】`.
* Example: `【Slotto占位】Company X 面接`.
* Before creating placeholder events, the user must confirm the placeholder title and may enter optional details.
* Future availability generation treats these placeholder events as busy time and avoids them.
* Placeholder events created from one generation action share an internal batch id.
* When the user edits one placeholder title/details, all placeholder events from the same batch are updated together.
* When the user confirms one placeholder, the selected event is converted into a confirmed schedule:

  * The `【Slotto占位】` prefix is removed from the title.
  * Other placeholder events from the same batch are deleted from Google Calendar.
  * The calendar cache updates immediately after the operation.

* When the user deletes one placeholder, all placeholder events from the same batch are deleted from Google Calendar.
* If the user deletes or edits placeholders directly in Google Calendar, the extension should reconcile on the next calendar refresh.

#### Confirmed

Slot officially booked.

### Pending Expiration

User-configurable expiration:

* 24h
* 48h
* 72h
* Manual release

### Visual Representation

Pending slots shown differently from confirmed events.

Example:

* Confirmed = solid block
* Pending = semi-transparent block

---

## 6.4 Multilingual Output

### Supported Languages

* Japanese
* English
* Chinese

Users can select one or more output languages at the same time.

### Formatting Requirements

#### Japanese

5/27(火) 18:30〜20:00

#### English

May 27 (Tue) 18:30-20:00 JST

#### Chinese

5/27（周二）18:30-20:00

---

## 6.5 Availability Extraction

### Purpose

Generate practical candidate interview time ranges from connected calendar availability and pending reservations.

### Controls

Availability generation screen includes:

* Daily time band

  * Default: 08:00-22:00
  * Editable with two time pickers
  * Persist after user changes it

* Avoid weekends and Japanese holidays

  * Default: enabled
  * Uses a Japanese holiday data library rather than a hard-coded holiday table

* Generated text languages

  * Multi-select: English / Japanese / Chinese
  * Japanese and Chinese outputs include weekday display

* Duration

  * Default: fixed 1 hour
  * User can disable fixed duration
  * When fixed duration is disabled, generated output uses the maximum available free time range instead of splitting into one-hour slots

* Buffer time between other events

  * Default: 30 minutes
  * User can choose a different buffer

* Number of generated time ranges

  * Default: 3
  * Maximum: 10

* Placeholder event title

  * Default: `面接`
  * Used when writing generated slots as Google Calendar placeholder events
  * Stored title is prefixed with `【Slotto占位】`

---

## 6.6 Context Menu Integration

### Supported Sites

#### MVP

* Gmail
* LinkedIn
* BizReach
* Green

### Context Action

Right click selected text:

"Add Interview Schedule"

### Parsing Targets

* Date
* Time
* Time range
* Timezone

---

## 6.7 Upcoming Event Reminders

### Requirements

* Upcoming timed events trigger a desktop system notification.
* The default reminder time is 30 minutes before the event.
* Users can disable reminders or choose 5, 10, 15, 30, or 60 minutes in Settings.
* Settings include a test button that triggers a sample reminder after 10 seconds.
* On supported content-script sites, a pixel character mascot appears in the upper-right corner with a localized speech bubble.
* Reminder text and controls support Japanese, English, and Chinese.
* Clicking a system notification opens the meeting URL when available, otherwise the Google Calendar event.
* All-day events do not trigger these timed reminders.

---

# 7. UI/UX Design

## Default Popup Experience

The extension popup uses a two-area layout:

* A left vertical navigation rail for switching pages, similar to icon tabs.
* A main content area that shows the selected page.

The default selected page opens to a Google Calendar-style monthly calendar view.

### Left Navigation Rail

The left navigation rail is always visible inside the popup.

Requirements:

* Navigation items are stacked vertically.
* Each item uses a familiar icon as its primary visual label.
* The active page is visually highlighted.
* Icons should have accessible labels and hover tooltips.
* The first navigation item is **Settings**, represented by the common gear/settings icon.
* Additional navigation items can be added later for calendar, pending slots, generated replies, and history.

Initial navigation order:

1. Settings - gear icon
2. Calendar - calendar/month icon
3. Availability - clock or time-slot icon

### Calendar View Requirements

* Users can choose calendar display mode from Settings: Day, Week, or Month.
* Users can choose calendar display size from Settings: Compact, Default, or Large.
* The selected display mode is persisted locally and reused when the popup opens.
* The selected display size is persisted locally and reused when the popup opens.
* Month view is the default display mode for the MVP unless the user changes it.
* The current date range is shown by default.
* Users can navigate to previous and next months.
* Today's date is visually distinguished.
* Busy calendar events, pending interview slots, and confirmed interviews are visible on calendar views.
* Month view uses compact visual summaries instead of listing event titles.
* Pending slots and confirmed interviews must use visually different treatments.
* Selecting a day opens or focuses the scheduling controls for that date.
* The month view remains useful before full Google Calendar write integration is complete by showing locally stored pending and confirmed interview data.

### Manual Time Slot Selection

Calendar page includes a "Select time slots" action.

Requirements:

* Clicking "Select time slots" switches the calendar to week view.
* User can click multiple one-hour time slots.
* Each selectable slot starts on the hour or half hour.
* Selected slots are highlighted on the calendar.
* User can cancel selection and return to normal calendar browsing.
* User can confirm selection.
* Confirming selection opens the Availability page with generated text already populated from selected slots.
* Language switching on the Availability page updates the generated text without losing the manually selected slots.
* The selected slots can be written directly as Google Calendar placeholder events.

### Calendar Event Details

Clicking calendar content shows schedule details below the calendar.

Requirements:

* In month view, clicking a day selects that day and displays the first event for that day when one exists.
* In week and day views, clicking a specific event displays that event.
* The currently selected event is visually highlighted on the calendar.
* The details panel includes previous/next controls for moving through events in chronological order.
* Switching with previous/next updates both the details panel and the highlighted calendar event.
* The details panel appears below the calendar instead of replacing the calendar.
* The details panel should remain visible until another day/event is selected.
* The details panel includes as much provider data as available:

  * Title
  * Start/end time
  * Recurring status and recurrence rule
  * Description/details
  * Meeting link
  * Calendar event link
  * Location
  * Organizer
  * Attendees and response status
  * Provider/status metadata

* Missing provider fields should render as empty/none states rather than breaking the panel.
* Location is displayed as its own field and is clickable when present.
* Clicking a location opens a map/search destination.
* Meeting URL is displayed as its own field and is clickable when present.

### Month View Event Summary

Month view should stay visually compact.

Requirements:

* Day cells do not show individual event titles.
* Each day shows colored status blocks with numeric counts.
* Example: a colored block with `+3` means three events or occupied slots of that status on that day.
* Counts are grouped by status/type:

  * Busy calendar events
  * Pending interview slots
  * Confirmed interviews
  * Generated candidate slots, when previewed

* Each status/type uses a consistent color.
* MVP colors are based on status/type, not urgency.
* If a day has multiple statuses, show multiple compact blocks or a stacked summary.
* Clicking a day opens a detailed day view or side panel where full event titles and times are shown.
* Week and day views may show full event titles and time blocks because they have enough space.
* Urgency-based color classification is deferred to Phase 2.

### No Connected Calendar State

When the user opens the extension and no calendar account has been connected:

* The calendar view still renders in the selected Day / Week / Month mode.
* A floating call-to-action appears above the calendar surface.
* Primary button label: "Connect Calendar".
* The prompt explains that connecting a calendar is required to read busy slots and prevent double-booking.
* The prompt should not permanently block the UI; users can still inspect settings.

Clicking "Connect Calendar" starts the calendar connection flow:

1. User clicks "Connect Calendar".
2. User chooses Google Calendar as the first MVP provider.
3. Extension starts Google OAuth.
4. User can continue with the current Chrome signed-in Google account when available.
5. User can also choose "Use another account" in the Google account chooser.
6. After authorization, the extension stores the connected account metadata and fetches calendar data.
7. The floating prompt disappears once at least one calendar account is connected.

### Settings Page Requirements

Settings is the first item in the left navigation rail.

Settings includes:

* Calendar display mode selector: Day / Week / Month.
* Calendar display size selector: Compact / Default / Large.
* Connected calendar accounts and sources: multiple Google Calendar accounts / Outlook Calendar.
* Connected calendar section includes a visible primary button for "Add another Google account".
* Connected calendar section lists all linked accounts.
* Each linked account can be disconnected at any time.
* Disconnecting an account removes its synced metadata, local authorization state, and cached events for that account.
* Settings includes an action to clear local calendar cache and per-device authorization state without deleting synced account metadata.
* Scheduling rules and preference controls.
* Output language selector.
* Pending slot expiration settings.
* Changing output language also localizes the extension UI.

### Internationalization

The extension UI supports Japanese, English, and Chinese.

Requirements:

* Settings language selector controls generated availability text and in-app UI labels.
* Calendar library controls should localize with the selected language when supported.
* Core navigation, settings, connection, availability, and event detail labels must be translated.
* Provider-supplied event content, such as titles and descriptions, is displayed in the original provider language.

### Floating Operation Panels

Future operation pages or detail panels can float above the calendar instead of replacing or hiding the calendar view.

Requirements:

* Floating operation panels should not automatically hide the calendar underneath.
* Each floating panel includes a clear hide/collapse button.
* Hiding a panel returns focus to the calendar without changing the selected date or view.
* Floating panels should avoid covering the left navigation rail.

### Visual Model

The calendar views should feel familiar to Google Calendar users:

* Seven-column week grid
* Month title and previous/next controls
* Compact color/count summaries inside month day cells
* Clear distinction between regular busy time, pending interview slots, and confirmed interview events
* Day and week views use time columns with event blocks when implemented

---

## Extension Popup Layout

### Section 1 - Left Navigation

Vertical icon-tab navigation:

* Settings icon
* Calendar icon
* Availability icon

---

### Section 2 - Calendar View

Default main content screen:

* Google Calendar-style Day / Week / Month calendar
* Previous / next date range controls
* Today indicator
* Month view color/count summaries for busy, pending, confirmed, and generated slots
* Day/week event blocks with titles and times
* Display mode follows the Settings selection

---

### Section 3 - Settings Page

Shown when the Settings icon tab is selected.

Controls:

* Calendar view mode: Day / Week / Month
* Calendar display size: Compact / Default / Large
* Connected calendars:

  ☑ Google Calendar
  ☑ Outlook Calendar
  Connected account list with add/disconnect actions

* Rules:

  ☑ Avoid weekends
  ☑ Avoid before 10:00
  ☑ Avoid work hours
  ☑ Add 30min buffer
  ☑ Avoid pending slots

* Language:

  ○ Japanese
  ○ English
  ○ Chinese

### Section 4 - Actions

[Generate Availability]

---

### Section 5 - Results

Generated candidate slots displayed with:

* Copy button
* Mark as Pending button
* Insert into Gmail button

---

# 8. Technical Architecture

## Frontend

### Stack

* React
* TypeScript
* TailwindCSS
* Zustand

### Extension Framework

* Plasmo

### Calendar UI Implementation

The product should not depend on embedding the actual Google Calendar web UI inside the extension popup.

Technical decision:

* Use Google Calendar API for calendar data.
* Implement the extension calendar UI as a native extension view.
* Use a calendar UI library instead of building the day/week/month grid entirely from scratch.
* Preferred library: FullCalendar with day grid and time grid views.
* The extension should visually resemble familiar Google Calendar day, week, and month patterns, but it should not try to reuse Google Calendar's internal frontend.

Rationale:

* Google Calendar provides APIs for data access, not a reusable embeddable application shell for authenticated personal calendars.
* Embedding the Google Calendar website in an extension popup is brittle and not appropriate for the required scheduling workflow.
* A native extension calendar view gives full control over pending slots, tentative states, generated availability, and future web app reuse.
* FullCalendar covers the generic calendar rendering surface, while product-specific states such as pending slots, generated availability, and interview status remain owned by the app.

### Calendar Account Authentication

Google Calendar connection uses Chrome extension identity and Google OAuth instead of an embedded login page.

Phase 1 uses a no-backend identity model:

1. Primary Chrome account: the first/current Chrome profile account is treated as the storage owner.
2. Calendar provider accounts: one or more Google/Outlook accounts authorized to provide calendar data.

Example:

* User opens the extension in Chrome profile account A.
* Account A is used as the sync/storage account through Chrome Sync.
* User connects Google Calendar accounts B and C from that A profile.
* Account metadata, settings, pending slots, and confirmed interview metadata sync through account A.
* On a different device, opening Chrome profile account A restores the B/C connected account list.
* B/C calendar accounts must be reconnected once per new device/profile before live calendar events can be read there.

### Primary Storage Account UX

Settings shows a Storage Account section.

Requirements:

* Show the current Chrome primary account when available.
* Show the sync owner account used for Phase 1 storage.
* If no Chrome primary account is available, show a sign-in required state.
* If a synced calendar account is present but not authorized on this device, show "Reconnect required".
* Clearly explain that settings and connected calendar metadata sync through the primary Chrome account.

Requirements:

* Add the Chrome extension `identity` permission when Google account connection is implemented.
* Use Google OAuth scopes required for reading busy/calendar events and creating interview events.
* On extension open, silently attempt to refresh the primary Chrome account's Google Calendar events when authorization already exists.
* If primary account authorization is missing, keep the calendar visible and show the connect/reconnect CTA.
* Clicking "Use current Chrome account" starts interactive authorization for the primary account calendar.
* After authorization, load the primary account's Google Calendar events into the calendar UI and local cache.
* Support a silent/current-account attempt when appropriate.
* Support an interactive Google OAuth flow so users can choose another Google account.
* Settings supports adding another Google Calendar account.
* Settings labels this action as "Add another Google account".
* Adding another account opens a Google account chooser and asks for Calendar authorization.
* After authorization, the added account's primary calendar events are merged with existing calendar events.
* Adding another account must not replace the primary account calendar events.
* Allow one primary Chrome storage account to connect multiple Google Calendar accounts.
* When the extension opens, read synced connected account metadata from `chrome.storage.sync`.
* If a synced connected account exists but has no valid local authorization on the current device, show it as "Reconnect required".
* After reconnecting on the current device, aggregate availability across all locally authorized connected accounts.
* Store only necessary account metadata in synced storage.
* Store short-lived/local authorization state only on the current device/profile.
* Allow users to disconnect individual calendar accounts from Settings.
* Keep synced data small enough for Chrome Sync quotas.

### Phase 1 No-Backend Sync

Phase 1 does not require an application backend.

Storage split:

* `chrome.storage.sync`: user preferences, connected account metadata, pending slots, confirmed interview metadata, and lightweight scheduling state.
* `chrome.storage.local`: per-device authorization/cache state, temporary calendar event cache, and data that should not be assumed to exist on another device.

Reconnect behavior:

* A connected calendar account synced from another device appears in Settings and calendar aggregation.
* Until the user reconnects it on the current device, it is marked as unavailable for live event reads.
* The UI should provide a one-click reconnect action for each unavailable account.
* After reconnect, the account participates in availability aggregation on that device.

Known limitation:

* Without a backend, the extension cannot securely and reliably make B/C calendar authorizations available on every new device without reauthorization.
* This is acceptable for Phase 1.

### Future Backend Requirement

A backend becomes necessary if the product later requires any of the following:

* Open the plugin from any Chrome account, not only the primary Chrome Sync account A, and see the same connected calendar set.
* Avoid reconnecting B/C calendar accounts on each new device.
* Store provider refresh tokens centrally.
* Provide background calendar sync when the extension is not open.
* Support a web app with the same account state outside Chrome Sync.

Future backend responsibilities:

* Product user account/auth session
* Connected provider account registry
* Secure OAuth token handling for Google/Outlook accounts
* Aggregated calendar availability API
* Cloud storage for pending slots, confirmed interview metadata, preferences, and account mappings
* Optional background refresh/cache of calendar busy data

---

## Backend

### MVP Approach

No backend for Phase 1.

Use Chrome Sync as the source of truth for lightweight cross-device state under the same primary Chrome account.

Use local extension storage for per-device authorization and cache data.

For the Web App MVP, use a separate Google Web OAuth client without a backend. The Web App does not share Chrome Extension tokens, so each browser/device must log in again, and additional Google Calendar accounts must be reconnected inside the Web App.

### Future Approach

Introduce a backend when cross-Chrome-account login, no-reconnect multi-device calendar access, or web app support becomes required.

Potential stack:

* Firebase

Phase 2 should use Firebase DB to store Slotto user records, connected calendar account mappings, and cross-device account state. Token storage and refresh strategy should be designed separately before production release.

---

## APIs

### Google

* Google Calendar API
* Google OAuth

### Microsoft

* Microsoft Graph API

---

## Storage

### Local

* chrome.storage.local
* IndexedDB

### Cloud (Future)

* User settings sync
* Pending slots sync
* Cross-device sync

---

# 9. Data Models

## Calendar Event

```ts
interface CalendarEvent {
  id: string;
  provider: 'google' | 'outlook';
  title: string;
  start: string;
  end: string;
  status: 'confirmed' | 'pending';
  company?: string;
}
```

---

## Scheduling Rules

```ts
interface SchedulingRules {
  avoidWeekends: boolean;
  avoidBeforeHour?: number;
  avoidAfterHour?: number;
  avoidWorkHours: boolean;
  addBufferMinutes?: number;
  avoidPendingSlots: boolean;
  maxInterviewsPerDay?: number;
}
```

---

# 10. Future Roadmap

## Phase 2

### AI Email Parsing

Automatically detect:

* recruiter requests
* candidate time suggestions
* confirmation emails

### Smart Recommendations

Example:

"Recommended because it minimizes schedule fragmentation."

### Urgency-Based Calendar Coloring

Enhance calendar summaries so color blocks can reflect urgency in addition to status/type.

Potential urgency signals:

* Interview is happening soon
* Recruiter requested a quick reply
* Pending slot is close to expiration
* High-priority company or late-stage interview

MVP should keep color semantics status-based only, then introduce urgency rules once scheduling and account connection are stable.

---

## Phase 3

### Interview Pipeline Tracking

Track:

* HR interview
* Technical interview
* Final interview
* Offer

---

## Phase 4

### Mobile Companion App

Potential features:

* Push notifications
* Quick confirmation
* Calendar sync

---

# 11. Key Differentiators

## Existing Tools

Calendly / Google Calendar focus on generic scheduling.

## This Product

Focused specifically on:

* Job interview workflows
* Pending interview management
* Multilingual recruiter communication
* Cross-calendar optimization
* Professional scheduling preferences

---

# 12. Success Metrics

## MVP Metrics

### Usage

* Weekly active users
* Generated availability count
* Pending slot count

### Efficiency

* Time saved per scheduling interaction
* Reduced double-booking incidents

### Retention

* Daily active usage during job search
* Repeated scheduling usage

---

# 13. Open Questions

* Should pending slots sync across devices?
* Should tentative events exist only locally?
* Should recruiter/company history be stored?
* How should timezone conversion UX work?
* Should AI-generated email replies be editable templates or freeform?
* How much automation should happen automatically vs manually?

---

# 14. Suggested MVP Development Order

## Phase 1

* Extension shell
* Google Calendar-style month view as default popup screen
* Calendar integration
* Availability generation

## Phase 2

* Rule engine
* Pending slot management
* Multilingual formatting

## Phase 3

* Context menu integration
* Calendar event creation
* Pending replacement flow

## Phase 4

* UI polish
* Error handling
* Edge cases
* Beta testing
