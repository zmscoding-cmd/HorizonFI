import React, { createContext, useContext, useEffect, useState } from 'react';

export type CurrencyMode = 'CURRENT' | 'FUTURE';

interface CurrencyModeContextProps {
  currencyMode: CurrencyMode;
  setCurrencyMode: (mode: CurrencyMode) => void;
  toggleCurrencyMode: () => void;
}

const CurrencyModeContext = createContext<CurrencyModeContextProps | undefined>(undefined);

export const CurrencyModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currencyMode, setCurrencyModeState] = useState<CurrencyMode>('FUTURE');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('horizonfi-currency-mode');
      if (stored === 'CURRENT' || stored === 'FUTURE') {
        setCurrencyModeState(stored);
      }
    } catch (e) {
      console.error('Failed to read currency mode from localStorage', e);
    }
  }, []);

  const setCurrencyMode = (mode: CurrencyMode) => {
    setCurrencyModeState(mode);
    try {
      localStorage.setItem('horizonfi-currency-mode', mode);
    } catch (e) {
      console.error('Failed to save currency mode to localStorage', e);
    }
  };

  const toggleCurrencyMode = () => {
    setCurrencyMode(currencyMode === 'CURRENT' ? 'FUTURE' : 'CURRENT');
  };

  return (
    <CurrencyModeContext.Provider value={{ currencyMode, setCurrencyMode, toggleCurrencyMode }}>
      {children}
    </CurrencyModeContext.Provider>
  );
};

export const useCurrencyMode = () => {
  const context = useContext(CurrencyModeContext);
  if (context === undefined) {
    throw new Error('useCurrencyMode must be used within a CurrencyModeProvider');
  }
  return context;
};
