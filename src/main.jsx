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
// La banda queda fija arriba (1.5rem): el resto de elementos fijos y los
// saltos de scroll se desplazan esa altura (var(--banda-entorno))
if (esStaging) document.documentElement.style.setProperty('--banda-entorno', '1.5rem')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {esStaging && (
      <>
        <div className="fixed inset-x-0 top-0 z-50 flex h-6 items-center justify-center bg-orange-500 text-white text-xs font-bold">
          ENTORNO DE PRUEBAS · {import.meta.env.VITE_FIREBASE_PROJECT_ID}
        </div>
        {/* Hueco que ocupa la banda fija */}
        <div className="h-6" aria-hidden="true" />
      </>
    )}
    <ErrorBoundary>
      <App />
      <Avisos />
    </ErrorBoundary>
  </StrictMode>,
)
