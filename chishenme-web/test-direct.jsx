import React, { useState, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import App from './src/App.jsx'

const rootEl = document.getElementById('app')
if (rootEl) {
  createRoot(rootEl).render(<App />)
} else {
  console.error('#app not found!')
}
