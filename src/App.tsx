import { useCallback, useState } from 'react'
import { BarChart3, Settings as SettingsIcon, Timer as TimerIcon } from 'lucide-react'
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
import { useTodos } from './hooks/useTodos'
import { addSession, updateSessionNotes } from './lib/db'
import { requestNotificationPermission } from './lib/notify'
import { todayMinutes } from './lib/stats'
import { fmtDuration } from './lib/time'
import { STORAGE_KEYS, type Session, type Settings, type TimerMode } from './types'
import { Timer } from './components/Timer'
import { Dashboard } from './components/Dashboard'
import { SettingsPanel } from './components/Settings'
import { PipTimer } from './components/PipTimer'
import { ReflectionModal } from './components/ReflectionModal'
import { TodoList } from './components/TodoList'

type Tab = 'timer' | 'dashboard' | 'settings'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'timer', label: 'Timer', icon: <TimerIcon size={16} /> },
  { id: 'dashboard', label: 'Statistik', icon: <BarChart3 size={16} /> },
  { id: 'settings', label: 'Einstellungen', icon: <SettingsIcon size={16} /> },
]

export default function App() {
  const [themeId, setTheme] = useTheme()
  const [settings, updateSettings] = useSettings()
  const [task, setTask] = useLocalState(STORAGE_KEYS.task, '')
  const [tag, setTag] = useLocalState(STORAGE_KEYS.tag, '')
  const [tab, setTab] = useState<Tab>('timer')
  const [pendingSessionId, setPendingSessionId] = useState<number | null>(null)
  const [mode, setMode] = useLocalState<TimerMode>(STORAGE_KEYS.mode, 'pomodoro')
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null)
  const sessions = useSessions()
  const todosApi = useTodos()
  const flow = useFlowTimer()

  const handleFocusComplete = useCallback(
    (s: Session) => {
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

  const timer = useTimer({ settings, task, tag, onFocusComplete: handleFocusComplete })

  const handleFlowStop = useCallback(() => {
    const data = flow.stop()
    if (data && data.elapsedMs >= 1000) {
      void addSession({
        start: data.start,
        end: data.end,
        durationMs: data.elapsedMs,
        task,
        tag,
      })
    }
  }, [flow, task, tag])

  const handleToggle = useCallback(() => {
    void requestNotificationPermission()
    if (mode === 'flow') flow.toggle()
    else timer.toggle()
  }, [mode, flow, timer])

  const handleSkip = useCallback(() => {
    if (mode === 'flow') handleFlowStop()
    else timer.skip()
  }, [mode, flow, timer, handleFlowStop])

  const handleReset = useCallback(() => {
    if (mode === 'flow') flow.reset()
    else timer.reset()
  }, [mode, flow, timer])

  const handleModeChange = useCallback(
    (m: TimerMode) => {
      if (m === mode) return
      if (m === 'flow') {
        timer.reset()
      } else {
        handleFlowStop()
      }
      setMode(m)
    },
    [mode, timer, handleFlowStop, setMode],
  )

  const handleFocusTodo = useCallback(
    (id: string) => {
      const t = todosApi.todos.find((x) => x.id === id)
      if (!t) return
      setActiveTodoId(id)
      setTask(t.title)
      setTag(t.tag)
    },
    [todosApi.todos, setTask, setTag],
  )

  useKeyboard({ onToggle: handleToggle, onSkip: handleSkip, onReset: handleReset })

  const chromePhase = mode === 'flow' ? 'focus' : timer.phase
  const chromeStatus = mode === 'flow' ? flow.status : timer.status
  const chromeTime = mode === 'flow' ? flow.time : timer.time
  const chromeProgress = mode === 'flow' ? 0 : timer.progress
  const chromeRemaining = mode === 'flow' ? flow.elapsedMs : timer.remainingMs
  useDocumentChrome(chromePhase, chromeStatus, chromeTime, chromeProgress, chromeRemaining)

  const { updateAvailable, reload } = useServiceWorker()
  const { pipWindow, isSupported: pipSupported, open: openPip, close: closePip } = usePictureInPicture()
  const zenRunning = tab === 'timer' && chromeStatus === 'running'

  const handleImportSettings = (s: unknown) => {
    if (s && typeof s === 'object') updateSettings(() => s as Settings)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center gap-8 px-4 py-8">
      <header className="flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
            <TimerIcon className="text-accent" size={22} />
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-bold text-fg">Pomodoro</h1>
            <p className="text-xs text-muted">Heute: {fmtDuration(todayMinutes(sessions) * 60_000)}</p>
          </div>
        </div>

        <nav
          className={`flex items-center gap-1 rounded-2xl border border-line bg-surface p-1 transition-opacity duration-500 ${
            zenRunning ? 'opacity-20 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'
          }`}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-raised text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className="flex w-full flex-1 flex-col items-center gap-8 pb-8">
        {tab === 'timer' && (
          <div className="flex w-full max-w-md flex-col gap-8">
            <Timer
              phase={timer.phase}
              phaseLabel={timer.phaseLabel}
              status={timer.status}
              time={timer.time}
              progress={timer.progress}
              completedFocusInCycle={timer.completedFocusInCycle}
              roundsBeforeLongBreak={timer.roundsBeforeLongBreak}
              task={task}
              tag={tag}
              tags={settings.tags}
              mode={mode}
              flowStatus={flow.status}
              flowTime={flow.time}
              onModeChange={handleModeChange}
              onTaskChange={setTask}
              onTagChange={setTag}
              onToggle={handleToggle}
              onSkip={handleSkip}
              onReset={handleReset}
              pipSupported={pipSupported}
              pipOpen={pipWindow != null}
              onPipToggle={() => {
                if (pipWindow) closePip()
                else void openPip()
              }}
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
          </div>
        )}
        {tab === 'dashboard' && (
          <Dashboard
            sessions={sessions}
            settings={settings}
            themeId={themeId}
            todos={todosApi.todos}
            onImportSettings={handleImportSettings}
          />
        )}
        {tab === 'settings' && (
          <SettingsPanel
            settings={settings}
            update={updateSettings}
            themeId={themeId}
            onThemeChange={setTheme}
          />
        )}
      </main>

      {updateAvailable && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm shadow-lg">
          <span className="text-fg">Neue Version verfügbar</span>
          <button type="button" className="btn-primary px-3 py-1.5" onClick={reload}>
            Neu laden
          </button>
        </div>
      )}

      <PipTimer
        pipWindow={pipWindow}
        phase={chromePhase}
        phaseLabel={mode === 'flow' ? 'Flow' : timer.phaseLabel}
        status={chromeStatus}
        time={chromeTime}
        onToggle={handleToggle}
        onSkip={handleSkip}
      />

      {pendingSessionId != null && (
        <ReflectionModal onSave={handleSaveNote} onSkip={handleSkipNote} />
      )}
    </div>
  )
}