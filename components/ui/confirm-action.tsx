'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type ConfirmActionOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmRequest = ConfirmActionOptions & {
  resolve: (confirmed: boolean) => void;
};

const CONFIRM_EVENT = 'auronix:confirm-action';
const PROMPT_EVENT = 'auronix:prompt-action';

export type PromptActionOptions = {
  title: string;
  description: string;
  label: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PromptRequest = PromptActionOptions & {
  resolve: (value: string | null) => void;
};

export function notifyAction(message: string, title = 'Auronix') {
  toast({ title, description: message });
}

export function confirmAction(options: ConfirmActionOptions) {
  if (typeof window === 'undefined') return Promise.resolve(false);

  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(new CustomEvent<ConfirmRequest>(CONFIRM_EVENT, {
      detail: { ...options, resolve },
    }));
  });
}

export function promptAction(options: PromptActionOptions) {
  if (typeof window === 'undefined') return Promise.resolve(null);

  return new Promise<string | null>((resolve) => {
    window.dispatchEvent(new CustomEvent<PromptRequest>(PROMPT_EVENT, {
      detail: { ...options, resolve },
    }));
  });
}

export function ConfirmActionHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const requestRef = useRef<ConfirmRequest | null>(null);

  useEffect(() => {
    const handleRequest = (event: Event) => {
      const nextRequest = (event as CustomEvent<ConfirmRequest>).detail;
      requestRef.current?.resolve(false);
      requestRef.current = nextRequest;
      setRequest(nextRequest);
    };

    window.addEventListener(CONFIRM_EVENT, handleRequest);
    return () => {
      window.removeEventListener(CONFIRM_EVENT, handleRequest);
      requestRef.current?.resolve(false);
      requestRef.current = null;
    };
  }, []);

  const settle = (confirmed: boolean) => {
    const current = requestRef.current;
    if (!current) return;
    requestRef.current = null;
    setRequest(null);
    current.resolve(confirmed);
  };

  return (
    <AlertDialog open={Boolean(request)} onOpenChange={(open) => {
      if (!open) settle(false);
    }}>
      <AlertDialogContent className="max-w-[min(92vw,440px)] rounded-[26px] border-border bg-background p-6 shadow-[0_28px_100px_rgba(0,0,0,0.36)]">
        <AlertDialogHeader className="text-left">
          <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${request?.destructive ? 'bg-red-500/10 text-red-600 dark:text-red-300' : 'bg-accent/10 text-accent'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <AlertDialogTitle className="font-sans text-xl font-bold tracking-tight">
            {request?.title || 'Please confirm'}
          </AlertDialogTitle>
          <AlertDialogDescription className="font-sans text-sm leading-6 text-foreground-muted">
            {request?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-2 sm:gap-2">
          <AlertDialogCancel onClick={() => settle(false)} className="h-11 rounded-xl border-border bg-secondary/60 px-5 font-sans font-semibold">
            {request?.cancelLabel || 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => settle(true)}
            className={`h-11 rounded-xl px-5 font-sans font-semibold ${request?.destructive ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
          >
            {request?.confirmLabel || 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PromptActionHost() {
  const [request, setRequest] = useState<PromptRequest | null>(null);
  const [value, setValue] = useState('');
  const requestRef = useRef<PromptRequest | null>(null);

  useEffect(() => {
    const handleRequest = (event: Event) => {
      const nextRequest = (event as CustomEvent<PromptRequest>).detail;
      requestRef.current?.resolve(null);
      requestRef.current = nextRequest;
      setValue(nextRequest.defaultValue || '');
      setRequest(nextRequest);
    };

    window.addEventListener(PROMPT_EVENT, handleRequest);
    return () => {
      window.removeEventListener(PROMPT_EVENT, handleRequest);
      requestRef.current?.resolve(null);
      requestRef.current = null;
    };
  }, []);

  const settle = (nextValue: string | null) => {
    const current = requestRef.current;
    if (!current) return;
    requestRef.current = null;
    setRequest(null);
    current.resolve(nextValue);
  };

  return (
    <AlertDialog open={Boolean(request)} onOpenChange={(open) => {
      if (!open) settle(null);
    }}>
      <AlertDialogContent className="max-w-[min(92vw,480px)] rounded-[26px] border-border bg-background p-6 shadow-[0_28px_100px_rgba(0,0,0,0.36)]">
        <AlertDialogHeader className="text-left">
          <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${request?.destructive ? 'bg-red-500/10 text-red-600 dark:text-red-300' : 'bg-accent/10 text-accent'}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <AlertDialogTitle className="font-sans text-xl font-bold tracking-tight">
            {request?.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="font-sans text-sm leading-6 text-foreground-muted">
            {request?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="mt-2 block font-sans text-sm font-semibold">
          {request?.label}
          <textarea
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            rows={4}
            className="mt-2 w-full resize-y rounded-2xl border border-border bg-card px-4 py-3 font-sans text-sm font-normal leading-6 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </label>
        <AlertDialogFooter className="mt-4 gap-2 sm:gap-2">
          <AlertDialogCancel onClick={() => settle(null)} className="h-11 rounded-xl border-border bg-secondary/60 px-5 font-sans font-semibold">
            {request?.cancelLabel || 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={!value.trim()}
            onClick={(event) => {
              event.preventDefault();
              if (value.trim()) settle(value.trim());
            }}
            className={`h-11 rounded-xl px-5 font-sans font-semibold disabled:opacity-50 ${request?.destructive ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
          >
            {request?.confirmLabel || 'Continue'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
