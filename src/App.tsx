import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Moon, Settings as SettingsIcon, Sun } from 'lucide-react'
import { mergeWithDefaults, useSettings } from './hooks/useSettings'
import { useLocalState } from './hooks/useLocalState'
import { useSessions } from './hooks/useSessions'
import { useTimer } from './hooks/useTimer'
import { useFlowTimer } from './hooks/useFlowTimer'
import { useKeyboard } from './hooks/useKeyboard'
import { DocumentChrome } from './hooks/useDocumentChrome'
import { useTheme } from './hooks/useTheme'
import { useServiceWorker } from './hooks/useServiceWorker'
import { useWakeLock } from './hooks/useWakeLock'
import { useNotificationActions } from './hooks/useNotificationActions'
import { useTodos } from './hooks/useTodos'
import { useAuth } from './hooks/useAuth'
import { useSync, mergeRemoteTagsList } from './hooks/useSync'
import { drainQueue, enqueue, peekQueue } from './lib/syncQueue'
import { useTranslation } from './hooks/useTranslation'
import { addSession, clearSessions, updateSessionNotes } from './lib/db'
import { requestNotificationPermission } from './lib/notify'
import { playMicroClick } from './lib/sound'
import { STORAGE_KEYS, type Session, type Settings, type TimerMode } from './types'
import { Timer } from './components/Timer'
import { CatLogo } from './components/CatLogo'
import { StatusBar } from './components/StatusBar'
import { BentoCockpit, type BentoCockpitRef } from './components/cockpit/BentoCockpit'
import { DeckSwitcher } from './components/DeckSwitcher'

const TodoManagerModal = lazy(() =>
  import('./components/cockpit/TodoManagerModal').then((m) => ({ default: m.TodoManagerModal })),
)
const SettingsModal = lazy(() =>
  import('./components/cockpit/SettingsModal').then((m) => ({ default: m.SettingsModal })),
)
const ReflectionModal = lazy(() =>
  import('./components/ReflectionModal').then((m) => ({ default: m.ReflectionModal })),
)

