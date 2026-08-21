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
import { useMediaSession } from './hooks/useMediaSession'
import { addSession, updateSessionNotes } from './lib/db'
import { requestNotificationPermission } from './lib/notify'
import { initAudio } from './lib/sound'
import { STORAGE_KEYS, type PhaseId, type Session, type Settings, type TimerMode } from './types'
import type { Messages } from './lib/i18n'
import { Timer } from './components/Timer'
import { QuickStats } from './components/QuickStats'
import { DayTimeline } from './components/DayTimeline'
import { PipTimer, PipCanvas } from './components/PipTimer'
import { TodoList } from './components/TodoList'

const Dashboard = lazy(() => import('./components/Dashboard').then((m) => ({ default: m.Dashboard })))
const SettingsPanel = lazy(() => import('./components/Settings').then((m) => ({ default: m.SettingsPanel })))
const ReflectionModal = lazy(() => import('./components/ReflectionModal').then((m) => ({ default: m.ReflectionModal })))

type Tab = 'timer' | 'dashboard' | 'settings'

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

const GLOW_PHASES: { id: PhaseId; cssVar: string }[] = [
  { id: 'focus', cssVar: '--c-accent' },
  { id: 'shortBreak', cssVar: '--c-break' },
  { id: 'longBreak', cssVar: '--c-long' },
]

