import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const esStaging = import.meta.env.VITE_ENV === 'staging'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {esStaging && (
      <div className="fixed top-0 inset-x-0 z-[9999] bg-orange-500 text-white text-center text-xs font-bold py-1 pointer-events-none">
        ENTORNO DE PRUEBAS · {import.meta.env.VITE_FIREBASE_PROJECT_ID}
      </div>
    )}
    <App />
  </StrictMode>,
)
