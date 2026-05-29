// Chrome extension popup UI for calendar review, availability generation,
// placeholder reservations, and Google Calendar event editing.
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import FullCalendar from '@fullcalendar/react';
import jaLocale from '@fullcalendar/core/locales/ja';
import zhCnLocale from '@fullcalendar/core/locales/zh-cn';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { CalendarDays, Clock3, Copy, Plus, RefreshCw, Settings, Unplug } from 'lucide-react';
import { clearLocalCalendarData, clearSelectedDraft, getAppState, getCalendarAuthorization, removeCalendarAuthorization, saveBusyEvents, saveCalendarAuthorization, saveConnectedAccounts, savePendingEvents, saveSettings } from '../adapters/chromeStorage.js';
import { confirmPrimaryPlaceholderEvent, connectAdditionalGoogleCalendar, createPrimaryCalendarEvent, createPrimaryPlaceholderEvents, deletePrimaryPlaceholderBatch, fetchPrimaryGoogleCalendarEvents, updateGoogleCalendarEvent, updatePrimaryPlaceholderBatch } from '../adapters/googleCalendar.js';
import { formatSlot, formatSlots } from '../services/formatter.js';
import { createTranslator } from '../services/i18n.js';
import { createInterviewEvent, generateAvailability } from '../services/scheduler.js';
import './popup.css';

const calendarViewMap = {
  day: 'timeGridDay',
  week: 'timeGridWeek',
  month: 'dayGridMonth'
};

const statusLabels = {
  busy: 'Busy',
  pending: 'Pending',
  confirmed: 'Confirmed',
  generated: 'Suggested'
};

const calendarLocales = {
  ja: jaLocale,
  zh: zhCnLocale
};

function App() {
  const [appState, setAppState] = useState(null);
  const [activePage, setActivePage] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentSlots, setCurrentSlots] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [showConnectOptions, setShowConnectOptions] = useState(false);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [calendarRefreshAttempted, setCalendarRefreshAttempted] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [manualSelectionMode, setManualSelectionMode] = useState(false);
  const [manualSlotsActive, setManualSlotsActive] = useState(false);
  const [eventDraft, setEventDraft] = useState(null);
  const [placeholderDraft, setPlaceholderDraft] = useState(null);

  useEffect(() => {
    getAppState().then((state) => {
      const slots = buildGeneratedSlots(state);
      setCurrentSlots(slots);
      setAppState(state);
    });
  }, []);

  useEffect(() => {
    if (!appState?.primaryAccount || calendarRefreshAttempted) {
      return;
    }

    setCalendarRefreshAttempted(true);
    refreshPrimaryCalendar({ interactive: false });
  }, [appState, calendarRefreshAttempted]);

  const calendarEvents = useMemo(() => {
    if (!appState) {
      return [];
    }
    return buildCalendarEvents(appState, currentSlots);
  }, [appState, currentSlots]);

  const t = useMemo(() => createTranslator(appState?.settings.language), [appState?.settings.language]);
  const orderedEventSources = useMemo(() => getOrderedEventSources(calendarEvents), [calendarEvents]);
  const daySummaries = useMemo(() => summarizeEventsByDay(calendarEvents), [calendarEvents]);
  const resultText = appState ? formatAvailabilityResults(currentSlots, appState.settings.outputLanguages ?? [appState.settings.language]) : '';
  const hasConnectedCalendar = Boolean(appState?.connectedAccounts?.length);

  if (!appState) {
    return <div className="loading">Loading scheduler...</div>;
  }

  async function updateSettings(nextSettings) {
    const nextState = { ...appState, settings: nextSettings };
    const nextSlots = manualSlotsActive ? currentSlots : buildGeneratedSlots(nextState);
    setAppState(nextState);
    setCurrentSlots(nextSlots);
    await saveSettings(nextSettings);
  }

  async function updateAvailabilitySettings(patch) {
    await updateSettings({ ...appState.settings, ...patch });
  }

  async function connectGoogle(mode) {
    setShowConnectOptions(false);

    const canUseChromeIdentity = typeof chrome !== 'undefined' && chrome.identity;
    if (!canUseChromeIdentity) {
      setStatusMessage(t('oauthUnavailable'));
      return;
    }

    if (mode === 'current') {
      await refreshPrimaryCalendar({ interactive: true });
      return;
    }

    await connectAdditionalCalendar();
  }

  async function refreshPrimaryCalendar({ interactive }) {
    if (isConnectingCalendar) {
      return;
    }

    if (!appState?.primaryAccount) {
      setStatusMessage(t('signIntoChrome'));
      return;
    }

    setIsConnectingCalendar(true);
    setStatusMessage(interactive ? t('connectingPrimary') : t('refreshingPrimary'));
    try {
      const accountId = `google:${appState.primaryAccount.id}`;
      const result = await fetchPrimaryGoogleCalendarEvents({ interactive, accountId });

      if (!result.ok) {
        if (interactive || result.reason !== 'authorization-required') {
          setStatusMessage(result.message);
        }
        return;
      }

      const connectedAccount = {
        id: accountId,
        provider: 'google',
        email: appState.primaryAccount.email,
        calendarId: 'primary',
        connectedAt: new Date().toISOString()
      };
      const nextConnectedAccounts = upsertAccount(appState.connectedAccounts, connectedAccount);
      const eventsWithAccount = result.events.map((event) => ({
        ...event,
        sourceAccountEmail: appState.primaryAccount.email
      }));
      const nextBusyEvents = replaceEventsForAccount(appState.busyEvents, accountId, eventsWithAccount);
      const nextState = {
        ...appState,
        busyEvents: nextBusyEvents,
        connectedAccounts: nextConnectedAccounts.map((account) => (
          account.id === accountId ? { ...account, authorizationStatus: 'authorized' } : account
        ))
      };

      setAppState(nextState);
      setCurrentSlots(buildGeneratedSlots(nextState));
      setSelectedEvent((current) => current ? findEventById(buildCalendarEvents(nextState, buildGeneratedSlots(nextState)), current.id) : null);
      await Promise.all([
        saveBusyEvents(nextBusyEvents),
        saveCalendarAuthorization(accountId),
        saveConnectedAccounts(nextConnectedAccounts)
      ]);
      setStatusMessage(t('loadedEvents', { count: result.events.length, email: appState.primaryAccount.email }));
    } finally {
      setIsConnectingCalendar(false);
    }
  }

  async function connectAdditionalCalendar() {
    if (isConnectingCalendar) {
      return;
    }

    setIsConnectingCalendar(true);
    setStatusMessage(t('connectingAnother'));
    try {
      const result = await connectAdditionalGoogleCalendar();
      if (!result.ok) {
        setStatusMessage(result.message);
        return;
      }

      const nextConnectedAccounts = upsertAccount(appState.connectedAccounts, result.account);
      const nextBusyEvents = replaceEventsForAccount(appState.busyEvents, result.account.id, result.events);
      const nextState = {
        ...appState,
        busyEvents: nextBusyEvents,
        connectedAccounts: nextConnectedAccounts.map((account) => (
          account.id === result.account.id ? { ...account, authorizationStatus: 'authorized' } : account
        ))
      };

      setAppState(nextState);
      setCurrentSlots(buildGeneratedSlots(nextState));
      setSelectedEvent((current) => current ? findEventById(buildCalendarEvents(nextState, buildGeneratedSlots(nextState)), current.id) : null);
      await Promise.all([
        saveBusyEvents(nextBusyEvents),
        saveCalendarAuthorization(result.account.id, { accessToken: result.accessToken }),
        saveConnectedAccounts(nextConnectedAccounts)
      ]);
      setStatusMessage(t('loadedEvents', { count: result.events.length, email: result.account.email }));
    } finally {
      setIsConnectingCalendar(false);
    }
  }

  function openCreatePlaceholderDraft() {
    if (!currentSlots.length) {
      return;
    }
    setPlaceholderDraft({
      mode: 'create',
      title: appState.settings.placeholderEventTitle || '面接',
      description: ''
    });
  }

  function openEditPlaceholderDraft(event) {
    setPlaceholderDraft({
      mode: 'edit',
      eventId: event.id,
      title: event.title || '面接',
      description: event.details?.description || ''
    });
  }

  async function savePlaceholderDraft(draft) {
    if (draft.mode === 'edit') {
      await updatePlaceholderBatch(draft);
      return;
    }
    await createPlaceholderReservations(draft);
  }

  async function createPlaceholderReservations(draft) {
    if (!appState.primaryAccount) {
      setStatusMessage(t('signIntoChrome'));
      return;
    }

    const accountId = `google:${appState.primaryAccount.id}`;
    const result = await createPrimaryPlaceholderEvents({
      slots: currentSlots,
      title: draft.title,
      description: draft.description,
      accountId,
      accountEmail: appState.primaryAccount.email
    });
    if (!result.ok) {
      setStatusMessage(result.message);
      return;
    }

    const nextBusyEvents = [
      ...appState.busyEvents,
      ...result.events
    ];
    const nextState = {
      ...appState,
      busyEvents: nextBusyEvents
    };
    setAppState(nextState);
    setManualSlotsActive(true);
    setManualSelectionMode(false);
    setPlaceholderDraft(null);
    await saveBusyEvents(nextBusyEvents);
    setStatusMessage(t('createdPlaceholders', { count: result.events.length }));
  }

  async function updatePlaceholderBatch(draft) {
    const event = appState.busyEvents.find((item) => item.id === draft.eventId);
    if (!event) {
      setStatusMessage(t('placeholderNotFound'));
      return;
    }

    const batchEvents = getPlaceholderBatchEvents(appState.busyEvents, event);
    const result = await updatePrimaryPlaceholderBatch({
      events: batchEvents,
      title: draft.title,
      description: draft.description
    });
    if (!result.ok) {
      setStatusMessage(result.message);
      return;
    }

    const updatedById = new Map(result.events.map((updatedEvent) => [updatedEvent.id, updatedEvent]));
    const nextBusyEvents = appState.busyEvents.map((item) => updatedById.get(item.id) ?? item);
    const nextState = {
      ...appState,
      busyEvents: nextBusyEvents
    };
    const nextSelected = selectedEvent ? updatedById.get(selectedEvent.id) ?? selectedEvent : null;
    setAppState(nextState);
    setCurrentSlots(buildGeneratedSlots(nextState));
    setSelectedEvent(nextSelected);
    setPlaceholderDraft(null);
    await saveBusyEvents(nextBusyEvents);
    setStatusMessage(t('updatedPlaceholders', { count: result.events.length }));
  }

  function openEventDraft(date = selectedDate) {
    const slot = makeOneHourSlot(date);
    setEventDraft({
      mode: 'create',
      title: '',
      start: slot.start,
      end: slot.end,
      location: '',
      description: '',
      meetingUrl: ''
    });
  }

