import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Root from './Root.tsx'
import { initTheme } from './services/themeStore'

// Terapkan preferensi tema (dan dengarkan preferensi sistem) sebelum render.
initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
