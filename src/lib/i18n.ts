export type Lang = 'de' | 'en'

export interface Messages {
  nav: { statistics: string; settings: string }
  update: { available: string; reload: string }
  errors: { saveFailed: string }
  phases: { focus: string; shortBreak: string; longBreak: string }
  paused: string
  timer: {
    flow: string
    start: string
    pause: string
  }
  flow: {
    finish: string
    discard: string
    finishedToast: (minutes: number) => string
  }
  shortcuts: { skip: string; reset: string }
  zen: { exitHint: string; enterHint: string }
  pip: { open: string; close: string }
  todo: {
    title: string
    tag: string
    add: string
    addPlaceholder: string
    noTag: string
    selectTag: string
    reopen: string
    done: string
    selectFocus: string
    unselectFocus: string
    edit: string
    delete: string
    save: string
    cancel: string
  }
  reflection: { title: string; prompt: string; placeholder: string; save: string; skip: string }
  dashboard: {
    streak: string
    weeklyGoal: string
    streakActive: string
    streakReset: string
    goalReached: (pct: number) => string
    last7Days: string
    focusMinutes: string
    byTag: string
    last52Weeks: string
    hourOfDay: string
    sessionsPerHour: string
    hourRange: (h: number) => string
    sessions: string
    amount: string
    sessionLog: string
    day: string
    days: string
    rangeWeek: string
    rangeMonth: string
    rangeAllTime: string
    avgDailyFocus: string
    avgDailyFocusSub: (minStr: string, activeDays: number) => string
    totalFocusTime: string
    totalFocusTimeSub: (hours: number, count: number) => string
    pomodoroVsFlow: string
    pomodoroRatio: (pomPct: number, flowPct: number) => string
    noDataPeriod: string
    focusTime: string
    periodOverview: string
    sessionsCsv: string
    sessionsCsvTitle: string
    sessionsJson: string
    sessionsJsonTitle: string
    todosCsv: string
    todosCsvTitle: string
    todosJson: string
    todosJsonTitle: string
  }
  sessionLog: {
    searchPlaceholder: string
    clearAll: string
    empty: string
    emptySub: string
    noResults: string
    noTask: string
    import: string
    export: string
    mdDownload: string
    copy: string
    copied: string
    csv: string
    json: string
    importFailed: string
  }
  settings: {
    colorMode: string
    colorModeHint: string
    dark: string
    light: string
    presets: string
    presetClassic: string
    presetDeepWork: string
    presetUltradian: string
    roundsUnit: string
    minUnit: string
    weeklyGoalHours: (hours: number) => string
    cycle: string
    cycleHint: string
    weeklyGoal: string
    weeklyGoalHint: string
    dailyGoal: string
    dailyGoalHint: string
    dailyGoalHours: (hours: number) => string
    tags: string
    tagsHint: string
    newTagPlaceholder: string
    addTag: string
    removeTag: (tag: string) => string
    noTagsYet: string
    tagAlreadyExists: string
    data: string
    dataHint: string
    confirmClear: string
    clearSessions: string
    backup: string
    language: string
    languageHint: string
  }
  sync: {
    hint: string
    notConfigured: string
    login: string
    logout: string
    syncing: string
    synced: string
    pending: string
    offline: string
    retry: string
    syncNow: string
    lastSync: (d: Date) => string
  }
  heatmap: { less: string; more: string; tooltip: (minutes: number, count: number, date: string) => string }
  notify: {
    focusDoneTitle: string
    focusDoneBody: (round: number) => string
    breakOverTitle: string
    breakOverBody: string
    pauseStart: string
    focusStart: string
    add5Min: string
  }
  weekdays: [string, string, string, string, string, string, string]
}

