/**
 * Shared service-layer shapes.
 *
 * These JSDoc typedefs keep the MVP dependency-free while preserving a clean
 * contract that can be moved to TypeScript when the web app shell arrives.
 *
 * @typedef {'google' | 'outlook' | 'local'} CalendarProvider
 * @typedef {'confirmed' | 'pending'} InterviewStatus
 * @typedef {'ja' | 'en' | 'zh'} OutputLanguage
 *
 * @typedef {Object} CalendarEvent
 * @property {string} id
 * @property {CalendarProvider} provider
 * @property {string} title
 * @property {string} start ISO datetime
 * @property {string} end ISO datetime
 * @property {InterviewStatus} status
 * @property {string=} company
 *
 * @typedef {Object} SchedulingRules
 * @property {boolean} avoidWeekends
 * @property {number=} avoidBeforeHour
 * @property {number=} avoidAfterHour
 * @property {boolean} avoidWorkHours
 * @property {number=} addBufferMinutes
 * @property {boolean} avoidPendingSlots
 * @property {number=} maxInterviewsPerDay
 *
 * @typedef {Object} UserSettings
 * @property {{ google: boolean, outlook: boolean }} calendars
 * @property {SchedulingRules} rules
 * @property {OutputLanguage} language
 * @property {number} slotDurationMinutes
 * @property {number} pendingExpirationHours
 *
 * @typedef {Object} CandidateSlot
 * @property {string} id
 * @property {string} start ISO datetime
 * @property {string} end ISO datetime
 */

export const noopTypes = {};
