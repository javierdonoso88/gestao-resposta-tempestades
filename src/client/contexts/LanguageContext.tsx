import { createContext, useContext } from 'react';

export type Lang = 'pt';

interface LangCtx {
  lang: Lang;
}

export const LanguageContext = createContext<LangCtx>({ lang: 'pt' });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return (
    <LanguageContext.Provider value={{ lang: 'pt' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
