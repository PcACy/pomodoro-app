import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { BarChart3, Check, Settings as SettingsIcon, Timer as TimerIcon } from 'lucide-react'
import { useSettings } from './hooks/useSettings'
import { useLocalState } from './hooks/useLocalState'
import { useSessions } from './hooks/useSessions'
import { useTimer } from './hooks/useTimer'
import { useFlowTimer } from './hooks/useFlowTimer'
import { useKeyboard } from './hooks/useKeyboard'
import { useDocumentChrome } from './hooks/useDocumentChrome'
import { useTheme } from './hooks/useTheme'
import { useServiceWorker } from './hooks/useServiceWorker'
import { usePictureInPicture } from './hooks/usePictureInPicture'
import { useWakeLock } from './hooks/useWakeLock'
import { useNotificationActions } from './hooks/useNotificationActions'
import { useTodos } from './hooks/useTodos'
import { useAuth } from './hooks/useAuth'
import { useSync } from './hooks/useSync'
import { useTranslation } from './hooks/useTranslation'
import { addSession, updateSessionNotes } from './lib/db'
import { requestNotificationPermission } from './lib/notify'
import { initAudio, playMicroClick } from './lib/sound'
import { STORAGE_KEYS, type Session, type Settings, type TimerMode } from './types'
import type { Messages } from './lib/i18n'
import { Timer } from './components/Timer'
import { QuickStats } from './components/QuickStats'
import { DayTimeline } from './components/DayTimeline'
import { PipTimer, PipCanvas } from './components/PipTimer'
import { TodoList } from './components/TodoList'
import { CatLogo } from './components/CatLogo'
import { ThemeStatusBar } from './components/ThemeStatusBar'
import { ThemeBackground } from './components/ThemeBackground'

const Dashboard = lazy(() => import('./components/Dashboard').then((m) => ({ default: m.Dashboard })))
const SettingsPanel = lazy(() => import('./components/Settings').then((m) => ({ default: m.SettingsPanel })))
const ReflectionModal = lazy(() => import('./components/ReflectionModal').then((m) => ({ default: m.ReflectionModal })))

type Tab = 'timer' | 'dashboard' | 'settings'

// Module-scope constant: recreating these icon elements on every render
// (including every 250ms timer tick) is wasted allocation work.
const TABS: { id: Tab; icon: React.ReactNode }[] = [
  { id: 'timer', icon: <TimerIcon size={16} /> },
  { id: 'dashboard', icon: <BarChart3 size={16} /> },
  { id: 'settings', icon: <SettingsIcon size={16} /> },
]

const TAB_LABEL_KEYS: Record<Tab, keyof Messages['nav']> = {
  timer: 'timer',
  dashboard: 'statistics',
  settings: 'settings',
}

