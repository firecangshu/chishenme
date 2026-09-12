import React from 'react'
import { createRoot } from 'react-dom/client'
import { DISHES, EMOJIS, EMOJI_MAP, decide, makeReason } from './src/data.js'

function App() {
  return React.createElement('div', null,
    React.createElement('h1', null, '🍜 吃什么 - data.js 测试'),
    React.createElement('p', null, 'DISHES 数量: ' + DISHES.length),
    React.createElement('p', null, 'EMOJIS: ' + EMOJIS.join(' ')),
    React.createElement('p', null, 'EMOJI_MAP keys: ' + Object.keys(EMOJI_MAP).join(', ')),
    React.createElement('p', null, '第一道菜: ' + DISHES[0].name + ' (' + DISHES[0].type + ')')
  )
}

createRoot(document.getElementById('app')).render(React.createElement(App))