export default function App() {
  const { t } = useTranslation()
  const [themeId, setTheme] = useTheme()
  const [settings, updateSettings] = useSettings()
  const [tab, setTab] = useState<Tab>('timer')
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
      void addSession(session).then((id) => setPendingSessionId(id))
      showToast(t.flow.finishedToast(Math.max(1, Math.round(session.durationMs / 60_000))))
    },
    [showToast, t],
  )

  const flow = useFlowTimer({ task: sessionTask, tag: sessionTag, onFinish: handleFlowFinished })

  const handleFocusComplete = useCallback(
    (s: Omit<Session, 'id' | 'notes'>) => {
      void addSession(s).then((id) => setPendingSessionId(id))
      todosApi.incrementPomodoros(activeTodoId)
    },
    [activeTodoId, todosApi],
  )

  const handleSaveNote = useCallback(
    (notes: string) => {
      if (pendingSessionId != null) void updateSessionNotes(pendingSessionId, notes)
      setPendingSessionId(null)
    },
    [pendingSessionId],
  )

  const handleSkipNote = useCallback(() => setPendingSessionId(null), [])

  const timer = useTimer({
    settings,
    task: sessionTask,
    tag: sessionTag,
    onFocusComplete: handleFocusComplete,
  })

  const handleFlowFinish = useCallback(() => {
    if (mode === 'flow') flow.finishSession()
  }, [mode, flow])

  const handleFlowDiscard = useCallback(() => {
    flow.resetTimer()
  }, [flow])

  const handleToggle = useCallback(() => {
    void requestNotificationPermission()
    if (mode === 'flow') flow.toggle()
    else timer.toggle()
  }, [mode, flow, timer])

  const handleSkip = useCallback(() => {
    if (mode === 'flow') handleFlowFinish()
    else timer.skip()
  }, [mode, timer, handleFlowFinish])

  const handleReset = useCallback(() => {
    if (mode === 'flow') handleFlowDiscard()
    else timer.reset()
  }, [mode, timer, handleFlowDiscard])

  const handleModeChange = useCallback(
    (m: TimerMode) => {
      if (m === mode) return
      if (m === 'flow') {
        timer.reset()
      } else {
        flow.resetTimer()
      }
      setMode(m)
    },
    [mode, timer, flow, setMode],
  )

  const handleFocusTodo = useCallback(
    (id: string) => {
      setActiveTodoId((prev) => (prev === id ? null : id))
    },
    [],
  )

  useKeyboard({
    onToggle: handleToggle,
    onSkip: handleSkip,
    onReset: handleReset,
    onFlowFinish: handleFlowFinish,
  })

  const chromePhase = mode === 'flow' ? 'focus' : timer.phase
  const chromeStatus = mode === 'flow' ? flow.status : timer.status
  const chromeTime = mode === 'flow' ? flow.time : timer.time
  const chromeProgress = mode === 'flow' ? 0 : timer.progress
  const chromeRemaining = mode === 'flow' ? flow.elapsedMs : timer.remainingMs
  const isRunning = chromeStatus === 'running'
  useDocumentChrome(chromePhase, chromeStatus, chromeTime, chromeProgress, chromeRemaining)

  const modeTitle = mode === 'flow' ? t.timer.flow : timer.phaseLabel
  useMediaSession({
    isRunning,
    formattedTime: chromeTime,
    modeTitle,
    activeTask: sessionTask,
    activeTag: sessionTag,
    onPlay: handleToggle,
    onPause: handleToggle,
    onSkip: handleSkip,
    onReset: handleReset,
  })

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

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl 2xl:max-w-6xl flex-col items-center gap-8 2xl:gap-10 px-4 py-8">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgb(var(--c-fg) / 0.07) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className={`absolute left-1/2 top-[35%] h-[64rem] w-[64rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${
            isRunning ? 'ambient-breath' : ''
          }`}
          style={isRunning ? undefined : { opacity: 0.12 }}
        >
          {GLOW_PHASES.map((g) => (
            <div
              key={g.id}
              className="ambient-glow-layer absolute inset-0 rounded-full"
              style={{
                opacity: chromePhase === g.id ? 1 : 0,
                background: `radial-gradient(circle at center, rgb(var(${g.cssVar}) / 0.55) 0%, transparent 62%)`,
              }}
            />
          ))}
        </div>
      </div>
      <header className="flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
            <TimerIcon className="text-accent" size={22} />
          </div>
          <h1 className="text-lg font-bold text-fg">Pomau</h1>
        </div>

        <nav
          className={`flex items-center gap-1 rounded-2xl border border-line bg-surface p-1 transition-opacity duration-500 ${
            zenRunning ? 'opacity-20 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'
          }`}
        >
          {TABS.map((tb) => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                tab === tb.id ? 'bg-raised text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {tb.icon}
              <span className="hidden sm:inline">{t.nav[TAB_LABEL_KEYS[tb.id]]}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="flex w-full flex-1 flex-col items-center gap-8 2xl:gap-10 pb-8">
        {tab === 'timer' && (settings.layoutMode === 'single' ? (
          <div className="mx-auto flex w-full max-w-xl 2xl:max-w-2xl flex-col items-center gap-8 2xl:gap-10">
            <Timer
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
              onModeChange={handleModeChange}
              onToggle={handleToggle}
              onSkip={handleSkip}
              onReset={handleReset}
              pipSupported={pipSupported}
              pipOpen={pipMode !== 'none'}
              onPipToggle={handlePipToggle}
            />
            <TodoList
              todos={todosApi.todos}
              tags={settings.tags}
              activeTodoId={activeTodoId}
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
          <div className="mx-auto grid w-full max-w-5xl 2xl:max-w-6xl grid-cols-1 items-start justify-items-center gap-8 2xl:gap-10 lg:grid-cols-2">
            <Timer
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
              onModeChange={handleModeChange}
              onToggle={handleToggle}
              onSkip={handleSkip}
              onReset={handleReset}
              pipSupported={pipSupported}
              pipOpen={pipMode !== 'none'}
              onPipToggle={handlePipToggle}
            />
            <div className="flex w-full max-w-md 2xl:max-w-lg flex-col gap-8 2xl:gap-10">
              <TodoList
                todos={todosApi.todos}
                tags={settings.tags}
                activeTodoId={activeTodoId}
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
        ))}
        {tab === 'dashboard' && (
          <Suspense fallback={<div className="flex h-64 w-full items-center justify-center text-sm text-muted animate-pulse">Laden...</div>}>
            <Dashboard
              sessions={sessions}
              settings={settings}
              themeId={themeId}
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
              onThemeChange={setTheme}
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
              onSyncNow={() => void sync.sync(true)}
            />
          </Suspense>
        )}
      </main>

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

      <canvas ref={canvasRef} width={480} height={320} className="hidden" aria-hidden="true" />
      <video ref={videoRef} className="hidden" aria-hidden="true" muted playsInline />
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
    </div>
  )
}