const de: Messages = {
  nav: { statistics: 'Statistik', settings: 'Einstellungen' },
  update: { available: 'Neue Version verfügbar', reload: 'Neu laden' },
  errors: { saveFailed: 'Speichern fehlgeschlagen – Speicher nicht verfügbar?' },
  phases: { focus: 'Fokus', shortBreak: 'Kurze Pause', longBreak: 'Lange Pause' },
  weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  paused: 'pausiert',
  timer: {
    flow: 'Flow',
    start: 'Start',
    pause: 'Pause',
  },
  flow: {
    finish: 'Flow beenden & speichern',
    discard: 'Verwerfen ohne Speichern',
    finishedToast: (minutes) => `Flow abgeschlossen! +${minutes} Min. Fokuszeit gespeichert`,
  },
  shortcuts: { skip: 'Skip', reset: 'Reset' },
  zen: {
    exitHint: 'Zen-Modus · Z oder Esc zum Beenden',
    enterHint: 'Zen-Modus aktivieren',
  },
  pip: { open: 'Mini-Player (PiP)', close: 'Mini-Player schließen' },
  todo: {
    title: 'To-Do',
    tag: 'Tag',
    add: 'Hinzufügen',
    addPlaceholder: 'Neue Aufgabe …',
    noTag: 'Ohne Tag',
    selectTag: 'Tag wählen',
    reopen: 'Wieder öffnen',
    done: 'Erledigt',
    selectFocus: 'Als aktive Aufgabe wählen',
    unselectFocus: 'Aktive Aufgabe abwählen',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    save: 'Speichern',
    cancel: 'Abbrechen',
  },
  reflection: {
    title: 'Micro-Reflection',
    prompt: 'Was hast du in dieser Session gelernt / erreicht?',
    placeholder: 'Kurz notieren (optional) …',
    save: 'Speichern',
    skip: 'Überspringen',
  },
  dashboard: {
    streak: 'Tages-Streak',
    weeklyGoal: 'Wochenziel',
    streakActive: 'Streak aktiv. Bleib im Flow.',
    streakReset: 'Morgen neu starten',
    goalReached: (pct) => `${pct}% erreicht`,
    last7Days: 'Letzte 7 Tage',
    focusMinutes: 'Fokuszeit in Minuten',
    byTag: 'Verteilung nach Tag',
    last52Weeks: 'Letzte 52 Wochen',
    hourOfDay: 'Tageszeit',
    sessionsPerHour: 'Abgeschlossene Sessions pro Stunde',
    hourRange: (h) => `${h}:00 – ${h + 1}:00 Uhr`,
    sessions: 'Sessions',
    amount: 'Anzahl',
    sessionLog: 'Session-Log',
    day: 'Tag',
    days: 'Tage',
    rangeWeek: 'Woche',
    rangeMonth: 'Monat',
    rangeAllTime: 'Gesamt',
    avgDailyFocus: 'Ø Täglicher Fokus',
    avgDailyFocusSub: (minStr, days) => `Ø ${minStr} / ${days === 1 ? 'aktiver Tag' : `${days} aktive Tage`}`,
    totalFocusTime: 'Gesamte Fokuszeit',
    totalFocusTimeSub: (hours, count) => `${hours.toLocaleString('de-DE')} Std. · ${count} ${count === 1 ? 'Session' : 'Sessions'}`,
    pomodoroVsFlow: 'Pomo // Flow',
    pomodoroRatio: (pom, flow) => `${pom}% Pomodoro · ${flow}% Flow`,
    noDataPeriod: 'Der Schreibtisch ist noch kalt. Starte deinen ersten Fokus-Block.',
    focusTime: 'Fokuszeit',
    periodOverview: 'Fokus-Übersicht',
    sessionsCsv: 'Sessions .csv',
    sessionsCsvTitle: 'Alle Sessions als CSV exportieren',
    sessionsJson: 'Sessions .json',
    sessionsJsonTitle: 'Alle Sessions als JSON exportieren',
    todosCsv: 'Todos .csv',
    todosCsvTitle: 'Alle Todos als CSV exportieren',
    todosJson: 'Todos .json',
    todosJsonTitle: 'Alle Todos als JSON exportieren',
  },
  sessionLog: {
    searchPlaceholder: 'Sessions durchsuchen (Name, Tag, Datum) …',
    clearAll: 'Alle löschen',
    empty: 'Noch keine Sessions aufgezeichnet',
    emptySub: 'Schließe deine erste Pomodoro- oder Flow-Session ab, um deine Historie zu sehen.',
    noResults: 'Keine Treffer.',
    noTask: 'Ohne Aufgabe',
    import: 'Import',
    export: 'Export',
    mdDownload: 'Markdown herunterladen (.md)',
    copy: 'In Zwischenablage kopieren',
    copied: 'Kopiert!',
    csv: 'CSV-Tabelle (.csv)',
    json: 'JSON-Rohdaten (.json)',
    importFailed: 'Import fehlgeschlagen: Die Datei ist kein gültiges Backup.',
  },
  settings: {
    colorMode: 'Farbmodus',
    colorModeHint: 'Wähle zwischen dunklem und hellem Erscheinungsbild.',
    dark: 'Dunkel',
    light: 'Hell',
    presets: 'Fokus-Rhythmen',
    presetClassic: 'Klassisch (25 / 5 min)',
    presetDeepWork: 'Deep Work (50 / 10 min)',
    presetUltradian: 'Ultradian (90 / 20 min)',
    roundsUnit: 'Runden',
    minUnit: 'min',
    weeklyGoalHours: (h) => `≈ ${h.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Std./Woche`,
    cycle: 'Zyklus',
    cycleHint: 'Nach wie vielen Fokus-Runden folgt eine lange Pause?',
    weeklyGoal: 'Wochenziel',
    weeklyGoalHint: 'Ziel-Fokuszeit pro Woche.',
    dailyGoal: 'Tagesziel',
    dailyGoalHint: 'Ziel-Fokuszeit pro Tag.',
    dailyGoalHours: (h) => `≈ ${h.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Std./Tag`,
    tags: 'Tags',
    tagsHint: 'Kategorien für die Aufgaben-Zuweisung.',
    newTagPlaceholder: 'Neuen Tag eingeben …',
    addTag: 'Tag hinzufügen',
    removeTag: (tag) => `Tag "${tag}" entfernen`,
    noTagsYet: 'Keine Tags vorhanden. Erstelle Kategorien für deine Fokus-Sessions.',
    tagAlreadyExists: 'Dieser Tag existiert bereits.',
    data: 'Daten & Backup',
    dataHint: 'Exportiere ein Komplett-Backup oder deine Daten als CSV/JSON. Das Löschen aller Sessions ist unwiderruflich.',
    confirmClear: 'Wirklich ALLE Sessions löschen?',
    clearSessions: 'Sessions löschen',
    backup: 'Komplett-Backup (.json)',
    language: 'Sprache',
    languageHint: 'Wähle deine bevorzugte Sprache für UI und Benachrichtigungen.',
  },
  sync: {
    hint: 'Spiegle deine Sessions und Aufgaben sicher über GitHub in die Cloud.',
    notConfigured:
      'Cloud-Sync ist nicht konfiguriert. Ergänze VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY – die App bleibt vollständig lokal.',
    login: 'Mit GitHub synchronisieren',
    logout: 'Abmelden',
    syncing: 'Synchronisiere …',
    synced: 'Synchronisiert',
    pending: 'Änderungen ausstehend',
    offline: 'Offline – lokal gespeichert',
    retry: 'Erneut versuchen',
    syncNow: 'Jetzt synchronisieren',
    lastSync: (d) =>
      `Zuletzt synchronisiert: ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
  },
  heatmap: {
    less: 'Weniger',
    more: 'Mehr',
    tooltip: (minutes, count, date) =>
      `${minutes} Min. Fokus · ${count} ${count === 1 ? 'Session' : 'Sessions'} am ${date}`,
  },
  notify: {
    focusDoneTitle: 'Fokus abgeschlossen',
    focusDoneBody: (round) => `Runde ${round} geschafft. Zeit für eine Pause.`,
    breakOverTitle: 'Pause vorbei',
    breakOverBody: 'Zurück an den Fokus.',
    pauseStart: 'Pause starten',
    focusStart: 'Fokus starten',
    add5Min: '+5 Min',
  },
}

const en: Messages = {
  nav: { statistics: 'Statistics', settings: 'Settings' },
  update: { available: 'New version available', reload: 'Reload' },
  errors: { saveFailed: 'Saving failed – storage unavailable?' },
  phases: { focus: 'Focus', shortBreak: 'Short Break', longBreak: 'Long Break' },
  weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  paused: 'paused',
  timer: {
    flow: 'Flow',
    start: 'Start',
    pause: 'Pause',
  },
  flow: {
    finish: 'Finish flow & save',
    discard: 'Discard without saving',
    finishedToast: (minutes) => `Flow complete! +${minutes} min focus saved`,
  },
  shortcuts: { skip: 'Skip', reset: 'Reset' },
  zen: {
    exitHint: 'Zen Mode · Press Z or Esc to exit',
    enterHint: 'Enter Zen Mode',
  },
  pip: { open: 'Mini-Player (PiP)', close: 'Close Mini-Player' },
  todo: {
    title: 'To-Do',
    tag: 'Tag',
    add: 'Add',
    addPlaceholder: 'Add task …',
    noTag: 'No tag',
    selectTag: 'Select tag',
    reopen: 'Reopen',
    done: 'Done',
    selectFocus: 'Select as active task',
    unselectFocus: 'Deselect active task',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
  },
  reflection: {
    title: 'Micro-Reflection',
    prompt: 'What did you learn / achieve in this session?',
    placeholder: 'Write a short note (optional) …',
    save: 'Save',
    skip: 'Skip',
  },
  dashboard: {
    streak: 'Daily streak',
    weeklyGoal: 'Weekly goal',
    streakActive: 'Momentum running. Keep the streak.',
    streakReset: 'Restarts tomorrow',
    goalReached: (pct) => `${pct}% reached`,
    last7Days: 'Last 7 days',
    focusMinutes: 'Focus minutes',
    byTag: 'Distribution by tag',
    last52Weeks: 'Last 52 weeks',
    hourOfDay: 'Time of day',
    sessionsPerHour: 'Completed sessions per hour',
    hourRange: (h) => `${h}:00 – ${h + 1}:00`,
    sessions: 'Sessions',
    amount: 'Count',
    sessionLog: 'Session log',
    day: 'day',
    days: 'days',
    rangeWeek: 'Week',
    rangeMonth: 'Month',
    rangeAllTime: 'All Time',
    avgDailyFocus: 'Ø Daily Focus',
    avgDailyFocusSub: (minStr, days) => `Ø ${minStr} / ${days === 1 ? 'active day' : `${days} active days`}`,
    totalFocusTime: 'Total Focus Time',
    totalFocusTimeSub: (hours, count) => `${hours} hrs · ${count} ${count === 1 ? 'session' : 'sessions'}`,
    pomodoroVsFlow: 'Pomo // Flow',
    pomodoroRatio: (pom, flow) => `${pom}% Pomodoro · ${flow}% Flow`,
    noDataPeriod: 'Quiet in here. Start your first focus block.',
    focusTime: 'Focus time',
    periodOverview: 'Focus Overview',
    sessionsCsv: 'Sessions .csv',
    sessionsCsvTitle: 'Export all sessions as CSV',
    sessionsJson: 'Sessions .json',
    sessionsJsonTitle: 'Export all sessions as JSON',
    todosCsv: 'Todos .csv',
    todosCsvTitle: 'Export all todos as CSV',
    todosJson: 'Todos .json',
    todosJsonTitle: 'Export all todos as JSON',
  },
  sessionLog: {
    searchPlaceholder: 'Search sessions (name, tag, date) …',
    clearAll: 'Delete all',
    empty: 'No sessions recorded yet',
    emptySub: 'Complete your first Pomodoro or Flow session to build your legacy.',
    noResults: 'No matches.',
    noTask: 'No task',
    import: 'Import',
    export: 'Export',
    mdDownload: 'Download Markdown (.md)',
    copy: 'Copy to clipboard',
    copied: 'Copied!',
    csv: 'CSV table (.csv)',
    json: 'JSON raw data (.json)',
    importFailed: 'Import failed: the file is not a valid backup.',
  },
  settings: {
    colorMode: 'Color Mode',
    colorModeHint: 'Choose between dark and light appearance.',
    dark: 'Dark',
    light: 'Light',
    presets: 'Focus Rhythms',
    presetClassic: 'Classic (25 / 5 min)',
    presetDeepWork: 'Deep Work (50 / 10 min)',
    presetUltradian: 'Ultradian (90 / 20 min)',
    roundsUnit: 'rounds',
    minUnit: 'min',
    weeklyGoalHours: (h) => `≈ ${h.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} hrs/week`,
    cycle: 'Cycle',
    cycleHint: 'After how many focus rounds follows a long break?',
    weeklyGoal: 'Weekly goal',
    weeklyGoalHint: 'Target focus time per week.',
    dailyGoal: 'Daily goal',
    dailyGoalHint: 'Target focus time per day.',
    dailyGoalHours: (h) => `≈ ${h.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} hrs/day`,
    tags: 'Tags',
    tagsHint: 'Categories for task assignment.',
    newTagPlaceholder: 'Enter new tag …',
    addTag: 'Add tag',
    removeTag: (tag) => `Remove tag "${tag}"`,
    noTagsYet: 'No tags yet. Create categories for your focus sessions.',
    tagAlreadyExists: 'This tag already exists.',
    data: 'Data & Backup',
    dataHint: 'Export a full backup or your data as CSV/JSON. Deleting all sessions is irreversible.',
    confirmClear: 'Really delete ALL sessions?',
    clearSessions: 'Delete sessions',
    backup: 'Full backup (.json)',
    language: 'Language',
    languageHint: 'Select your preferred language for the interface and notifications.',
  },
  sync: {
    hint: 'Mirror your sessions and tasks securely to the cloud via GitHub.',
    notConfigured:
      'Cloud sync is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY – the app keeps working fully local.',
    login: 'Sync with GitHub',
    logout: 'Log out',
    syncing: 'Syncing …',
    synced: 'Synced',
    pending: 'Changes pending',
    offline: 'Offline – saved locally',
    retry: 'Retry',
    syncNow: 'Sync now',
    lastSync: (d) =>
      `Last synced: ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
  },
  heatmap: {
    less: 'Less',
    more: 'More',
    tooltip: (minutes, count, date) =>
      `${minutes} min focus · ${count} ${count === 1 ? 'session' : 'sessions'} on ${date}`,
  },
  notify: {
    focusDoneTitle: 'Focus complete',
    focusDoneBody: (round) => `Round ${round} done. Time for a break.`,
    breakOverTitle: 'Break over',
    breakOverBody: 'Back to focus.',
    pauseStart: 'Start break',
    focusStart: 'Start focus',
    add5Min: '+5 Min',
  },
}