function openEditEventDraft(event) {
    const meetingLink = getMeetingLinks(event.details ?? {})[0]?.uri ?? '';
    setEventDraft({
      mode: 'edit',
      eventId: event.id,
      googleEventId: event.details?.googleEventId || '',
      sourceAccountId: event.sourceAccountId,
      sourceAccountEmail: event.sourceAccountEmail,
      title: event.title || '',
      start: event.start,
      end: event.end,
      location: event.details?.location || '',
      description: stripHtml(event.details?.description || ''),
      meetingUrl: meetingLink
    });
  }

  async function savePrimaryCalendarEvent(nextEvent) {
    if (nextEvent.mode === 'edit') {
      await updateExistingCalendarEvent(nextEvent);
      return;
    }

    if (!appState.primaryAccount) {
      setStatusMessage(t('signIntoChrome'));
      return;
    }

    const accountId = `google:${appState.primaryAccount.id}`;
    const result = await createPrimaryCalendarEvent({
      event: nextEvent,
      accountId,
      accountEmail: appState.primaryAccount.email
    });
    if (!result.ok) {
      setStatusMessage(result.message);
      return;
    }

    const nextBusyEvents = [...appState.busyEvents, result.event];
    const nextState = {
      ...appState,
      busyEvents: nextBusyEvents
    };
    setAppState(nextState);
    setCurrentSlots(buildGeneratedSlots(nextState));
    setSelectedEvent(result.event);
    setEventDraft(null);
    await saveBusyEvents(nextBusyEvents);
    setStatusMessage(t('createdEvent'));
  }

  async function updateExistingCalendarEvent(nextEvent) {
    const sourceAccountId = nextEvent.sourceAccountId;
    const sourceAccountEmail = nextEvent.sourceAccountEmail;
    const primaryAccountId = appState.primaryAccount ? `google:${appState.primaryAccount.id}` : '';
    const authorization = sourceAccountId === primaryAccountId
      ? null
      : await getCalendarAuthorization(sourceAccountId);

    if (sourceAccountId !== primaryAccountId && !authorization?.accessToken) {
      setStatusMessage(t('reconnectToEditAccount'));
      return;
    }

    const result = await updateGoogleCalendarEvent({
      event: nextEvent,
      accountId: sourceAccountId,
      accountEmail: sourceAccountEmail,
      accessToken: authorization?.accessToken
    });
    if (!result.ok) {
      setStatusMessage(result.message);
      return;
    }

    const nextBusyEvents = appState.busyEvents.map((event) => event.id === nextEvent.eventId ? result.event : event);
    const nextState = {
      ...appState,
      busyEvents: nextBusyEvents
    };
    setAppState(nextState);
    setCurrentSlots(buildGeneratedSlots(nextState));
    setSelectedEvent(result.event);
    setEventDraft(null);
    await saveBusyEvents(nextBusyEvents);
    setStatusMessage(t('updatedEvent'));
  }

  async function startManualTimeSelection() {
    const nextSettings = { ...appState.settings, calendarView: 'week' };
    const nextState = { ...appState, settings: nextSettings };
    setAppState(nextState);
    setCurrentSlots([]);
    setSelectedEvent(null);
    setManualSelectionMode(true);
    setManualSlotsActive(true);
    await saveSettings(nextSettings);
  }

  function cancelManualTimeSelection() {
    setManualSelectionMode(false);
    setManualSlotsActive(false);
    setCurrentSlots(buildGeneratedSlots(appState));
  }

  function confirmManualTimeSelection() {
    setManualSelectionMode(false);
    setManualSlotsActive(true);
    setActivePage('availability');
  }

  function toggleManualTimeSlot(date) {
    const slot = makeOneHourSlot(date);
    const hasConflict = calendarEvents.some((event) => {
      if (event.extendedProps.kind === 'generated') {
        return false;
      }
      return rangesOverlap(new Date(event.start), new Date(event.end), new Date(slot.start), new Date(slot.end));
    });
    if (hasConflict) {
      setStatusMessage(t('slotOverlaps'));
      return;
    }

    setCurrentSlots((slots) => (
      slots.some((item) => item.id === slot.id)
        ? slots.filter((item) => item.id !== slot.id)
        : [...slots, slot].sort((a, b) => new Date(a.start) - new Date(b.start))
    ));
  }

  async function confirmPlaceholderSchedule(event) {
    const siblingEvents = getPlaceholderBatchEvents(appState.busyEvents, event);
    const result = await confirmPrimaryPlaceholderEvent({ event, siblingEvents });
    if (!result.ok) {
      setStatusMessage(result.message);
      return;
    }

    const nextBusyEvents = appState.busyEvents
      .filter((item) => !result.deletedEventIds.includes(item.id))
      .map((item) => item.id === event.id ? result.event : item);
    const nextState = {
      ...appState,
      busyEvents: nextBusyEvents
    };
    setAppState(nextState);
    setCurrentSlots(buildGeneratedSlots(nextState));
    setSelectedEvent(result.event);
    await saveBusyEvents(nextBusyEvents);
    setStatusMessage(t('confirmedPlaceholder', { count: result.deletedEventIds.length }));
  }

  async function deletePlaceholderBatch(event) {
    const batchEvents = getPlaceholderBatchEvents(appState.busyEvents, event);
    const result = await deletePrimaryPlaceholderBatch({ events: batchEvents.length ? batchEvents : [event] });
    if (!result.ok) {
      setStatusMessage(result.message);
      return;
    }

    const nextBusyEvents = appState.busyEvents.filter((item) => !result.deletedEventIds.includes(item.id));
    const nextState = {
      ...appState,
      busyEvents: nextBusyEvents
    };
    setAppState(nextState);
    setCurrentSlots(buildGeneratedSlots(nextState));
    setSelectedEvent(null);
    await saveBusyEvents(nextBusyEvents);
    setStatusMessage(t('deletedPlaceholders', { count: result.deletedEventIds.length }));
  }

  async function disconnectCalendarAccount(accountId) {
    const account = appState.connectedAccounts.find((item) => item.id === accountId);
    const nextConnectedAccounts = appState.connectedAccounts.filter((item) => item.id !== accountId);
    const nextBusyEvents = appState.busyEvents.filter((event) => event.sourceAccountId !== accountId);
    const nextState = {
      ...appState,
      connectedAccounts: nextConnectedAccounts,
      busyEvents: nextBusyEvents
    };

    setAppState(nextState);
    setCurrentSlots(buildGeneratedSlots(nextState));
    setSelectedEvent((current) => current?.sourceAccountId === accountId ? null : current);
    await Promise.all([
      saveConnectedAccounts(nextConnectedAccounts),
      saveBusyEvents(nextBusyEvents),
      removeCalendarAuthorization(accountId)
    ]);
    setStatusMessage(t('disconnectedAccount', { email: account?.email ?? accountId }));
  }

  async function clearLocalData() {
    const nextState = {
      ...appState,
      busyEvents: [],
      selectedDraft: null,
      connectedAccounts: appState.connectedAccounts.map((account) => ({
        ...account,
        authorizationStatus: 'reconnect-required'
      }))
    };

    setAppState(nextState);
    setCurrentSlots(buildGeneratedSlots(nextState));
    setSelectedEvent(null);
    await clearLocalCalendarData();
    setStatusMessage(t('localDataCleared'));
  }

  async function copyResults() {
    await navigator.clipboard.writeText(resultText);
    setStatusMessage(t('copiedAvailability'));
  }

  async function insertResults() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = tab?.id
      ? await chrome.tabs.sendMessage(tab.id, { type: 'INSERT_TEXT', text: resultText }).catch(() => null)
      : null;
    setStatusMessage(response?.ok ? t('inserted') : t('focusEditable'));
  }

  async function saveCapturedDraft(formData) {
    const parsed = appState.selectedDraft?.parsed;
    if (!parsed) {
      setStatusMessage(t('noParsedSchedule'));
      return;
    }

    const event = createInterviewEvent({
      slot: parsed.slot,
      company: formData.get('company'),
      title: formData.get('title'),
      status: formData.get('status')
    });
    const nextPending = [...appState.pendingEvents, event];
    const nextState = { ...appState, pendingEvents: nextPending, selectedDraft: null };
    setAppState(nextState);
    setCurrentSlots(buildGeneratedSlots(nextState));
    await savePendingEvents(nextPending);
    await clearSelectedDraft();
    setStatusMessage(t('savedSchedule', { status: t(event.status) }));
  }

  return (
    <main className={`appShell density-${appState.settings.calendarDensity ?? 'comfortable'}`}>
      <Navigation activePage={activePage} onChange={setActivePage} t={t} />
      <section className="mainPane">
        {activePage === 'settings' && (
          <SettingsPage
            settings={appState.settings}
            connectedAccounts={appState.connectedAccounts}
            primaryAccount={appState.primaryAccount}
            storageOwnerAccount={appState.storageOwnerAccount}
            syncStatus={appState.syncStatus}
            onChange={updateSettings}
            onAddAnother={() => connectGoogle('other')}
            onDisconnectAccount={disconnectCalendarAccount}
            onClearLocalData={clearLocalData}
            isConnectingCalendar={isConnectingCalendar}
            t={t}
          />
        )}

        {activePage === 'calendar' && (
          <CalendarPage
            settings={appState.settings}
            events={calendarEvents}
            daySummaries={daySummaries}
            selectedDate={selectedDate}
            hasConnectedCalendar={hasConnectedCalendar}
            showConnectOptions={showConnectOptions}
            onCloseConnect={() => setShowConnectOptions(false)}
            onOpenConnect={() => setShowConnectOptions(true)}
            onConnectGoogle={connectGoogle}
            isConnectingCalendar={isConnectingCalendar}
            onDateSelect={setSelectedDate}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
            orderedEvents={orderedEventSources}
            onConfirmPlaceholder={confirmPlaceholderSchedule}
            onDeletePlaceholder={deletePlaceholderBatch}
            onEditPlaceholder={openEditPlaceholderDraft}
            onEditEvent={openEditEventDraft}
            manualSelectionMode={manualSelectionMode}
            selectedSlotCount={currentSlots.length}
            onCreateEvent={openEventDraft}
            onStartTimeSelection={startManualTimeSelection}
            onCancelTimeSelection={cancelManualTimeSelection}
            onConfirmTimeSelection={confirmManualTimeSelection}
            onToggleTimeSlot={toggleManualTimeSlot}
            t={t}
          />
        )}

        {activePage === 'availability' && (
          <AvailabilityPage
            resultText={resultText}
            currentSlots={currentSlots}
            selectedDraft={appState.selectedDraft}
            language={appState.settings.language}
            settings={appState.settings}
            onChangeSettings={updateAvailabilitySettings}
            onRegenerate={() => {
              const nextSlots = buildGeneratedSlots(appState);
              setManualSlotsActive(false);
              setCurrentSlots(nextSlots);
              setStatusMessage(t('randomGenerated'));
            }}
            onCopy={copyResults}
            onInsert={insertResults}
            onMarkPending={openCreatePlaceholderDraft}
            onSaveDraft={saveCapturedDraft}
            t={t}
          />
        )}

        {eventDraft && (
          <CreateEventDialog
            draft={eventDraft}
            onChange={setEventDraft}
            onClose={() => setEventDraft(null)}
            onSave={savePrimaryCalendarEvent}
            t={t}
          />
        )}

        {placeholderDraft && (
          <PlaceholderDialog
            draft={placeholderDraft}
            onChange={setPlaceholderDraft}
            onClose={() => setPlaceholderDraft(null)}
            onSave={savePlaceholderDraft}
            t={t}
          />
        )}

        {statusMessage && <p className="statusMessage">{statusMessage}</p>}
      </section>
    </main>
  );
}

