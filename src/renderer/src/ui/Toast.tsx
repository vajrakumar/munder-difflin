import * as ToastPrimitive from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastItem = { id: number; title: string };

const ToastCtx = createContext<(title: string) => void>(() => { /* noop */ });

export function useToast(): (title: string) => void {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((title: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, title }]);
  }, []);
  const value = useMemo(() => push, [push]);

  return (
    <ToastCtx.Provider value={value}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {items.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            className="paper-toast"
            onOpenChange={(open) => {
              if (!open) setItems((prev) => prev.filter((x) => x.id !== t.id));
            }}
          >
            <ToastPrimitive.Title>{t.title}</ToastPrimitive.Title>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="paper-toast-viewport" />
      </ToastPrimitive.Provider>
    </ToastCtx.Provider>
  );
}
