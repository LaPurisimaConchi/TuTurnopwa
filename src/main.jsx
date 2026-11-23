// Prueba de despliegue en Vercel: este comentario no cambia el comportamiento
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import Avisos from './components/Avisos.jsx'
import { instalarAvisos } from './utils/avisos.js'

// alert(...) sale como un aviso de la web, no como el diálogo del navegador
instalarAvisos()

const esStaging = import.meta.env.VITE_ENV === 'staging'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {esStaging && (
      <div className="bg-orange-500 text-white text-center text-xs font-bold py-1">
        ENTORNO DE PRUEBAS · {import.meta.env.VITE_FIREBASE_PROJECT_ID}
      </div>
    )}
    <ErrorBoundary>
      <App />
      <Avisos />
    </ErrorBoundary>
  </StrictMode>,
)
