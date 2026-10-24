import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

export type ViewMode = 'auto' | 'phone' | 'web';
export type EffectiveViewMode = 'phone' | 'web';

export interface ViewModeContextValue {
  mode: ViewMode;
  effectiveMode: EffectiveViewMode;
  isWeb: boolean;
  setMode: (mode: ViewMode) => void;
  toggleMode: () => void;
}

const ViewModeContext = createContext<ViewModeContextValue | undefined>(undefined);

export function ViewModeProvider({
  children,
  initialMode = 'auto',
}: {
  children: ReactNode;
  initialMode?: ViewMode;
}) {
  const [mode, setMode] = useState<ViewMode>(initialMode);
  const [isWide, setIsWide] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const update = (matches: boolean) => setIsWide(matches);
    update(mql.matches);

    const listener = (e: MediaQueryListEvent) => update(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  const effectiveMode: EffectiveViewMode =
    mode === 'auto' ? (isWide ? 'web' : 'phone') : mode;

  const isWeb = effectiveMode === 'web';

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const current =
        prev === 'auto'
          ? (typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'web' : 'phone')
          : prev;
      return current === 'phone' ? 'web' : 'phone';
    });
  }, []);

  return (
    <ViewModeContext.Provider
      value={{
        mode,
        effectiveMode,
        isWeb,
        setMode,
        toggleMode,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode(): ViewModeContextValue {
  const ctx = useContext(ViewModeContext);
  if (!ctx) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return ctx;
}
