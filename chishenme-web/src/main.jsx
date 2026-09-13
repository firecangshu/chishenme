import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

const rootEl = document.getElementById('app')
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />)
}
