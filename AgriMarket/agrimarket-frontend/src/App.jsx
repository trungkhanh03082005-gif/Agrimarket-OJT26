import React from 'react'
import AppRoutes from './routes/AppRoutes'
import { NotificationProvider } from './contexts/NotificationContext'
import ErrorBoundary from './components/common/ErrorBoundary'

function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <AppRoutes />
      </NotificationProvider>
    </ErrorBoundary>
  )
}

export default App
