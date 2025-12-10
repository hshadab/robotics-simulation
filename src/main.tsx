import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/common'
import { validateEnvConfig } from './lib/config'
import { loggers } from './lib/logger'

const log = loggers.ai;

// Validate environment configuration at startup
const envValidation = validateEnvConfig();
if (envValidation.errors.length > 0) {
  log.error('Environment configuration errors', envValidation.errors);
}
envValidation.warnings.forEach(warning => {
  log.warn(warning);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary name="RoboSim App">
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
