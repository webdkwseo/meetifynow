"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  /** Destructive actions get a red confirm button. */
  destructive?: boolean;
};

type Labels = { confirm: string; cancel: string };

const ConfirmContext = createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null);

/** `const confirm = useConfirm(); if (!(await confirm({...}))) return;` */
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm)
    throw new Error("useConfirm must be used inside ConfirmProvider");
  return confirm;
}

export function ConfirmProvider({
  children,
  labels,
}: {
  children: ReactNode;
  labels: Labels;
}) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>();

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = undefined;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root
        open={!!options}
        onOpenChange={(open) => !open && close(false)}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[100] bg-dark/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl focus:outline-none duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
            <AlertDialog.Title className="text-lg font-semibold text-dark">
              {options?.title}
            </AlertDialog.Title>
            {options?.description ? (
              <AlertDialog.Description className="mt-2 text-sm text-gray-600">
                {options.description}
              </AlertDialog.Description>
            ) : (
              <AlertDialog.Description className="sr-only">
                {options?.title}
              </AlertDialog.Description>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                {labels.cancel}
              </AlertDialog.Cancel>
              <AlertDialog.Action
                onClick={() => close(true)}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  options?.destructive
                    ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
                    : "bg-dark hover:bg-dark/90 focus-visible:ring-primary"
                }`}
              >
                {options?.confirmLabel ?? labels.confirm}
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}