function createFallbackProxy<T extends object>(target: T, fallback: T): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const val = Reflect.get(obj, prop, receiver)
      const fbVal = Reflect.get(fallback as object, prop)
      if (val === undefined) {
        if (typeof fbVal === 'object' && fbVal !== null) {
          return createFallbackProxy(fbVal, fbVal)
        }
        return fbVal
      }
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        if (typeof fbVal === 'object' && fbVal !== null && !Array.isArray(fbVal)) {
          return createFallbackProxy(val, fbVal)
        }
      }
      return val
    },
  })
}

export const translations: Record<Lang, Messages> = {
  de: createFallbackProxy(de, de),
  en: createFallbackProxy(en, de),
}

const STORAGE_KEY = 'pomodoro.lang'

function isValidLang(l: unknown): l is Lang {
  return l === 'de' || l === 'en'
}

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isValidLang(saved)) return saved
  } catch {
    /* storage unavailable */
  }
  return typeof navigator !== 'undefined' &&
    typeof navigator.language === 'string' &&
    navigator.language.toLowerCase().startsWith('de')
    ? 'de'
    : 'en'
}

let currentLang: Lang = typeof window === 'undefined' ? 'de' : detectLang()
const listeners = new Set<() => void>()

export function getLang(): Lang {
  return currentLang
}

export function setLang(lang: Lang): void {
  if (!isValidLang(lang) || lang === currentLang) return
  currentLang = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((fn) => fn())
}

export function subscribeLang(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}