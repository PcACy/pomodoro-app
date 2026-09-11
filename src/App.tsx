import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Moon, Settings as SettingsIcon, Sun } from 'lucide-react'
import { useSettings } from './hooks/useSettings'
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
import { useSync } from './hooks/useSync'
import { useTranslation } from './hooks/useTranslation'
import { addSession, updateSessionNotes } from './lib/db'
import { requestNotificationPermission } from './lib/notify'
import { playMicroClick } from './lib/sound'
import { STORAGE_KEYS, type Session, type Settings, type TimerMode } from './types'
import { Timer } from './components/Timer'
import { CatLogo } from './components/CatLogo'
import { StatusBar } from './components/StatusBar'
import { BentoCockpit, type BentoCockpitRef } from './components/cockpit/BentoCockpit'
import { TodoManagerModal } from './components/cockpit/TodoManagerModal'
import { SettingsModal } from './components/cockpit/SettingsModal'

const ReflectionModal = lazy(() => import('./components/ReflectionModal').then((m) => ({ default: m.ReflectionModal })))

function formatSystemClock(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function App() {
  const { t } = useTranslation()
  const [colorMode, setColorMode, themeId, setThemeId] = useTheme()
  const [settings, updateSettings] = useSettings()
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [isZenMode, setIsZenMode] = useState(false)
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null)
  const [mode, setMode] = useLocalState<TimerMode>(STORAGE_KEYS.mode, 'pomodoro')
  const [activeDeck, setActiveDeck] = useState<number>(0)
  const cockpitRef = useRef<BentoCockpitRef>(null)
  const [systemTime, setSystemTime] = useState(() => formatSystemClock(new Date()))

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(formatSystemClock(new Date()))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSelectDeck = useCallback((deck: number) => {
    setActiveDeck(deck)
    cockpitRef.current?.scrollToDeck(deck)
  }, [])
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null)
  const toastTimer = useRef<number | null>(null)
  const sessions = useSessions()
  const todosApi = useTodos()
  const activeTodo = todosApi.todos.find((x) => x.id === activeTodoId) ?? null
  const sessionTask = activeTodo?.title ?? ''
  const sessionTag = activeTodo?.tag ?? ''
  const auth = useAuth()
  const sync = useSync({ user: auth.user, mergeRemoteTodos: todosApi.mergeRemote })

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

  const handleModeChange = useCallback(
    (m: TimerMode) => {
      if (m === mode) return
      if (m === 'flow') {
        timerReset()
      } else {
        flowDiscard()
      }
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
      if (activeTodoId === id) {
        setActiveTodoId(null)
      }
      todosApi.remove(id)
    },
    [activeTodoId, todosApi],
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

  // Note: AudioContext auto-unlock on first user gesture is handled centrally
  // in lib/sound.ts (module-level once-listeners calling initAudio).

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
    if (s && typeof s === 'object') updateSettings(() => s as Settings)
  }, [updateSettings])

  const syncNow = sync.sync
  const handleSyncNow = useCallback(() => void syncNow(true), [syncNow])

  const [liveAnnouncement, setLiveAnnouncement] = useState({
    phase: timer.phase,
    status: timer.status,
    message: '',
  })
  // Render-phase adjustment (React-endorsed "adjust state during render"):
  // derives the screen-reader announcement from phase/status transitions
  // without an effect + prev refs and without a cascading re-render.
  if (liveAnnouncement.phase !== timer.phase || liveAnnouncement.status !== timer.status) {
    let message = liveAnnouncement.message
    if (liveAnnouncement.phase !== timer.phase) {
      const phaseName = t.phases[timer.phase]
      const durationMins = Math.round(timer.totalMs / 60_000)
      message = `${phaseName} gestartet (${durationMins} Minuten).`
    } else if (liveAnnouncement.status !== timer.status) {
      if (timer.status === 'paused') message = `${t.phases[timer.phase]} pausiert.`
      else if (timer.status === 'running') message = `${t.phases[timer.phase]} fortgesetzt.`
    }
    setLiveAnnouncement({ phase: timer.phase, status: timer.status, message })
  }

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden flex flex-col justify-start px-3 sm:px-6 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] max-w-7xl 2xl:max-w-[1440px] mx-auto relative w-full">
      {/* Dynamic Document Title & Favicon Manager (Isolated from App re-renders) */}
      <DocumentChrome phase={chromePhase} status={chromeStatus} mode={mode} />

      {/* Screen Reader Live Region for WCAG 2.1 AA Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement.message}
      </div>

      <header className="flex w-full h-10 shrink-0 items-center justify-between gap-2 sm:gap-4 px-1 mb-1 sm:mb-2 select-none">
        {/* Left: Logo + 3-Deck Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-fg transition-colors shrink-0">
              <CatLogo
                className="text-fg"
                size={18}
                state={isRunning ? chromePhase : 'idle'}
              />
            </div>
            <div className="hidden sm:flex items-center font-mono">
              <h1 className="text-sm font-bold tracking-widest uppercase text-fg">Pomau</h1>
            </div>
          </div>

          {/* Morphing Pill 3-Deck Switcher */}
          <nav
            aria-label="Deck Switcher"
            className="flex items-center gap-0.5 sm:gap-1 font-mono select-none shrink-0 min-w-[165px] sm:min-w-[180px]"
          >
            {[
              { id: 0, num: '01', label: 'Focus' },
              { id: 1, num: '02', label: 'Tasks' },
              { id: 2, num: '03', label: 'Stats' },
            ].map((deck, idx) => {
              const isActive = activeDeck === deck.id
              return (
                <div key={deck.id} className="flex items-center">
                  {idx > 0 && (
                    <span
                      className="text-line dark:text-white/20 select-none font-mono text-[10px] mx-0.5"
                      aria-hidden="true"
                    >
                      //
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSelectDeck(deck.id)}
                    className="relative flex items-center justify-center min-h-[44px] min-w-[36px] sm:min-w-[40px] px-0.5 cursor-pointer outline-none select-none group"
                    aria-pressed={isActive}
                    title={`${deck.label} Deck (${deck.num})`}
                  >
                    <div
                      className={`flex items-center rounded-full transition-all duration-300 ease-out font-mono tracking-wider uppercase text-[10px] sm:text-[11px] ${
                        isActive
                          ? 'bg-fg text-canvas font-bold px-2.5 sm:px-3 py-1 shadow-sm ring-1 ring-fg/10'
                          : 'text-muted hover:text-fg hover:bg-fg/5 px-2 py-1'
                      }`}
                    >
                      <span className={`tabular-nums ${isActive ? 'opacity-85' : 'opacity-90'}`}>
                        {deck.num}
                      </span>
                      <span
                        className={`inline-block overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${
                          isActive
                            ? 'max-w-[65px] opacity-100 ml-1.5'
                            : 'max-w-0 opacity-0 ml-0'
                        }`}
                        aria-hidden={!isActive}
                      >
                        {deck.label}
                      </span>
                    </div>
                  </button>
                </div>
              )
            })}
          </nav>
        </div>

        {/* Right: Exclusively Global Utilities and System Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-xs shrink-0">
          {/* 1. Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              playMicroClick('toggle')
              setColorMode(colorMode === 'dark' ? 'light' : 'dark')
            }}
            title={colorMode === 'dark' ? 'Light mode' : 'Dark mode'}
            aria-label={colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={colorMode === 'light'}
            className="flex items-center justify-center h-8 w-8 rounded-full border border-line bg-surface hover:border-fg/40 text-muted hover:text-fg transition-colors cursor-pointer"
          >
            {colorMode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* 3. Settings Modal Trigger */}
          <button
            type="button"
            onClick={() => {
              playMicroClick('tab')
              setIsSettingsModalOpen(true)
            }}
            title={t.nav.settings}
            aria-label={t.nav.settings}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full border border-line bg-surface hover:border-fg/40 text-muted hover:text-fg uppercase tracking-wider transition-colors cursor-pointer text-[11px]"
          >
            <SettingsIcon size={13} />
            <span className="hidden md:inline">{t.nav.settings}</span>
          </button>

          {/* 4. Minimalist Digital Clock (HH:mm:ss) + Hardware Status LED */}
          <div className="flex items-center gap-2 pl-1.5 sm:pl-2.5 border-l border-line/60 select-none">
            <span className="font-mono text-[10px] sm:text-[11px] text-neutral-600 dark:text-neutral-400 tracking-wider tabular-nums font-medium">
              {systemTime}
            </span>
            <span
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                isRunning ? 'bg-accent animate-pulse' : 'bg-line'
              }`}
              title={isRunning ? 'Recording' : 'Standby'}
            />
          </div>
        </div>
      </header>

      <main className="flex w-full flex-1 min-h-0 flex-col items-stretch overflow-hidden">
        {!isZenMode && (
          <BentoCockpit
            ref={cockpitRef}
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
            onAddTime={(mins) => timer.addTime(mins * 60_000)}
            todos={todosApi.todos}
            activeTodoId={activeTodoId}
            activeTodo={activeTodo}
            onTodoToggle={todosApi.toggle}
            onTodoFocus={handleFocusTodo}
            onTodoAdd={todosApi.add}
            onTodoRemove={handleTodoRemove}
            onOpenTodoManager={() => setIsTodoModalOpen(true)}
            sessions={sessions}
            onImportSettings={handleImportSettings}
            settings={settings}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            activeDeck={activeDeck}
            onDeckChange={setActiveDeck}
            isZenMode={isZenMode}
            onToggleZen={handleToggleZen}
          />
        )}
      </main>

      {/* Immersive Borderless Zen Mode Overlay */}
      {isZenMode && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas select-none overflow-hidden animate-fade-in">
          {/* Floating Minimalist Top Exit Badge (auto-fades on idle during focus) */}
          <div
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-200 ${
              !isRunning || isMouseActive
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            <button
              type="button"
              onClick={handleExitZen}
              title={t.zen.exitHint}
              aria-label={t.zen.exitHint}
              className="group flex items-center gap-2.5 rounded-full border border-line bg-surface px-4 py-1.5 font-mono text-xs font-medium text-muted transition-colors hover:border-fg hover:text-fg active:scale-95"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              <span className="uppercase tracking-wider">{t.zen.exitHint}</span>
              <kbd className="kbd text-[10px]">ESC</kbd>
            </button>
          </div>

          {/* Heroic Borderless Timer */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl p-4 sm:p-6">
            <Timer
              large
              borderless
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
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 font-mono text-xs">
          <span className="text-fg uppercase">{t.update.available}</span>
          <button type="button" className="btn-primary px-3 py-1 text-xs" onClick={reload}>
            {t.update.reload}
          </button>
        </div>
      )}

      {toast && (
        <div
          key={toast.id}
          role="status"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 font-mono text-[11px] uppercase tracking-widest text-muted select-none pointer-events-none"
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
        onSyncLogin={auth.login}
        onSyncLogout={auth.logout}
        onSyncNow={handleSyncNow}
      />

      {/* Dynamic Status Bar */}
      <StatusBar
        colorMode={colorMode}
        themeId={themeId}
        mode={mode}
        phase={chromePhase}
        status={chromeStatus}
        task={sessionTask}
        tag={sessionTag}
        completedRounds={timer.completedFocusInCycle}
        totalRounds={settings.phases.roundsBeforeLongBreak}
        syncStatus={sync.status}
      />
    </div>
  )
}