export default function App() {
  const { t } = useTranslation()
  const [themeId, setTheme, colorMode, setColorMode] = useTheme()
  const [settings, updateSettings] = useSettings()
  const [tab, setTab] = useState<Tab>('timer')
  const [isZenMode, setIsZenMode] = useState(false)
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null)
  const [mode, setMode] = useLocalState<TimerMode>(STORAGE_KEYS.mode, 'pomodoro')
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
    if (!isZenMode) {
      setIsMouseActive(true)
      return
    }
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
      incrementPomodoros(activeTodoId)
    },
    [activeTodoId, incrementPomodoros, showToast, t],
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

  const handleTabChange = useCallback((nextTab: Tab) => {
    playMicroClick('tab')
    setIsZenMode(false)
    setTab(nextTab)
  }, [])

  const handleToggleZen = useCallback(() => {
    setIsZenMode((prev) => {
      const next = !prev
      if (next && tab !== 'timer') setTab('timer')
      return next
    })
  }, [tab])

  const handleExitZen = useCallback(() => {
    setIsZenMode(false)
  }, [])

  useKeyboard({
    onToggle: handleToggle,
    onSkip: handleSkip,
    onReset: handleReset,
    onFlowFinish: handleFlowFinish,
    onToggleZen: handleToggleZen,
    onExitZen: isZenMode ? handleExitZen : undefined,
  })

  const chromePhase = mode === 'flow' ? 'focus' : timer.phase
  const chromeStatus = mode === 'flow' ? flow.status : timer.status
  const chromeTime = mode === 'flow' ? flow.time : timer.time
  const chromeProgress = mode === 'flow' ? 0 : timer.progress
  const chromeRemaining = mode === 'flow' ? flow.elapsedMs : timer.remainingMs
  const isRunning = chromeStatus === 'running'
  useDocumentChrome(chromePhase, chromeStatus, chromeTime, chromeProgress, chromeRemaining)

  const { updateAvailable, reload } = useServiceWorker()
  const { pipWindow, isSupported: pipSupported, open: openPip, close: closePip, mode: pipMode, canvasRef, videoRef } =
    usePictureInPicture()
  const zenRunning = tab === 'timer' && chromeStatus === 'running'

  useWakeLock(chromeStatus === 'running')

  // Unlock the AudioContext on the first user gesture (autoplay policy).
  useEffect(() => {
    const unlock = () => initAudio()
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  useNotificationActions({
    onStartPhase: () => {
      if (mode === 'flow') {
        if (flow.status !== 'running') flow.toggle()
      } else if (timer.status !== 'running') {
        timer.toggle()
      }
    },
    onAddTime: () => {
      if (mode !== 'flow') timer.addTime(5 * 60_000)
    },
  })

  const handleImportSettings = useCallback((s: unknown) => {
    if (s && typeof s === 'object') updateSettings(() => s as Settings)
  }, [updateSettings])

  const handlePipToggle = useCallback(() => {
    if (pipMode !== 'none') closePip()
    else void openPip()
  }, [pipMode, closePip, openPip])

  const syncNow = sync.sync
  const handleSyncNow = useCallback(() => void syncNow(true), [syncNow])

  const [liveAnnouncement, setLiveAnnouncement] = useState('')
  const prevPhaseRef = useRef(timer.phase)
  const prevStatusRef = useRef(timer.status)

  useEffect(() => {
    if (prevPhaseRef.current !== timer.phase) {
      prevPhaseRef.current = timer.phase
      const phaseName = t.phases[timer.phase]
      const durationMins = Math.round(timer.totalMs / 60_000)
      setLiveAnnouncement(`${phaseName} gestartet (${durationMins} Minuten).`)
    } else if (prevStatusRef.current !== timer.status) {
      prevStatusRef.current = timer.status
      if (timer.status === 'paused') setLiveAnnouncement(`${t.phases[timer.phase]} pausiert.`)
      else if (timer.status === 'running') setLiveAnnouncement(`${t.phases[timer.phase]} fortgesetzt.`)
    }
  }, [timer.phase, timer.status, timer.totalMs, t.phases])

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-5xl 2xl:max-w-6xl flex-col items-center gap-8 2xl:gap-10 px-4 py-8">
      {/* Screen Reader Live Region for WCAG 2.1 AA Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Theme-Specific High-End Atmosphere Background */}
      <ThemeBackground
        themeId={themeId}
        colorMode={colorMode}
        phase={chromePhase}
        isRunning={isRunning}
      />

      <header className="flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-btn border border-accent/20 bg-accent/10 text-accent shadow-sm transition-all hover:scale-105 active:scale-95">
            <CatLogo
              className="text-accent"
              size={22}
              state={isRunning ? chromePhase : 'idle'}
            />
          </div>
          <h1 className="text-lg font-bold text-fg">Pomau</h1>
        </div>

        <nav
          role="tablist"
          aria-label="Navigation"
          className={`nav-track relative grid grid-cols-3 items-center gap-1 select-none rounded-btn border border-line/70 bg-surface/80 p-1 backdrop-blur-md transition-opacity duration-500 ${
            zenRunning ? 'opacity-20 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'
          }`}
        >
          {/* Sliding Pill Indicator */}
          <div
            className="pointer-events-none absolute bottom-1 top-1 rounded-[calc(var(--radius-btn)-4px)] bg-raised shadow-sm ios-nav-active transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
            style={{
              width: 'calc((100% - 8px - 8px) / 3)',
              left: '4px',
              transform: `translateX(calc(${TABS.findIndex((tb) => tb.id === tab)} * (100% + 4px)))`,
            }}
          />
          {TABS.map((tb) => (
            <button
              key={tb.id}
              type="button"
              role="tab"
              aria-selected={tab === tb.id}
              aria-label={t.nav[TAB_LABEL_KEYS[tb.id]]}
              onClick={() => handleTabChange(tb.id)}
              className={`relative z-10 flex min-h-[40px] sm:min-h-[42px] items-center justify-center gap-2 rounded-[calc(var(--radius-btn)-4px)] px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors duration-200 active:scale-[0.98] cursor-pointer ${
                tab === tb.id ? 'text-fg font-semibold' : 'text-muted hover:text-fg'
              }`}
            >
              {tb.icon}
              <span className="hidden sm:inline">{t.nav[TAB_LABEL_KEYS[tb.id]]}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="flex w-full flex-1 flex-col items-center gap-4 sm:gap-6 pb-6">
        <div key={tab} className="animate-tab-enter flex w-full flex-col items-center">
          {tab === 'timer' && (
            settings.layoutMode === 'single' ? (
              <div className="mx-auto flex w-full max-w-xl 2xl:max-w-2xl flex-col items-center gap-4 sm:gap-6">
                <Timer
                  themeId={themeId}
                  large
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
                  pipSupported={pipSupported}
                  pipOpen={pipMode !== 'none'}
                  onPipToggle={handlePipToggle}
                  isZenMode={isZenMode}
                  onToggleZen={handleToggleZen}
                />
                <TodoList
                  themeId={themeId}
                  todos={todosApi.todos}
                  tags={settings.tags}
                  activeTodoId={activeTodoId}
                  timerRunning={isRunning}
                  onAdd={todosApi.add}
                  onToggle={todosApi.toggle}
                  onEdit={todosApi.edit}
                  onRemove={todosApi.remove}
                  onFocus={handleFocusTodo}
                />
                <QuickStats sessions={sessions} settings={settings} />
                <DayTimeline sessions={sessions} />
              </div>
            ) : (
              <div className="mx-auto grid w-full max-w-5xl 2xl:max-w-6xl grid-cols-1 items-start justify-items-center gap-4 sm:gap-6 lg:grid-cols-2">
                <Timer
                  themeId={themeId}
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
                  pipSupported={pipSupported}
                  pipOpen={pipMode !== 'none'}
                  onPipToggle={handlePipToggle}
                  isZenMode={isZenMode}
                  onToggleZen={handleToggleZen}
                />
                <div className="flex w-full max-w-md 2xl:max-w-lg flex-col gap-4 sm:gap-6">
                  <TodoList
                    themeId={themeId}
                    todos={todosApi.todos}
                    tags={settings.tags}
                    activeTodoId={activeTodoId}
                    timerRunning={isRunning}
                    onAdd={todosApi.add}
                    onToggle={todosApi.toggle}
                    onEdit={todosApi.edit}
                    onRemove={todosApi.remove}
                    onFocus={handleFocusTodo}
                  />
                  <QuickStats sessions={sessions} settings={settings} />
                </div>
                <div className="col-span-full w-full">
                  <DayTimeline sessions={sessions} />
                </div>
              </div>
            )
          )}
          {tab === 'dashboard' && (
            <Suspense fallback={<div className="flex h-64 w-full items-center justify-center text-sm text-muted animate-pulse">Laden...</div>}>
              <Dashboard
                sessions={sessions}
                settings={settings}
                themeId={themeId}
                colorMode={colorMode}
                todos={todosApi.todos}
                onImportSettings={handleImportSettings}
              />
            </Suspense>
          )}
          {tab === 'settings' && (
            <Suspense fallback={<div className="flex h-64 w-full items-center justify-center text-sm text-muted animate-pulse">Laden...</div>}>
              <SettingsPanel
                settings={settings}
                update={updateSettings}
                themeId={themeId}
                colorMode={colorMode}
                onThemeChange={setTheme}
                onColorModeChange={setColorMode}
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
            </Suspense>
          )}
        </div>
      </main>

      {/* Immersive Borderless Zen Mode Overlay */}
      {isZenMode && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas select-none overflow-hidden animate-fade-in">
          {/* Theme-Specific Atmosphere Background */}
          <ThemeBackground
            themeId={themeId}
            colorMode={colorMode}
            phase={chromePhase}
            isRunning={isRunning}
          />

          {/* Floating Minimalist Top Exit Badge (auto-fades on idle during focus) */}
          <div
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${
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
              className="group flex items-center gap-2.5 rounded-full border border-line/70 bg-surface/75 px-4 py-1.5 text-xs font-medium text-muted shadow-lg backdrop-blur-md transition-all hover:border-accent/40 hover:bg-surface hover:text-fg active:scale-95"
            >
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span>{t.zen.exitHint}</span>
              <kbd className="kbd text-[10px]">Esc</kbd>
            </button>
          </div>

          {/* Heroic Borderless Timer */}
          <div className="relative z-10 flex flex-col items-center justify-center p-4">
            <Timer
              themeId={themeId}
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
              pipSupported={pipSupported}
              pipOpen={pipMode !== 'none'}
              onPipToggle={handlePipToggle}
              isZenMode={isZenMode}
              onToggleZen={handleToggleZen}
            />
          </div>
        </div>
      )}

      {updateAvailable && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm shadow-lg">
          <span className="text-fg">{t.update.available}</span>
          <button type="button" className="btn-primary px-3 py-1.5" onClick={reload}>
            {t.update.reload}
          </button>
        </div>
      )}

      {toast && (
        <div
          key={toast.id}
          role="status"
          className="animate-fade-in fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-accent/40 bg-surface px-4 py-3 text-sm text-fg shadow-lg"
        >
          <Check size={16} className="shrink-0 text-accent" />
          <span>{toast.message}</span>
        </div>
      )}

      <PipTimer
        mode={pipMode}
        pipWindow={pipWindow}
        phase={chromePhase}
        phaseLabel={mode === 'flow' ? 'Flow' : timer.phaseLabel}
        status={chromeStatus}
        time={chromeTime}
        activeTodo={sessionTask}
        onToggle={handleToggle}
        onSkip={handleSkip}
      />

      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none opacity-0" aria-hidden="true">
        <canvas ref={canvasRef} width={480} height={320} style={{ width: 240, height: 160 }} />
        <video ref={videoRef} muted playsInline autoPlay style={{ width: 240, height: 160 }} />
      </div>
      <PipCanvas
        canvasRef={canvasRef}
        phaseLabel={mode === 'flow' ? 'Flow' : timer.phaseLabel}
        status={chromeStatus}
        time={chromeTime}
        enabled={pipMode === 'video'}
      />

      {pendingSessionId != null && (
        <Suspense fallback={null}>
          <ReflectionModal onSave={handleSaveNote} onSkip={handleSkipNote} />
        </Suspense>
      )}

      {/* Theme-specific Dynamic Status Bar */}
      <ThemeStatusBar
        themeId={themeId}
        colorMode={colorMode}
        mode={mode}
        phase={chromePhase}
        status={chromeStatus}
        time={chromeTime}
        progress={mode === 'flow' ? 1 : timer.progress}
        task={sessionTask}
        tag={sessionTag}
        completedRounds={timer.completedFocusInCycle}
        totalRounds={settings.phases.roundsBeforeLongBreak}
        syncStatus={sync.status}
      />
    </div>
  )
}