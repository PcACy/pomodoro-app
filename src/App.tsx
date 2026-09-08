import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { BarChart3, PictureInPicture2, Settings as SettingsIcon } from 'lucide-react'
import { useSettings } from './hooks/useSettings'
import { useLocalState } from './hooks/useLocalState'
import { useSessions } from './hooks/useSessions'
import { useTimer } from './hooks/useTimer'
import { useFlowTimer } from './hooks/useFlowTimer'
import { useKeyboard } from './hooks/useKeyboard'
import { DocumentChrome } from './hooks/useDocumentChrome'
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
import { playMicroClick } from './lib/sound'
import { STORAGE_KEYS, type Session, type Settings, type TimerMode } from './types'
import { Timer } from './components/Timer'
import { PipTimer, PipCanvas } from './components/PipTimer'
import { CatLogo } from './components/CatLogo'
import { ThemeStatusBar } from './components/ThemeStatusBar'
import { ThemeBackground } from './components/ThemeBackground'
import { BentoCockpit } from './components/cockpit/BentoCockpit'
import { TodoManagerModal } from './components/cockpit/TodoManagerModal'
import { AnalyticsModal } from './components/cockpit/AnalyticsModal'
import { SettingsModal } from './components/cockpit/SettingsModal'

const ReflectionModal = lazy(() => import('./components/ReflectionModal').then((m) => ({ default: m.ReflectionModal })))

export default function App() {
  const { t } = useTranslation()
  const [themeId, colorMode, setColorMode] = useTheme()
  const [settings, updateSettings] = useSettings()
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false)
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
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
    document.documentElement.dataset.accent = settings.accentColor || 'red'
  }, [settings.accentColor])

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

  const handleToggleZen = useCallback(() => {
    setIsZenMode((prev) => !prev)
  }, [])

  const handleExitZen = useCallback(() => {
    setIsZenMode(false)
  }, [])

  const isModalOpen =
    isSettingsModalOpen || isAnalyticsModalOpen || isTodoModalOpen || pendingSessionId != null

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
  const { pipWindow, isSupported: pipSupported, open: openPip, close: closePip, mode: pipMode, canvasRef, videoRef } =
    usePictureInPicture()

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
    <div className="min-h-screen min-h-[100dvh] flex flex-col justify-between py-4 px-3 sm:px-6 lg:px-8 max-w-7xl 2xl:max-w-[1440px] mx-auto relative w-full">
      {/* Dynamic Document Title & Favicon Manager (Isolated from App re-renders) */}
      <DocumentChrome phase={chromePhase} status={chromeStatus} mode={mode} />

      {/* Screen Reader Live Region for WCAG 2.1 AA Announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>

      {/* Theme-Specific High-End Atmosphere Background */}
      <ThemeBackground colorMode={colorMode} />

      <header className="flex w-full items-center justify-between gap-4 py-2 px-1">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-fg transition-colors">
            <CatLogo
              className="text-fg"
              size={20}
              state={isRunning ? chromePhase : 'idle'}
            />
          </div>
          <div className="flex items-center gap-2 font-mono">
            <h1 className="text-sm font-bold tracking-widest uppercase text-fg">Pomau</h1>
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                isRunning ? 'bg-accent animate-pulse' : 'bg-muted/40'
              }`}
            />
            <span className="hidden sm:inline text-[10px] text-muted tracking-widest uppercase">
              // COCKPIT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Picture-in-Picture Button */}
          {pipSupported && (
            <button
              type="button"
              onClick={handlePipToggle}
              title={pipMode !== 'none' ? 'Close PiP' : 'Picture-in-Picture'}
              aria-label="Picture-in-Picture"
              className={`flex items-center justify-center h-8 w-8 rounded-full border transition-colors cursor-pointer ${
                pipMode !== 'none'
                  ? 'border-accent bg-surface-raised text-accent'
                  : 'border-line bg-surface hover:border-fg/40 text-muted hover:text-fg'
              }`}
            >
              <PictureInPicture2 size={14} />
            </button>
          )}

          {/* Analytics Modal Trigger */}
          <button
            type="button"
            onClick={() => {
              playMicroClick('tab')
              setIsAnalyticsModalOpen(true)
            }}
            title={t.nav.statistics}
            aria-label={t.nav.statistics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-surface hover:border-fg/40 text-muted hover:text-fg uppercase tracking-wider transition-colors cursor-pointer text-[11px]"
          >
            <BarChart3 size={13} />
            <span className="hidden md:inline">{t.nav.statistics}</span>
          </button>

          {/* Settings Modal Trigger */}
          <button
            type="button"
            onClick={() => {
              playMicroClick('tab')
              setIsSettingsModalOpen(true)
            }}
            title={t.nav.settings}
            aria-label={t.nav.settings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-surface hover:border-fg/40 text-muted hover:text-fg uppercase tracking-wider transition-colors cursor-pointer text-[11px]"
          >
            <SettingsIcon size={13} />
            <span className="hidden md:inline">{t.nav.settings}</span>
          </button>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col items-center justify-center gap-6 py-2 sm:py-4 pb-20 sm:pb-24">
        {!isZenMode && (
          <BentoCockpit
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
            onOpenTodoManager={() => setIsTodoModalOpen(true)}
            sessions={sessions}
            settings={settings}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            onOpenAnalyticsModal={() => setIsAnalyticsModalOpen(true)}
            isZenMode={isZenMode}
            onToggleZen={handleToggleZen}
          />
        )}
      </main>

      {/* Immersive Borderless Zen Mode Overlay */}
      {isZenMode && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas select-none overflow-hidden animate-fade-in">
          {/* Theme-Specific Atmosphere Background */}
          <ThemeBackground colorMode={colorMode} />

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
              pipSupported={false}
              pipOpen={pipMode !== 'none'}
              onPipToggle={handlePipToggle}
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
          className="animate-fade-in fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-line bg-surface px-4 py-2 font-mono text-xs text-fg select-none"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="tracking-wide">{toast.message}</span>
        </div>
      )}

      <PipTimer
        mode={pipMode}
        pipWindow={pipWindow}
        phase={chromePhase}
        phaseLabel={mode === 'flow' ? 'Flow' : timer.phaseLabel}
        status={chromeStatus}
        isFlow={mode === 'flow'}
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
        isFlow={mode === 'flow'}
        enabled={pipMode === 'video'}
      />

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
        onRemove={todosApi.remove}
        onFocus={handleFocusTodo}
      />

      <AnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => setIsAnalyticsModalOpen(false)}
        sessions={sessions}
        settings={settings}
        themeId={themeId}
        colorMode={colorMode}
        todos={todosApi.todos}
        onImportSettings={handleImportSettings}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        update={updateSettings}
        colorMode={colorMode}
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

      {/* Theme-specific Dynamic Status Bar */}
      <ThemeStatusBar
        colorMode={colorMode}
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
