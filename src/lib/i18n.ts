export type Lang = 'de' | 'en'

export interface Messages {
  nav: { timer: string; statistics: string; settings: string }
  update: { available: string; reload: string }
  phases: { focus: string; shortBreak: string; longBreak: string }
  paused: string
  timer: {
    pomodoro: string
    flow: string
    taskPlaceholder: string
    start: string
    pause: string
    stop: string
    rounds: (done: number, total: number) => string
    status: { running: string; paused: string; ready: string }
  }
  flow: {
    finish: string
    finishShortcut: string
    discard: string
    discardShortcut: string
    finishedToast: (minutes: number) => string
  }
  shortcuts: { startPause: string; skip: string; reset: string; zen: string }
  zen: { mode: string; exitHint: string; enterHint: string }
  pip: { open: string; close: string }
  todo: {
    title: string
    tag: string
    add: string
    doneCount: (done: number, total: number) => string
    addPlaceholder: string
    empty: string
    reopen: string
    done: string
    selectFocus: string
    unselectFocus: string
    edit: string
    delete: string
    save: string
    cancel: string
  }
  timeline: {
    title: string
    noSessions: string
    now: string
    todayProgress: (count: number, minutes: number) => string
  }
  reflection: { title: string; prompt: string; placeholder: string; save: string; skip: string }
  dashboard: {
    today: string
    todayFocus: string
    dailyGoal: string
    pomodorosToday: string
    streak: string
    weeklyGoal: string
    noDataToday: string
    streakActive: string
    streakReset: string
    goalReached: (pct: number) => string
    last7Days: string
    focusMinutes: string
    byTag: string
    noWeekData: string
    last52Weeks: string
    hourOfDay: string
    sessionsPerHour: string
    noData: string
    hourRange: (h: number) => string
    sessions: string
    amount: string
    sessionLog: string
    day: string
    days: string
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
    theme: string
    themeHint: string
    colorMode: string
    colorModeHint: string
    dark: string
    light: string
    timerIntervals: string
    timerIntervalsHint: string
    presets: string
    presetClassic: string
    presetDeepWork: string
    presetUltradian: string
    roundsUnit: string
    minUnit: string
    weeklyGoalHours: (hours: number) => string
    phases: string
    phasesHint: string
    cycle: string
    cycleHint: string
    weeklyGoal: string
    weeklyGoalHint: string
    minutes: string
    tags: string
    tagsHint: string
    newTag: string
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
    appearance: string
    layoutHint: string
    layoutTwoColumns: string
    layoutTwoColumnsDesc: string
    layoutOneColumn: string
    layoutOneColumnDesc: string
  }
  sync: {
    title: string
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
  nav: { timer: 'Timer', statistics: 'Statistik', settings: 'Einstellungen' },
  update: { available: 'Neue Version verfügbar', reload: 'Neu laden' },
  phases: { focus: 'Fokus', shortBreak: 'Kurze Pause', longBreak: 'Lange Pause' },
  weekdays: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
  paused: 'pausiert',
  timer: {
    pomodoro: 'Pomodoro',
    flow: 'Flow',
    taskPlaceholder: 'Aktuelle Aufgabe …',
    start: 'Start (Leertaste)',
    pause: 'Pause (Leertaste)',
    stop: 'Stoppen & Zeit loggen (N)',
    rounds: (done, total) => `${done}/${total} Runden`,
    status: { running: 'läuft', paused: 'pausiert', ready: 'bereit' },
  },
  flow: {
    finish: 'Flow beenden & speichern',
    finishShortcut: 'Beenden & speichern',
    discard: 'Verwerfen ohne Speichern',
    discardShortcut: 'Verwerfen',
    finishedToast: (minutes) => `Flow abgeschlossen! +${minutes} Min. Fokuszeit gespeichert`,
  },
  shortcuts: { startPause: 'Start / Pause', skip: 'Skip', reset: 'Reset', zen: 'Zen' },
  zen: {
    mode: 'Zen-Modus',
    exitHint: 'Zen-Modus · Z oder Esc zum Beenden',
    enterHint: 'Zen-Modus aktivieren',
  },
  pip: { open: 'Mini-Player (PiP)', close: 'Mini-Player schließen' },
  todo: {
    title: 'To-Do',
    tag: 'Tag',
    add: 'Hinzufügen',
    doneCount: (done, total) => `${done}/${total} erledigt`,
    addPlaceholder: 'Neue Aufgabe …',
    empty: 'Noch keine Aufgaben. Lege eine neue an.',
    reopen: 'Wieder öffnen',
    done: 'Erledigt',
    selectFocus: 'Als aktive Aufgabe wählen',
    unselectFocus: 'Aktive Aufgabe abwählen',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    save: 'Speichern',
    cancel: 'Abbrechen',
  },
  timeline: {
    title: 'Tages-Timeline',
    noSessions: 'Noch keine Sessions heute aufgezeichnet',
    now: 'Jetzt',
    todayProgress: (count, minutes) => `${count} ${count === 1 ? 'Session' : 'Sessions'} · ${minutes} Min. Fokus`,
  },
  reflection: {
    title: 'Micro-Reflection',
    prompt: 'Was hast du in dieser Session gelernt / erreicht?',
    placeholder: 'Kurz notieren (optional) …',
    save: 'Speichern',
    skip: 'Überspringen',
  },
  dashboard: {
    today: 'Heute',
    todayFocus: 'Heutige Fokuszeit',
    dailyGoal: 'Tagesziel',
    pomodorosToday: 'Runden heute',
    streak: 'Tages-Streak',
    weeklyGoal: 'Wochenziel',
    noDataToday: 'Noch nichts erfasst',
    streakActive: 'Am Laufen',
    streakReset: 'Morgen neu starten',
    goalReached: (pct) => `${pct}% erreicht`,
    last7Days: 'Letzte 7 Tage',
    focusMinutes: 'Fokuszeit in Minuten',
    byTag: 'Verteilung nach Tag',
    noWeekData: 'Diese Woche noch keine Daten.',
    last52Weeks: 'Letzte 52 Wochen',
    hourOfDay: 'Tageszeit',
    sessionsPerHour: 'Abgeschlossene Sessions pro Stunde',
    noData: 'Noch keine Daten.',
    hourRange: (h) => `${h}:00 – ${h + 1}:00 Uhr`,
    sessions: 'Sessions',
    amount: 'Anzahl',
    sessionLog: 'Session-Log',
    day: 'Tag',
    days: 'Tage',
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
    theme: 'Theme',
    themeHint: 'Designstil der App, wird lokal gespeichert.',
    colorMode: 'Farbmodus',
    colorModeHint: 'Wähle zwischen dunklem und hellem Erscheinungsbild.',
    dark: 'Dunkel',
    light: 'Hell',
    timerIntervals: 'Timer & Intervalle',
    timerIntervalsHint: 'Passe Fokus- und Pausendauern, Zykluslänge sowie dein Wochenziel an.',
    presets: 'Fokus-Rhythmen',
    presetClassic: 'Klassisch (25 / 5 min)',
    presetDeepWork: 'Deep Work (50 / 10 min)',
    presetUltradian: 'Ultradian (90 / 20 min)',
    roundsUnit: 'Runden',
    minUnit: 'min',
    weeklyGoalHours: (h) => `≈ ${h.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Std./Woche`,
    phases: 'Phasen',
    phasesHint: 'Dauern in Minuten, zwischen 1 und 180.',
    cycle: 'Zyklus',
    cycleHint: 'Nach wie vielen Fokus-Runden folgt eine lange Pause?',
    weeklyGoal: 'Wochenziel',
    weeklyGoalHint: 'Ziel-Fokuszeit pro Woche.',
    minutes: 'Minuten',
    tags: 'Tags',
    tagsHint: 'Kategorien für die Aufgaben-Zuweisung.',
    newTag: 'Neuer Tag …',
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
    appearance: 'Darstellung & Layout',
    layoutHint: 'Wähle die Anordnung von Timer, Aufgaben und Statistiken.',
    layoutTwoColumns: 'Zwei Spalten',
    layoutTwoColumnsDesc: 'Timer und Aufgaben nebeneinander',
    layoutOneColumn: 'Eine Spalte',
    layoutOneColumnDesc: 'Zentrierter Fokus auf den Timer',
  },
  sync: {
    title: 'Cloud-Sync',
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
  nav: { timer: 'Timer', statistics: 'Statistics', settings: 'Settings' },
  update: { available: 'New version available', reload: 'Reload' },
  phases: { focus: 'Focus', shortBreak: 'Short Break', longBreak: 'Long Break' },
  weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  paused: 'paused',
  timer: {
    pomodoro: 'Pomodoro',
    flow: 'Flow',
    taskPlaceholder: 'Current task …',
    start: 'Start (Space)',
    pause: 'Pause (Space)',
    stop: 'Stop & log time (N)',
    rounds: (done, total) => `${done}/${total} rounds`,
    status: { running: 'running', paused: 'paused', ready: 'ready' },
  },
  flow: {
    finish: 'Finish flow & save',
    finishShortcut: 'Finish & save',
    discard: 'Discard without saving',
    discardShortcut: 'Discard',
    finishedToast: (minutes) => `Flow complete! +${minutes} min focus saved`,
  },
  shortcuts: { startPause: 'Start / Pause', skip: 'Skip', reset: 'Reset', zen: 'Zen' },
  zen: {
    mode: 'Zen Mode',
    exitHint: 'Zen Mode · Press Z or Esc to exit',
    enterHint: 'Enter Zen Mode',
  },
  pip: { open: 'Mini-Player (PiP)', close: 'Close Mini-Player' },
  todo: {
    title: 'To-Do',
    tag: 'Tag',
    add: 'Add',
    doneCount: (done, total) => `${done}/${total} done`,
    addPlaceholder: 'Add task …',
    empty: 'No tasks yet. Add one to get started.',
    reopen: 'Reopen',
    done: 'Done',
    selectFocus: 'Select as active task',
    unselectFocus: 'Deselect active task',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
  },
  timeline: {
    title: "Today's Timeline",
    noSessions: 'No sessions recorded today yet',
    now: 'Now',
    todayProgress: (count, minutes) => `${count} ${count === 1 ? 'session' : 'sessions'} · ${minutes} min focus`,
  },
  reflection: {
    title: 'Micro-Reflection',
    prompt: 'What did you learn / achieve in this session?',
    placeholder: 'Write a short note (optional) …',
    save: 'Save',
    skip: 'Skip',
  },
  dashboard: {
    today: 'Today',
    todayFocus: 'Today’s focus time',
    dailyGoal: 'Daily goal',
    pomodorosToday: 'Rounds today',
    streak: 'Daily streak',
    weeklyGoal: 'Weekly goal',
    noDataToday: 'Nothing recorded yet',
    streakActive: 'Streak active',
    streakReset: 'Restarts tomorrow',
    goalReached: (pct) => `${pct}% reached`,
    last7Days: 'Last 7 days',
    focusMinutes: 'Focus minutes',
    byTag: 'Distribution by tag',
    noWeekData: 'No data this week yet.',
    last52Weeks: 'Last 52 weeks',
    hourOfDay: 'Time of day',
    sessionsPerHour: 'Completed sessions per hour',
    noData: 'No data yet.',
    hourRange: (h) => `${h}:00 – ${h + 1}:00`,
    sessions: 'Sessions',
    amount: 'Count',
    sessionLog: 'Session log',
    day: 'day',
    days: 'days',
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
    emptySub: 'Complete your first Pomodoro or Flow session to see your activity history.',
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
    theme: 'Theme',
    themeHint: 'App design system theme, stored locally.',
    colorMode: 'Color Mode',
    colorModeHint: 'Choose between dark and light appearance.',
    dark: 'Dark',
    light: 'Light',
    timerIntervals: 'Timer & Intervals',
    timerIntervalsHint: 'Customize focus and break durations, cycle length, and weekly goal.',
    presets: 'Focus Rhythms',
    presetClassic: 'Classic (25 / 5 min)',
    presetDeepWork: 'Deep Work (50 / 10 min)',
    presetUltradian: 'Ultradian (90 / 20 min)',
    roundsUnit: 'rounds',
    minUnit: 'min',
    weeklyGoalHours: (h) => `≈ ${h.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} hrs/week`,
    phases: 'Phases',
    phasesHint: 'Durations in minutes, between 1 and 180.',
    cycle: 'Cycle',
    cycleHint: 'After how many focus rounds follows a long break?',
    weeklyGoal: 'Weekly goal',
    weeklyGoalHint: 'Target focus time per week.',
    minutes: 'minutes',
    tags: 'Tags',
    tagsHint: 'Categories for task assignment.',
    newTag: 'New tag …',
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
    appearance: 'Appearance & Layout',
    layoutHint: 'Choose how timer, tasks and stats are arranged.',
    layoutTwoColumns: 'Two columns',
    layoutTwoColumnsDesc: 'Timer & tasks side by side',
    layoutOneColumn: 'One column',
    layoutOneColumnDesc: 'Centered focus & large timer',
  },
  sync: {
    title: 'Cloud Sync',
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

export const translations: Record<Lang, Messages> = { de, en }

const STORAGE_KEY = 'pomodoro.lang'

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'de' || saved === 'en') return saved
  } catch {
    /* storage unavailable */
  }
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('de')
    ? 'de'
    : 'en'
}

let currentLang: Lang = typeof window === 'undefined' ? 'de' : detectLang()
const listeners = new Set<() => void>()

export function getLang(): Lang {
  return currentLang
}

export function setLang(lang: Lang): void {
  if (lang === currentLang) return
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