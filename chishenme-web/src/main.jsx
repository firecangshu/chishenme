import React from 'react'
import ReactDOM from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import App from './App.jsx'
import '@mantine/core/styles.css'

const theme = createTheme({
  primaryColor: 'orange',
  fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
  defaultRadius: 'md',
  headings: { fontFamily: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif' },
})

const rootEl = document.getElementById('app')
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  )
}
