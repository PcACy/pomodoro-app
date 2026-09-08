import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

// Synchronously apply stored accent color before first React render
try {
  const storedSettings = localStorage.getItem('pomodoro.settings')
  if (storedSettings) {
    const parsed = JSON.parse(storedSettings)
    if (parsed.accentColor) {
      document.documentElement.dataset.accent = parsed.accentColor
    }
  }
} catch {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)