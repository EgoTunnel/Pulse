import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
// Theme fonts are bundled, not fetched — Pulse has to look right offline.
import '@fontsource-variable/inter'
import '@fontsource-variable/nunito'
import '@fontsource-variable/playfair-display'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/caveat'
import '@fontsource/merriweather/400.css'
import '@fontsource/merriweather/700.css'
import '../styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
