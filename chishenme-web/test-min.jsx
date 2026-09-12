import React from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  return React.createElement('h1', {style: {color: '#e67e22'}}, '🍜 吃什么 - 最小化版本!')
}

createRoot(document.getElementById('app')).render(React.createElement(App))
