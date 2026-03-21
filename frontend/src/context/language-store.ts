import { createContext } from "react";

export type SupportedLanguage = "en" | "am";

export interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (next: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
  locale: string;
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);
