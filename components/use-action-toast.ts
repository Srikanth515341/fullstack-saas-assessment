'use client';

import { useEffect, useRef } from 'react';
import { useToast } from './toast-provider';

type ToastableState = {
  success?: string;
  error?: string;
} | undefined;

// Compares by reference, not message content: useActionState hands back a
// brand-new object on every transition, even when two submissions produce
// identical text (e.g. "Task added." twice in a row). Comparing the message
// strings would silently swallow the second toast.
export function useActionToast(state: ToastableState) {
  const { showToast } = useToast();
  const lastState = useRef<ToastableState>(undefined);

  useEffect(() => {
    if (!state || state === lastState.current) {
      return;
    }
    lastState.current = state;

    if (state.success) {
      showToast(state.success, 'success');
    } else if (state.error) {
      showToast(state.error, 'error');
    }
  }, [state, showToast]);
}
