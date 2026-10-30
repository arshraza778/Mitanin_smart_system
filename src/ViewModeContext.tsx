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
  isDrawerRange: boolean;
  setMode: (mode: ViewMode) => void;
  toggleMode: () => void;
}

export const ViewModeContext = createContext<ViewModeContextValue | undefined>(undefined);

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
      return window.innerWidth >= 768;
    }
    return false;
  });
  const [isDrawerRange, setIsDrawerRange] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 && window.innerWidth < 1024;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      const w = window.innerWidth;
      setIsWide(w >= 768);
      setIsDrawerRange(w >= 768 && w < 1024);
    };
    update();

    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Web layout applies at 768 px and above; below that always show the Phone layout.
  const effectiveMode: EffectiveViewMode =
    !isWide ? 'phone' : (mode === 'auto' ? 'web' : mode);

  const isWeb = effectiveMode === 'web';

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const current =
        prev === 'auto'
          ? (typeof window !== 'undefined' && window.innerWidth >= 768 ? 'web' : 'phone')
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
        isDrawerRange,
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