function Navigation({ activePage, onChange, t }) {
  const items = [
    { id: 'settings', label: t('settings'), icon: Settings },
    { id: 'calendar', label: t('calendar'), icon: CalendarDays },
    { id: 'availability', label: t('availability'), icon: Clock3 }
  ];

  return (
    <nav className="navRail" aria-label="Main navigation">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={`navButton ${activePage === item.id ? 'active' : ''}`}
            title={item.label}
            aria-label={item.label}
            onClick={() => onChange(item.id)}
          >
            <Icon size={20} strokeWidth={2.2} />
          </button>
        );
      })}
    </nav>
  );
}

function CalendarPage({
  settings,
  events,
  daySummaries,
  selectedDate,
  hasConnectedCalendar,
  showConnectOptions,
  onCloseConnect,
  onOpenConnect,
  onConnectGoogle,
  isConnectingCalendar,
  onDateSelect,
  selectedEvent,
  onSelectEvent,
  orderedEvents,
  onConfirmPlaceholder,
  onDeletePlaceholder,
  onEditPlaceholder,
  onEditEvent,
  manualSelectionMode,
  selectedSlotCount,
  onCreateEvent,
  onStartTimeSelection,
  onCancelTimeSelection,
  onConfirmTimeSelection,
  onToggleTimeSlot,
  t
}) {
  const calendarView = calendarViewMap[settings.calendarView] ?? 'dayGridMonth';

  function handleDateClick(arg) {
    onDateSelect(arg.date);
    if (manualSelectionMode) {
      if (!arg.allDay) {
        onToggleTimeSlot(arg.date);
      }
      return;
    }
    if (settings.calendarView !== 'month' && !arg.allDay) {
      onCreateEvent(arg.date);
      return;
    }
    if (settings.calendarView !== 'month') {
      return;
    }
    const firstEvent = findFirstEventOnDate(events, arg.date);
    onSelectEvent(firstEvent);
  }

  function selectAdjacentEvent(direction) {
    const nextEvent = getAdjacentEvent(orderedEvents, selectedEvent, direction);
    if (nextEvent) {
      onSelectEvent(nextEvent);
      onDateSelect(new Date(nextEvent.start));
    }
  }

  return (
    <div className="calendarPage">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">Calendar</p>
          <h1>{t('interviewSchedule')}</h1>
        </div>
        <button className="secondaryButton" onClick={onOpenConnect} disabled={isConnectingCalendar}>
          <Unplug size={15} />
          {isConnectingCalendar ? t('connecting') : t('connect')}
        </button>
        <button className="secondaryButton" onClick={() => onCreateEvent(selectedDate)}>
          <Plus size={15} />
          {t('createEvent')}
        </button>
        {!manualSelectionMode ? (
          <button className="primaryButton" onClick={onStartTimeSelection}>{t('selectTimeSlots')}</button>
        ) : (
          <div className="selectionActions">
            <span className="muted">{t('selectedSlotCount', { count: selectedSlotCount })}</span>
            <button className="secondaryButton" onClick={onCancelTimeSelection}>{t('cancelSelection')}</button>
            <button className="primaryButton" disabled={!selectedSlotCount} onClick={onConfirmTimeSelection}>{t('confirmSelection')}</button>
          </div>
        )}
      </header>

      <div className="calendarSurface">
        {(!hasConnectedCalendar || showConnectOptions) && (
          <ConnectOverlay
            open={showConnectOptions}
            onOpen={onOpenConnect}
            onClose={onCloseConnect}
            onConnectGoogle={onConnectGoogle}
            isConnectingCalendar={isConnectingCalendar}
            t={t}
          />
        )}
        <FullCalendar
          key={`${settings.calendarView}-${settings.calendarDensity}`}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={calendarView}
          initialDate={selectedDate}
          locale={calendarLocales[settings.language] ?? undefined}
          height="100%"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: ''
          }}
          slotDuration="00:30:00"
          snapDuration="00:30:00"
          allDaySlot={false}
          events={events}
          eventClassNames={(arg) => [
            `event-${arg.event.extendedProps.kind}`,
            arg.event.extendedProps.source?.id === selectedEvent?.id ? 'event-selected' : ''
          ].filter(Boolean)}
          eventContent={(arg) => renderEventContent(arg)}
          dayCellContent={(arg) => renderDayCell(arg, daySummaries, t)}
          dateClick={handleDateClick}
          eventClick={(arg) => {
            if (manualSelectionMode && arg.event.extendedProps.kind === 'generated') {
              onToggleTimeSlot(arg.event.start);
              return;
            }
            onSelectEvent(arg.event.extendedProps.source);
          }}
          nowIndicator
        />
      </div>
      <EventDetailsPanel
        event={selectedEvent}
        hasPrevious={Boolean(getAdjacentEvent(orderedEvents, selectedEvent, -1))}
        hasNext={Boolean(getAdjacentEvent(orderedEvents, selectedEvent, 1))}
        onPrevious={() => selectAdjacentEvent(-1)}
        onNext={() => selectAdjacentEvent(1)}
        onConfirmPlaceholder={onConfirmPlaceholder}
        onDeletePlaceholder={onDeletePlaceholder}
        onEditPlaceholder={onEditPlaceholder}
        onEditEvent={onEditEvent}
        t={t}
      />
    </div>
  );
}

