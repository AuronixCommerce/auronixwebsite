'use client';
import { Spinner } from '@/components/design/primitives';

import {
  FormEvent,
  useState,
} from 'react';

import {
  CheckCircle2,
  Loader2,
  Mail,
  Send,
} from 'lucide-react';

export default function NewsletterSignup() {
  const [email, setEmail] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [status, setStatus] =
    useState<
      'idle' | 'success' | 'error'
    >('idle');

  const [message, setMessage] =
    useState('');

  const subscribe = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      loading ||
      !email.trim()
    ) {
      return;
    }

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const response =
        await fetch(
          '/api/newsletter/subscribe',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                email:
                  email.trim(),
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            'Unable to subscribe.'
        );
      }

      setStatus('success');

      setMessage(
        data.alreadySubscribed
          ? 'You are already subscribed.'
          : 'You are subscribed. Welcome to Auronix Commerce updates.'
      );

      setEmail('');
    } catch (
      error
    ) {
      setStatus('error');

      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to subscribe.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-10 rounded-3xl border border-border bg-card p-6 sm:p-7">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary">
          <Mail className="h-5 w-5" />
        </div>

        <div>
          <h3 className="font-semibold">
            Stay updated
          </h3>

          <p className="mt-1 max-w-xl text-sm leading-6 text-foreground-muted">
            Get Auronix Commerce news, website
            updates, partnership announcements,
            eCommerce insights, and important
            policy changes.
          </p>
        </div>
      </div>

      <form
        onSubmit={subscribe}
        className="mt-5 flex flex-col gap-3 sm:flex-row"
      >
        <input
          type="email"
          required
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value
            )
          }
          placeholder="you@example.com"
          autoComplete="email"
          className="h-12 flex-1 rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
        />

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}

          {loading
            ? 'Subscribing...'
            : 'Subscribe'}
        </button>
      </form>

      {status === 'success' && (
        <div className="mt-4 flex items-start gap-2 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />

          <span>
            {message}
          </span>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 text-sm text-red-700">
          {message}
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-foreground-muted">
        You can unsubscribe from any newsletter
        email at any time.
      </p>
    </div>
  );
}
