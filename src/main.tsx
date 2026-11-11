import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { firebaseConfigured } from './store/config'
import './styles.css'

// Chargés à la demande : Firebase n'est téléchargé que s'il est configuré.
const Provider = firebaseConfigured
  ? lazy(() => import('./store/FirebaseProvider').then((m) => ({ default: m.FirebaseProvider })))
  : lazy(() => import('./store/LocalProvider').then((m) => ({ default: m.LocalProvider })))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Provider><App /></Provider>
    </Suspense>
  </StrictMode>,
)