function ConnectOverlay({ open, onOpen, onClose, onConnectGoogle, isConnectingCalendar, t }) {
  return (
    <div className="connectOverlay">
      <div>
        <strong>{t('connectTitle')}</strong>
        <p>{t('connectDescription')}</p>
      </div>
      {!open ? (
        <button className="primaryButton" onClick={onOpen} disabled={isConnectingCalendar}>
          {isConnectingCalendar ? t('connecting') : t('connectCalendar')}
        </button>
      ) : (
        <div className="connectChoices">
          <button className="primaryButton" disabled={isConnectingCalendar} onClick={() => onConnectGoogle('current')}>
            {isConnectingCalendar ? t('connecting') : t('useCurrentChromeAccount')}
          </button>
          <button className="secondaryButton" disabled={isConnectingCalendar} onClick={() => onConnectGoogle('other')}>{t('addAnotherGoogleAccount')}</button>
          <button className="ghostButton" disabled={isConnectingCalendar} onClick={onClose}>{t('dismiss')}</button>
        </div>
      )}
    </div>
  );
}

function SettingsPage({ settings, connectedAccounts, primaryAccount, storageOwnerAccount, syncStatus, onChange, onAddAnother, onDisconnectAccount, onClearLocalData, isConnectingCalendar, t }) {
  const update = (patch) => onChange({ ...settings, ...patch });
  const updateRules = (patch) => onChange({ ...settings, rules: { ...settings.rules, ...patch } });

  return (
    <div className="settingsPage">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">{t('settings')}</p>
          <h1>{t('preferences')}</h1>
        </div>
      </header>

      <section className="panel">
        <div className="panelHeader">
          <h2>{t('storageAccount')}</h2>
          <span className={`statusBadge ${syncStatus}`}>{formatSyncStatus(syncStatus, t)}</span>
        </div>
        <div className="accountRows">
          <div>
            <span>{t('currentChromeAccount')}</span>
            <strong>{primaryAccount?.email ?? t('notAvailable')}</strong>
          </div>
          <div>
            <span>{t('syncOwner')}</span>
            <strong>{storageOwnerAccount?.email ?? t('waitingForChromeSignIn')}</strong>
          </div>
        </div>
        <p className="muted">{t('storageAccountHelp')}</p>
      </section>

      <section className="panel">
        <h2>{t('calendarView')}</h2>
        <div className="segmented">
          {['day', 'week', 'month'].map((view) => (
            <button
              key={view}
              className={settings.calendarView === view ? 'selected' : ''}
              onClick={() => update({ calendarView: view })}
            >
              {t(view)}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>{t('displaySize')}</h2>
        <div className="segmented">
          {[
            ['compact', t('compact')],
            ['comfortable', t('default')],
            ['spacious', t('large')]
          ].map(([value, label]) => (
            <button
              key={value}
              className={(settings.calendarDensity ?? 'comfortable') === value ? 'selected' : ''}
              onClick={() => update({ calendarDensity: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <h2>{t('connectedCalendars')}</h2>
        </div>
        {connectedAccounts.length ? (
          connectedAccounts.map((account) => (
            <div key={account.id} className="connectedAccountRow">
              <div>
                <strong>{account.email}</strong>
                <span>{account.provider ?? 'google'}</span>
              </div>
              <div className="accountActions">
                <span className={`statusBadge ${account.authorizationStatus}`}>{formatAccountStatus(account.authorizationStatus, t)}</span>
                <button className="secondaryButton compact" disabled={isConnectingCalendar} onClick={() => onDisconnectAccount(account.id)}>{t('disconnect')}</button>
              </div>
            </div>
          ))
        ) : (
          <p className="muted">{t('noCalendarConnected')}</p>
        )}
        <button className="primaryButton fullWidth" disabled={isConnectingCalendar} onClick={onAddAnother}>
          {isConnectingCalendar ? t('connecting') : t('addAnotherGoogleAccount')}
        </button>
        <button className="secondaryButton fullWidth" disabled={isConnectingCalendar} onClick={onClearLocalData}>
          {t('clearLocalData')}
        </button>
        <label><input type="checkbox" checked={settings.calendars.google} onChange={(event) => update({ calendars: { ...settings.calendars, google: event.target.checked } })} /> {t('googleCalendar')}</label>
        <label><input type="checkbox" checked={settings.calendars.outlook} onChange={(event) => update({ calendars: { ...settings.calendars, outlook: event.target.checked } })} /> {t('outlookCalendar')}</label>
      </section>

      <section className="panel">
        <h2>{t('rules')}</h2>
        <label><input type="checkbox" checked={settings.rules.avoidWeekends} onChange={(event) => updateRules({ avoidWeekends: event.target.checked })} /> {t('avoidWeekends')}</label>
        <label><input type="checkbox" checked={settings.rules.avoidWorkHours} onChange={(event) => updateRules({ avoidWorkHours: event.target.checked })} /> {t('avoidWorkHours')}</label>
        <label><input type="checkbox" checked={settings.rules.avoidPendingSlots} onChange={(event) => updateRules({ avoidPendingSlots: event.target.checked })} /> {t('avoidPendingSlots')}</label>
        <label className="inlineField">{t('startAfter')} <input type="number" min="0" max="23" value={settings.rules.avoidBeforeHour} onChange={(event) => updateRules({ avoidBeforeHour: Number(event.target.value) })} /></label>
        <label className="inlineField">{t('endBefore')} <input type="number" min="1" max="24" value={settings.rules.avoidAfterHour} onChange={(event) => updateRules({ avoidAfterHour: Number(event.target.value) })} /></label>
        <label className="inlineField">{t('buffer')} <input type="number" min="0" max="180" step="15" value={settings.rules.addBufferMinutes} onChange={(event) => updateRules({ addBufferMinutes: Number(event.target.value) })} /> {t('minutes')}</label>
      </section>

      <section className="panel">
        <h2>{t('language')}</h2>
        <div className="segmented">
          {[
            ['ja', '日本語'],
            ['en', 'English'],
            ['zh', '中文']
          ].map(([value, label]) => (
            <button key={value} className={settings.language === value ? 'selected' : ''} onClick={() => update({ language: value })}>
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function formatSyncStatus(syncStatus, t) {
  if (syncStatus === 'active') {
    return t('syncActive');
  }
  if (syncStatus === 'account-mismatch') {
    return t('accountChanged');
  }
  if (syncStatus === 'initializing') {
    return t('initializing');
  }
  return t('signInNeeded');
}

function formatAccountStatus(status, t) {
  return status === 'authorized' ? t('ready') : t('reconnectRequired');
}

function upsertAccount(accounts, nextAccount) {
  const exists = accounts.some((account) => account.id === nextAccount.id);
  if (!exists) {
    return [...accounts, nextAccount];
  }
  return accounts.map((account) => (
    account.id === nextAccount.id ? { ...account, ...nextAccount } : account
  ));
}

function replaceEventsForAccount(events, accountId, nextEvents) {
  return [
    ...events.filter((event) => event.sourceAccountId !== accountId),
    ...nextEvents
  ];
}

function getPlaceholderBatchEvents(events, selectedEvent) {
  const batchId = selectedEvent.details?.placeholderBatchId;
  if (!batchId) {
    return [selectedEvent];
  }
  return events.filter((event) => (
    event.details?.isSlottoPlaceholder
    && event.details?.placeholderBatchId === batchId
  ));
}

function canEditCalendarEvent(event) {
  return event?.provider === 'google' && Boolean(event.details?.googleEventId);
}

function makeOneHourSlot(date) {
  const start = new Date(date);
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() < 30 ? 0 : 30);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    id: `${start.toISOString()}_${end.toISOString()}`,
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function isoToLocalInput(value) {
  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return offsetDate.toISOString().slice(0, 16);
}

function localInputToIso(value) {
  return new Date(value).toISOString();
}

function normalizeDurationInput(value) {
  const duration = Math.round((Number(value) || 60) / 30) * 30;
  return Math.min(240, Math.max(30, duration));
}

function formatAvailabilityResults(slots, languages) {
  return languages.map((language) => formatSlots(slots, language)).join('\n\n');
}

function AvailabilityPage({ resultText, currentSlots, selectedDraft, language, settings, onChangeSettings, onRegenerate, onCopy, onInsert, onMarkPending, onSaveDraft, t }) {
  const outputLanguages = settings.outputLanguages ?? [settings.language];
  const updateOutputLanguage = (value, checked) => {
    const nextLanguages = checked
      ? [...new Set([...outputLanguages, value])]
      : outputLanguages.filter((languageValue) => languageValue !== value);
    onChangeSettings({ outputLanguages: nextLanguages.length ? nextLanguages : [value] });
  };

  return (
    <div className="availabilityPage">
      <header className="pageHeader">
        <div>
          <p className="eyebrow">{t('availability')}</p>
          <h1>{t('candidateSlots')}</h1>
        </div>
        <button className="secondaryButton compact" title={t('randomGenerate')} onClick={onRegenerate}>
          <RefreshCw size={17} />
          {t('randomGenerate')}
        </button>
      </header>

      {selectedDraft && (
        <DraftPanel draft={selectedDraft} language={language} onSaveDraft={onSaveDraft} t={t} />
      )}

      <section className="panel availabilityOptions">
        <h2>{t('availabilityOptions')}</h2>
        <label className="inlineField">{t('dailyTimeBand')}
          <span className="timeRangeInputs">
            <input type="time" value={settings.availabilityStartTime ?? '08:00'} onChange={(event) => onChangeSettings({ availabilityStartTime: event.target.value })} />
            <input type="time" value={settings.availabilityEndTime ?? '22:00'} onChange={(event) => onChangeSettings({ availabilityEndTime: event.target.value })} />
          </span>
        </label>
        <label><input type="checkbox" checked={settings.avoidWeekendsAndHolidays ?? true} onChange={(event) => onChangeSettings({ avoidWeekendsAndHolidays: event.target.checked })} /> {t('avoidWeekendsAndHolidays')}</label>
        <div className="checkGroup">
          <span>{t('outputLanguages')}</span>
          {[
            ['en', 'English'],
            ['ja', '日本語'],
            ['zh', '中文']
          ].map(([value, label]) => (
            <label key={value}><input type="checkbox" checked={outputLanguages.includes(value)} onChange={(event) => updateOutputLanguage(value, event.target.checked)} /> {label}</label>
          ))}
        </div>
        <label><input type="checkbox" checked={settings.useFixedDuration ?? true} onChange={(event) => onChangeSettings({ useFixedDuration: event.target.checked })} /> {settings.useFixedDuration ? t('fixedDuration') : t('maxFreeRange')}</label>
        {settings.useFixedDuration && (
          <label className="inlineField">{t('duration')} <input type="number" min="30" max="240" step="30" value={settings.slotDurationMinutes ?? 60} onChange={(event) => onChangeSettings({ slotDurationMinutes: normalizeDurationInput(event.target.value) })} /> {t('minutes')}</label>
        )}
        <label className="inlineField">{t('buffer')} <input type="number" min="0" max="180" step="15" value={settings.rules.addBufferMinutes ?? 30} onChange={(event) => onChangeSettings({ rules: { ...settings.rules, addBufferMinutes: Number(event.target.value) } })} /> {t('minutes')}</label>
        <label className="inlineField">{t('generatedSlotCount')} <input type="number" min="1" max="10" value={settings.generatedSlotCount ?? 3} onChange={(event) => onChangeSettings({ generatedSlotCount: Number(event.target.value) })} /></label>
        <label className="inlineField">{t('placeholderEventTitle')} <input type="text" value={settings.placeholderEventTitle ?? '面接'} onChange={(event) => onChangeSettings({ placeholderEventTitle: event.target.value })} /></label>
      </section>

      <section className="panel grow">
        <div className="panelHeader">
          <h2>{t('generatedResponse')}</h2>
          <button className="secondaryButton compact" onClick={onCopy}>
            <Copy size={14} />
            {t('copy')}
          </button>
        </div>
        <textarea value={resultText} readOnly rows={8} />
        <div className="buttonRow">
          <button className="primaryButton" disabled={!currentSlots.length} onClick={onMarkPending}>{t('createPlaceholders')}</button>
          <button className="secondaryButton" onClick={onInsert}>{t('insert')}</button>
        </div>
      </section>
    </div>
  );
}

function DraftPanel({ draft, language, onSaveDraft, t }) {
  return (
    <section className="panel">
      <h2>{t('capturedTime')}</h2>
      <p className="muted">
        {draft.parsed ? `${t('parsed')}: ${formatSlot(draft.parsed.slot, language)}` : `${t('couldNotParse')}: ${draft.rawText}`}
      </p>
      {draft.parsed && (
        <form className="draftForm" onSubmit={(event) => {
          event.preventDefault();
          onSaveDraft(new FormData(event.currentTarget));
        }}>
          <input name="company" type="text" placeholder={t('company')} />
          <input name="title" type="text" placeholder={t('eventTitle')} />
          <select name="status" defaultValue="pending">
            <option value="pending">{t('pending')}</option>
            <option value="confirmed">{t('confirmed')}</option>
          </select>
          <button className="secondaryButton" type="submit">{t('saveSchedule')}</button>
        </form>
      )}
    </section>
  );
}

function buildGeneratedSlots(state) {
  const providerFilter = new Set([
    state.settings.calendars.google ? 'google' : null,
    state.settings.calendars.outlook ? 'outlook' : null,
    'local'
  ].filter(Boolean));

  return generateAvailability({
    busyEvents: state.busyEvents.filter((event) => providerFilter.has(event.provider)),
    pendingEvents: state.pendingEvents,
    settings: state.settings
  });
}

function buildCalendarEvents(state, generatedSlots) {
  const busyEvents = state.busyEvents.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    extendedProps: { kind: event.status === 'pending' ? 'pending' : 'busy', source: event }
  }));

  const pendingEvents = state.pendingEvents.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    extendedProps: { kind: event.status === 'confirmed' ? 'confirmed' : 'pending', source: event }
  }));

  const generatedEvents = generatedSlots.map((slot) => ({
    id: `generated-${slot.id}`,
    title: 'Suggested slot',
    start: slot.start,
    end: slot.end,
    extendedProps: { kind: 'generated', source: { ...slot, title: 'Suggested slot', provider: 'local', status: 'pending' } }
  }));

  return [...busyEvents, ...pendingEvents, ...generatedEvents];
}

function CreateEventDialog({ draft, onChange, onClose, onSave, t }) {
  const [isSaving, setIsSaving] = useState(false);
  const canSave = draft.title.trim() && new Date(draft.end) > new Date(draft.start);

  const updateField = (field, value) => {
    if (field === 'start') {
      if (!value) {
        return;
      }
      const nextStart = localInputToIso(value);
      const currentDuration = Math.max(30 * 60 * 1000, new Date(draft.end) - new Date(draft.start));
      onChange({
        ...draft,
        start: nextStart,
        end: new Date(new Date(nextStart).getTime() + currentDuration).toISOString()
      });
      return;
    }
    if (field === 'end') {
      if (!value) {
        return;
      }
      onChange({ ...draft, end: localInputToIso(value) });
      return;
    }
    onChange({ ...draft, [field]: value });
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSave || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onSave(draft);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="dialogBackdrop" role="presentation">
      <form className="dialog" onSubmit={handleSubmit}>
        <div className="panelHeader">
          <h2>{draft.mode === 'edit' ? t('editEvent') : t('createEvent')}</h2>
          <button className="ghostButton compact" type="button" onClick={onClose}>{t('cancelSelection')}</button>
        </div>
        <label>
          <span>{t('eventTitle')}</span>
          <input type="text" value={draft.title} onChange={(event) => updateField('title', event.target.value)} autoFocus />
        </label>
        <div className="dialogGrid">
          <label>
            <span>{t('startTime')}</span>
            <input type="datetime-local" value={isoToLocalInput(draft.start)} onChange={(event) => updateField('start', event.target.value)} />
          </label>
          <label>
            <span>{t('endTime')}</span>
            <input type="datetime-local" value={isoToLocalInput(draft.end)} onChange={(event) => updateField('end', event.target.value)} />
          </label>
        </div>
        <label>
          <span>{t('location')}</span>
          <input type="text" value={draft.location} onChange={(event) => updateField('location', event.target.value)} />
        </label>
        <label>
          <span>{t('meetingLink')}</span>
          <input type="url" value={draft.meetingUrl} onChange={(event) => updateField('meetingUrl', event.target.value)} />
        </label>
        <label>
          <span>{t('details')}</span>
          <textarea rows={4} value={draft.description} onChange={(event) => updateField('description', event.target.value)} />
        </label>
        <button className="primaryButton fullWidth" type="submit" disabled={!canSave || isSaving}>
          {isSaving ? t('saving') : draft.mode === 'edit' ? t('saveChanges') : t('createEvent')}
        </button>
      </form>
    </div>
  );
}

function PlaceholderDialog({ draft, onChange, onClose, onSave, t }) {
  const [isSaving, setIsSaving] = useState(false);
  const canSave = draft.title.trim();

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSave || isSaving) {
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        ...draft,
        title: draft.title.trim(),
        description: draft.description.trim()
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="dialogBackdrop" role="presentation">
      <form className="dialog" onSubmit={handleSubmit}>
        <div className="panelHeader">
          <h2>{draft.mode === 'edit' ? t('editPlaceholder') : t('createPlaceholders')}</h2>
          <button className="ghostButton compact" type="button" onClick={onClose}>{t('cancelSelection')}</button>
        </div>
        <label>
          <span>{t('eventTitle')}</span>
          <input
            type="text"
            value={draft.title}
            required
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
            autoFocus
          />
        </label>
        <label>
          <span>{t('details')}</span>
          <textarea
            rows={5}
            value={draft.description}
            onChange={(event) => onChange({ ...draft, description: event.target.value })}
          />
        </label>
        <button className="primaryButton fullWidth" type="submit" disabled={!canSave || isSaving}>
          {isSaving ? t('saving') : draft.mode === 'edit' ? t('saveChanges') : t('createPlaceholders')}
        </button>
      </form>
    </div>
  );
}

function EventDetailsPanel({ event, hasPrevious, hasNext, onPrevious, onNext, onConfirmPlaceholder, onDeletePlaceholder, onEditPlaceholder, onEditEvent, t }) {
  if (!event) {
    return (
      <section className="eventDetailsPanel empty">
        <h2>{t('scheduleDetails')}</h2>
        <p>{t('selectEventHint')}</p>
      </section>
    );
  }

  const details = event.details ?? {};
  const meetingLinks = getMeetingLinks(details);
  const isRecurring = Boolean(details.recurringEventId || details.recurrence?.length);

  return (
    <section className="eventDetailsPanel">
      <div className="detailsHeader">
        <div>
          <p className="eyebrow">{event.sourceAccountEmail || event.provider || t('calendar')}</p>
          <h2>{event.title || t('noTitle')}</h2>
        </div>
        <div className="detailsActions">
          <button className="iconButton small" title={t('previousEvent')} disabled={!hasPrevious} onClick={onPrevious}>‹</button>
          <button className="iconButton small" title={t('nextEvent')} disabled={!hasNext} onClick={onNext}>›</button>
          <span className={`statusBadge ${event.status ?? 'confirmed'}`}>{t(event.status ?? 'confirmed')}</span>
        </div>
      </div>

      <div className="detailsGrid">
        <DetailItem label={t('time')} value={`${formatDateTime(event.start)} - ${formatDateTime(event.end)}`} />
        <DetailItem label={t('recurring')} value={isRecurring ? t('yes') : t('no')} />
        <DetailItem
          label={t('location')}
          value={details.location || t('none')}
          link={details.location ? googleMapsSearchUrl(details.location) : ''}
        />
        <DetailItem label={t('organizer')} value={formatPerson(details.organizer, t)} />
      </div>

      <DetailBlock label={t('details')} value={stripHtml(details.description) || t('noDetails')} />

      <div className="detailsGrid">
        <DetailItem label={t('meetingLink')} value={meetingLinks.length ? meetingLinks[0].uri : t('none')} link={meetingLinks[0]?.uri} />
        <DetailItem label={t('calendarLink')} value={details.htmlLink ? t('openInGoogleCalendar') : t('none')} link={details.htmlLink} />
      </div>

      {details.isSlottoPlaceholder ? (
        <div className="buttonRow">
          <button className="primaryButton" onClick={() => onConfirmPlaceholder(event)}>{t('confirmSchedule')}</button>
          <button className="secondaryButton" onClick={() => onEditPlaceholder(event)}>{t('editPlaceholder')}</button>
          <button className="secondaryButton" onClick={() => onDeletePlaceholder(event)}>{t('deletePlaceholderBatch')}</button>
        </div>
      ) : (
        <button className="secondaryButton fullWidth" disabled={!canEditCalendarEvent(event)} onClick={() => onEditEvent(event)}>{t('editEvent')}</button>
      )}

      {details.attendees?.length ? (
        <DetailBlock
          label={t('attendees')}
          value={details.attendees.map((attendee) => (
            `${attendee.displayName || attendee.email}${attendee.responseStatus ? ` (${attendee.responseStatus})` : ''}`
          )).join('\n')}
        />
      ) : null}

      {details.recurrence?.length ? (
        <DetailBlock label={t('recurrenceRule')} value={details.recurrence.join('\n')} />
      ) : null}
    </section>
  );
}

function getOrderedEventSources(events) {
  return events
    .map((event) => event.extendedProps.source)
    .filter(Boolean)
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}

function getAdjacentEvent(events, selectedEvent, direction) {
  if (!events.length) {
    return null;
  }

  if (!selectedEvent) {
    return direction > 0 ? events[0] : events[events.length - 1];
  }

  const currentIndex = events.findIndex((event) => event.id === selectedEvent.id);
  if (currentIndex === -1) {
    return direction > 0 ? events[0] : events[events.length - 1];
  }

  return events[currentIndex + direction] ?? null;
}

function DetailItem({ label, value, link }) {
  return (
    <div className="detailItem">
      <span>{label}</span>
      {link ? <a href={link} target="_blank" rel="noreferrer">{value}</a> : <strong>{value}</strong>}
    </div>
  );
}

function DetailBlock({ label, value }) {
  return (
    <div className="detailBlock">
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function findFirstEventOnDate(events, date) {
  const target = toDateKey(date);
  return events
    .filter((event) => toDateKey(new Date(event.start)) === target)
    .sort((a, b) => new Date(a.start) - new Date(b.start))[0]?.extendedProps.source ?? null;
}

function findEventById(events, id) {
  return events.find((event) => event.extendedProps.source?.id === id)?.extendedProps.source ?? null;
}

function toDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function formatDateTime(value) {
  if (!value) {
    return 'Unknown';
  }
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function formatPerson(person, t = (key) => key) {
  if (!person) {
    return t('unknown');
  }
  return person.displayName ? `${person.displayName} <${person.email}>` : person.email || t('unknown');
}

function getMeetingLinks(details) {
  const links = [...(details.conferenceLinks ?? [])];
  if (details.hangoutLink && !links.some((link) => link.uri === details.hangoutLink)) {
    links.unshift({ type: 'video', uri: details.hangoutLink, label: 'Google Meet' });
  }
  return links;
}

function googleMapsSearchUrl(location) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
}

function stripHtml(value = '') {
  return value.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim();
}

function summarizeEventsByDay(events) {
  return events.reduce((summary, event) => {
    const key = event.start.slice(0, 10);
    const kind = event.extendedProps.kind;
    summary[key] = summary[key] ?? {};
    summary[key][kind] = (summary[key][kind] ?? 0) + 1;
    return summary;
  }, {});
}

function renderDayCell(arg, summaries, t) {
  const key = [
    arg.date.getFullYear(),
    String(arg.date.getMonth() + 1).padStart(2, '0'),
    String(arg.date.getDate()).padStart(2, '0')
  ].join('-');
  const summary = summaries[key] ?? {};

  return (
    <div className="dayCellInner">
      <span className="dayNumber">{arg.dayNumberText}</span>
      <div className="daySummary">
        {Object.entries(summary).map(([kind, count]) => (
          <span key={kind} className={`summaryPill ${kind}`} title={`${t(kind) || statusLabels[kind]}: ${count}`}>
            +{count}
          </span>
        ))}
      </div>
    </div>
  );
}

function renderEventContent(arg) {
  return (
    <div className="eventBlock">
      <span>{arg.timeText}</span>
      <strong>{arg.event.title}</strong>
    </div>
  );
}

createRoot(document.querySelector('#root')).render(<App />);