export default function App() {
  const { t, lang } = useTranslation()
  const [colorMode, setColorMode, themeId, setThemeId] = useTheme()
  const [settings, updateSettings, mergeRemoteSettings, setRemoteTags] = useSettings()
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isZenMode, setIsZenMode] = useState(false)
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null)
  const [mode, setMode] = useLocalState<TimerMode>(STORAGE_KEYS.mode, 'pomodoro')
  const [activeDeck, setActiveDeck] = useState<number>(0)
  const cockpitRef = useRef<BentoCockpitRef>(null)

  const handleSelectDeck = useCallback((deck: number) => {
    setActiveDeck(deck)
    cockpitRef.current?.scrollToDeck(deck)
  }, [])
  const [activeTodoIdRaw, setActiveTodoId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null)
  const toastTimer = useRef<number | null>(null)
  const sessions = useSessions()
  const todosApi = useTodos()
  const activeTodo = todosApi.todos.find((x) => x.id === activeTodoIdRaw) ?? null
  const activeTodoId = activeTodo?.id ?? null
  const sessionTask = activeTodo?.title ?? ''
  const sessionTag = activeTodo?.tag ?? ''
  const auth = useAuth()
  const handleMergeRemoteTags = useCallback(
    (remoteTags: string[]) => {
      if (!remoteTags.length) return
      setRemoteTags((currentTags) => mergeRemoteTagsList(currentTags, remoteTags, peekQueue()))
    },
    [setRemoteTags],
  )
  const sync = useSync({
    user: auth.user,
    mergeRemoteTodos: todosApi.mergeRemote,
    tags: settings.tags,
    mergeRemoteTags: handleMergeRemoteTags,
    settings,
    mergeRemoteSettings,
  })

  const [isMouseActive, setIsMouseActive] = useState(true)
  const mouseTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isZenMode) return
    const onActivity = () => {
      setIsMouseActive(true)
      if (mouseTimerRef.current != null) window.clearTimeout(mouseTimerRef.current)
      mouseTimerRef.current = window.setTimeout(() => {
        setIsMouseActive(false)
      }, 3500)
    }
    window.addEventListener('mousemove', onActivity)
    window.addEventListener('pointerdown', onActivity)
    window.addEventListener('keydown', onActivity)
    return () => {
      window.removeEventListener('mousemove', onActivity)
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener('keydown', onActivity)
      if (mouseTimerRef.current != null) window.clearTimeout(mouseTimerRef.current)
    }
  }, [isZenMode])

  const showToast = useCallback((message: string) => {
    setToast({ message, id: Date.now() })
    if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 3500)
  }, [])

  useEffect(
    () => () => {
      if (toastTimer.current != null) window.clearTimeout(toastTimer.current)
    },
    [],
  )

  const handleFlowFinished = useCallback(
    (session: Omit<Session, 'id' | 'notes'>) => {
      void addSession(session)
        .then((id) => setPendingSessionId(id))
        .catch(() => showToast(t.errors.saveFailed))
      showToast(t.flow.finishedToast(Math.max(1, Math.round(session.durationMs / 60_000))))
    },
    [showToast, t],
  )

  const flow = useFlowTimer({ task: sessionTask, tag: sessionTag, onFinish: handleFlowFinished })

  const { incrementPomodoros } = todosApi
  const handleFocusComplete = useCallback(
    (s: Omit<Session, 'id' | 'notes'>) => {
      void addSession(s)
        .then((id) => setPendingSessionId(id))
        .catch(() => showToast(t.errors.saveFailed))
      if (activeTodoId && activeTodo) {
        incrementPomodoros(activeTodoId)
      }
    },
    [activeTodoId, activeTodo, incrementPomodoros, showToast, t],
  )

  const handleSaveNote = useCallback(
    (notes: string) => {
      if (pendingSessionId != null) {
        void updateSessionNotes(pendingSessionId, notes).catch(() => showToast(t.errors.saveFailed))
      }
      setPendingSessionId(null)
    },
    [pendingSessionId, showToast, t],
  )

  const handleSkipNote = useCallback(() => setPendingSessionId(null), [])

  const timer = useTimer({
    settings,
    task: sessionTask,
    tag: sessionTag,
    onFocusComplete: handleFocusComplete,
  })

  const flowFinish = flow.finishSession
  const flowDiscard = flow.resetTimer
  const flowToggle = flow.toggle
  const timerToggle = timer.toggle
  const timerSkip = timer.skip
  const timerReset = timer.reset

  const handleFlowFinish = useCallback(() => {
    if (mode === 'flow') flowFinish()
  }, [mode, flowFinish])

  const handleFlowDiscard = useCallback(() => {
    flowDiscard()
  }, [flowDiscard])

  const handleToggle = useCallback(() => {
    void requestNotificationPermission()
    if (mode === 'flow') flowToggle()
    else timerToggle()
  }, [mode, flowToggle, timerToggle])

  const handleSkip = useCallback(() => {
    if (mode === 'flow') handleFlowFinish()
    else timerSkip()
  }, [mode, timerSkip, handleFlowFinish])

  const handleReset = useCallback(() => {
    if (mode === 'flow') handleFlowDiscard()
    else timerReset()
  }, [mode, timerReset, handleFlowDiscard])

  // Stable identities for the callbacks handed to BentoCockpit: inline arrows
  // would be a fresh reference on every App render, defeating the memo()
  // around BentoCockpit and each card it renders.
  const addTime = timer.addTime
  const handleAddTime = useCallback(
    (mins: number) => {
      addTime(mins * 60_000)
    },
    [addTime],
  )
  const handleOpenTodoManager = useCallback(() => setIsTodoModalOpen(true), [])
  const handleOpenSettingsModal = useCallback(() => setIsSettingsModalOpen(true), [])

  const handleModeChange = useCallback(
    (m: TimerMode) => {
      if (m === mode) return
      if (m === 'flow') {
        timerReset()
      } else {
        flowDiscard()
      }
      setActiveTodoId(null)
      setMode(m)
    },
    [mode, timerReset, flowDiscard, setMode],
  )

  const handleFocusTodo = useCallback(
    (id: string) => {
      setActiveTodoId((prev) => (prev === id ? null : id))
    },
    [],
  )

  const handleFocusTodoFromModal = useCallback(
    (id: string) => {
      handleFocusTodo(id)
      setIsTodoModalOpen(false)
    },
    [handleFocusTodo],
  )

  const handleTodoRemove = useCallback(
    (id: string) => {
      setActiveTodoId((prev) => (prev === id ? null : prev))
      todosApi.remove(id)
    },
    [todosApi],
  )

  const handleToggleZen = useCallback(() => {
    // Reset the idle badge on every (re-)entry; outside zen mode the flag is
    // irrelevant because the badge is only rendered in the zen overlay.
    setIsMouseActive(true)
    setIsZenMode((prev) => !prev)
  }, [])

  const handleExitZen = useCallback(() => {
    setIsZenMode(false)
  }, [])

  const isModalOpen =
    isSettingsModalOpen || isTodoModalOpen || pendingSessionId != null

  useKeyboard(
    {
      onToggle: handleToggle,
      onSkip: handleSkip,
      onReset: handleReset,
      onFlowFinish: handleFlowFinish,
      onToggleZen: handleToggleZen,
      onExitZen: isZenMode ? handleExitZen : undefined,
    },
    !isModalOpen,
  )

  const chromePhase = mode === 'flow' ? 'focus' : timer.phase
  const chromeStatus = mode === 'flow' ? flow.status : timer.status
  const isRunning = chromeStatus === 'running'

  const { updateAvailable, reload } = useServiceWorker()

  useWakeLock(chromeStatus === 'running')

  useNotificationActions({
    onStartPhase: () => {
      if (mode === 'flow') {
        if (flow.status !== 'running') flow.toggle()
      } else if (timer.status !== 'running') {
        timer.start()
      }
    },
    onAddTime: () => {
      if (mode !== 'flow') timer.addTime(5 * 60_000)
    },
  })

  const handleImportSettings = useCallback((s: unknown) => {
    if (!s || typeof s !== 'object') return
    // Imported backups may carry a partial (or even empty) settings object.
    // Normalize it through mergeWithDefaults so the updater always sees a full,
    // valid Settings — otherwise haveSettingsChanged/haveTagsChanged read
    // missing fields and throw, aborting the rest of the import.
    const imported = mergeWithDefaults(s as Partial<Settings>)
    updateSettings(() => ({
      ...imported,
      // An import is an explicit user action: make it the newest local change
      // so a later remote merge cannot immediately revert it.
      updatedAt: Date.now(),
    }))
    enqueue({ kind: 'replace', table: 'tags' })
    enqueue({ kind: 'replace', table: 'settings' })
  }, [updateSettings])

  const handleImportTodos = useCallback(
    (rawTodos: unknown[]) => {
      todosApi.importTodos(rawTodos)
    },
    [todosApi],
  )

  const syncNow = sync.sync
  const handleSyncNow = useCallback(() => void syncNow(true), [syncNow])
  const handleSyncLogout = useCallback(
    async (clearLocalData: boolean) => {
      if (clearLocalData) {
        await clearSessions()
        todosApi.clearAll()
        drainQueue()
        showToast(t.sync.logoutClear)
      }
      await auth.logout()
    },
    [auth, showToast, t, todosApi],
  )

  const [liveAnnouncement, setLiveAnnouncement] = useState({
    phase: chromePhase,
    status: chromeStatus,
    mode,
    message: '',
  })
  // Render-phase adjustment (React-endorsed "adjust state during render"):
  // derives the screen-reader announcement from phase/status transitions
  // without an effect + prev refs and without a cascading re-render.
  if (
    liveAnnouncement.phase !== chromePhase ||
    liveAnnouncement.status !== chromeStatus ||
    liveAnnouncement.mode !== mode
  ) {
    let message = liveAnnouncement.message
    if (mode === 'flow') {
      if (liveAnnouncement.status !== flow.status) {
        if (flow.status === 'running') {
          message = lang === 'de' ? 'Flow gestartet.' : 'Flow started.'
        } else if (flow.status === 'paused') {
          message = lang === 'de' ? 'Flow pausiert.' : 'Flow paused.'
        } else if (flow.status === 'idle') {
          message = lang === 'de' ? 'Flow beendet.' : 'Flow finished.'
        }
      }
    } else {
      if (liveAnnouncement.phase !== timer.phase) {
        const phaseName = t.phases[timer.phase]
        const durationMins = Math.round(timer.totalMs / 60_000)
        message =
          lang === 'de'
            ? `${phaseName} gestartet (${durationMins} Minuten).`
            : `${phaseName} started (${durationMins} minutes).`
      } else if (liveAnnouncement.status !== timer.status) {
        if (timer.status === 'paused') {
          message = lang === 'de' ? `${t.phases[timer.phase]} pausiert.` : `${t.phases[timer.phase]} paused.`
        } else if (timer.status === 'running') {
          message = lang === 'de' ? `${t.phases[timer.phase]} fortgesetzt.` : `${t.phases[timer.phase]} resumed.`
        }
      }
    }
    setLiveAnnouncement({ phase: chromePhase, status: chromeStatus, mode, message })
  }

  return (
    <div className="relative mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-7xl flex-col overflow-hidden px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-5 2xl:max-w-[1440px]">
      {/* Dynamic Document Title & Favicon Manager (Isolated from App re-renders) */}
      <DocumentChrome phase={chromePhase} status={chromeStatus} mode={mode} />

      {/* Screen Reader Live Region for WCAG 2.1 AA Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement.message}
      </div>

      <header className="mb-2 flex h-9 w-full shrink-0 select-none items-center justify-between gap-2 sm:mb-3 sm:gap-4">
        {/* Left: mark + deck switcher */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface"
            aria-hidden="true"
          >
            <CatLogo
              className="text-fg"
              size={17}
              state={isRunning ? chromePhase : 'idle'}
            />
          </div>
          <span className="hidden select-none font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-fg lg:inline">
            Pomau
          </span>

          <DeckSwitcher activeDeck={activeDeck} onSelectDeck={handleSelectDeck} />
        </div>

        {/* Right: global utilities */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              playMicroClick('toggle')
              setColorMode(colorMode === 'dark' ? 'light' : 'dark')
            }}
            title={colorMode === 'dark' ? 'Light mode' : 'Dark mode'}
            aria-label={colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={colorMode === 'light'}
            className="icon-btn !h-8 !w-8"
          >
            {colorMode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <button
            type="button"
            onClick={() => {
              playMicroClick('tab')
              setIsSettingsModalOpen(true)
            }}
            title={t.nav.settings}
            aria-label={t.nav.settings}
            className="btn-secondary !h-8 !min-h-[32px] !px-2.5 !text-[10px] sm:!px-3"
          >
            <SettingsIcon size={13} />
            <span className="hidden md:inline">{t.nav.settings}</span>
          </button>
        </div>
      </header>

      <main className="flex min-h-0 w-full flex-1 flex-col items-stretch overflow-hidden">
        {!isZenMode && (
          <BentoCockpit
            ref={cockpitRef}
            phase={timer.phase}
            phaseLabel={timer.phaseLabel}
            status={timer.status}
            time={timer.time}
            progress={timer.progress}
            remainingMs={timer.remainingMs}
            totalMs={timer.totalMs}
            mode={mode}
            flowStatus={flow.status}
            flowTime={flow.time}
            completedFocusInCycle={timer.completedFocusInCycle}
            roundsBeforeLongBreak={timer.roundsBeforeLongBreak}
            onModeChange={handleModeChange}
            onToggle={handleToggle}
            onSkip={handleSkip}
            onReset={handleReset}
            onAddTime={handleAddTime}
            todos={todosApi.todos}
            activeTodoId={activeTodoId}
            activeTodo={activeTodo}
            onTodoToggle={todosApi.toggle}
            onTodoFocus={handleFocusTodo}
            onTodoAdd={todosApi.add}
            onTodoRemove={handleTodoRemove}
            onOpenTodoManager={handleOpenTodoManager}
            sessions={sessions}
            onImportSettings={handleImportSettings}
            onImportTodos={handleImportTodos}
            settings={settings}
            onOpenSettingsModal={handleOpenSettingsModal}
            activeDeck={activeDeck}
            onDeckChange={setActiveDeck}
            isZenMode={isZenMode}
            onToggleZen={handleToggleZen}
          />
        )}
      </main>

      {/* Immersive Borderless Zen Mode Overlay */}
      {isZenMode && (
        <div className="fixed inset-0 z-50 flex select-none items-center justify-center overflow-hidden bg-canvas animate-fade-in">
          {/* Floating exit badge (auto-fades on idle during focus) */}
          <div
            className={`fixed left-1/2 top-8 z-50 -translate-x-1/2 transition-all duration-200 ${
              !isRunning || isMouseActive
                ? 'translate-y-0 opacity-100'
                : 'pointer-events-none -translate-y-2 opacity-0'
            }`}
          >
            <button
              type="button"
              onClick={handleExitZen}
              title={t.zen.exitHint}
              aria-label={t.zen.exitHint}
              className="btn-secondary !h-9 !min-h-[36px] !px-3.5 !text-[10px]"
            >
              <span aria-hidden="true" className="dot bg-accent animate-pulse" />
              {t.zen.exitHint}
              <kbd className="kbd">ESC</kbd>
            </button>
          </div>

          {/* Heroic Borderless Timer */}
          <div className="relative z-10 flex w-full max-w-4xl flex-col items-center justify-center p-4 sm:p-6">
            <Timer
              large
              borderless
              phase={timer.phase}
              phaseLabel={timer.phaseLabel}
              status={timer.status}
              time={timer.time}
              progress={timer.progress}
              completedFocusInCycle={timer.completedFocusInCycle}
              roundsBeforeLongBreak={timer.roundsBeforeLongBreak}
              mode={mode}
              flowStatus={flow.status}
              flowTime={flow.time}
              task={sessionTask}
              tag={sessionTag}
              onModeChange={handleModeChange}
              onToggle={handleToggle}
              onSkip={handleSkip}
              onReset={handleReset}
              isZenMode={isZenMode}
              onToggleZen={handleToggleZen}
            />
          </div>
        </div>
      )}

      {updateAvailable && (
        <div className="panel fixed bottom-12 right-3 z-50 flex items-center gap-3 px-4 py-2.5 sm:bottom-4 sm:right-4">
          <span className="label text-fg">{t.update.available}</span>
          <button
            type="button"
            className="btn-primary !h-8 !min-h-[32px] !px-3 !text-[10px]"
            onClick={reload}
          >
            {t.update.reload}
          </button>
        </div>
      )}

      {toast && (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-none fixed bottom-12 left-1/2 z-50 -translate-x-1/2 select-none font-mono text-[10px] uppercase tracking-[0.18em] text-muted sm:bottom-16"
        >
          [{toast.message}]
        </div>
      )}

      {pendingSessionId != null && (
        <Suspense fallback={null}>
          <ReflectionModal onSave={handleSaveNote} onSkip={handleSkipNote} />
        </Suspense>
      )}

      {/* Modals for Expanded Views */}
      {isTodoModalOpen && (
        <Suspense fallback={null}>
          <TodoManagerModal
            isOpen={isTodoModalOpen}
            onClose={() => setIsTodoModalOpen(false)}
            todos={todosApi.todos}
            tags={settings.tags}
            activeTodoId={activeTodoId}
            timerRunning={isRunning}
            onAdd={todosApi.add}
            onToggle={todosApi.toggle}
            onEdit={todosApi.edit}
            onRemove={handleTodoRemove}
            onFocus={handleFocusTodoFromModal}
          />
        </Suspense>
      )}

      {isSettingsModalOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            settings={settings}
            update={updateSettings}
            themeId={themeId}
            onThemeChange={setThemeId}
            sessions={sessions}
            todos={todosApi.todos}
            syncStatus={sync.status}
            syncPending={sync.pending}
            syncLastSyncAt={sync.lastSyncAt}
            syncProfile={auth.profile}
            syncAvailable={auth.available}
            syncLoading={auth.loading}
            syncError={sync.syncError}
            onSyncLogin={auth.login}
            onSyncLogout={handleSyncLogout}
            onSyncNow={handleSyncNow}
          />
        </Suspense>
      )}

      {/* Dynamic Status Bar */}
      <StatusBar
        mode={mode}
        phase={chromePhase}
        status={chromeStatus}
        task={sessionTask}
        tag={sessionTag}
        syncStatus={sync.status}
      />
    </div>
  )
}
