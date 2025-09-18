import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import SecurityBoundary from './components/security/SecurityBoundary.tsx'

createRoot(document.getElementById("root")!).render(
  <SecurityBoundary>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </SecurityBoundary>
);
