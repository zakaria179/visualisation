import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import { SimulationProvider } from './context/SimulationContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ProtectedRoute>
        <SimulationProvider>
          <App />
        </SimulationProvider>
      </ProtectedRoute>
    </AuthProvider>
  </StrictMode>,
)
