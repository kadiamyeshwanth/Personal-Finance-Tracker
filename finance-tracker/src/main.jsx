import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/clario.css'   // refinement layer — must load after index.css
import './styles/skeuo.css'    // skeuomorphic surface system — owns geometry + depth
import './styles/prelanding.css' // illustration + character animation — `.pl-*`
import './styles/meridian.css'   // public landing page — self-contained `.mr-*`
import './styles/mobile-compact.css' // tablet + phone layouts (icon rail, tab bar)
import './styles/instrument.css'     // dashboard data-card language (meters, mono tags) — loads last
import App from './App.jsx'
import { applyA11y } from './lib/a11y'
import { initCursorIdle } from './lib/cursorIdle'

applyA11y()
initCursorIdle()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
