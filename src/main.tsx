import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './components/ThemeProvider';
import { CurrencyModeProvider } from './contexts/CurrencyModeContext';
// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <CurrencyModeProvider>
        <App />
      </CurrencyModeProvider>
    </ThemeProvider>
  </StrictMode>,
);
