'use client';

import { useState } from 'react';

import {
  Bot,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react';

import { auth } from '@/lib/firebase';

interface AIEmailComposerProps {
  recipientName?: string;
  category:
    | 'contact'
    | 'supplier'
    | 'seller'
    | 'support'
    | 'application'
    | 'general';
  originalMessage?: string;
  previousResponse?: string;
  defaultSubject?: string;
  recipientEmail?: string;
  threadId?: string;
  relatedRecordId?: string;
  onSent?: () => void;
}

export function AIEmailComposer({
  recipientName,
  category,
  originalMessage,
  previousResponse,
  defaultSubject,
  recipientEmail,
  threadId,
  relatedRecordId,
  onSent,
}: AIEmailComposerProps) {
  const [instruction, setInstruction] =
    useState('');

  const [subject, setSubject] =
    useState(defaultSubject || '');

  const [body, setBody] =
    useState('');

  const [generating, setGenerating] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const generate = async () => {
    if (!instruction.trim()) {
      alert(
        'Tell AI what you want the email to say.'
      );
      return;
    }

    setGenerating(true);

    try {
      if (!auth.currentUser) {
        throw new Error(
          'Administrator session is unavailable.'
        );
      }

      const token =
        await auth.currentUser.getIdToken();

      const response = await fetch(
        '/api/admin/email/compose',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            instruction,
            recipientName,
            category,
            originalMessage,
            previousResponse,
            subject,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to generate email.'
        );
      }

      setSubject(data.subject || '');
      setBody(data.body || '');
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to generate email.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const send = async () => {
    if (
      !recipientEmail ||
      !body.trim() ||
      !subject.trim()
    ) {
      alert(
        'Recipient, subject, and email body are required.'
      );
      return;
    }

    setSending(true);

    try {
      if (!auth.currentUser) {
        throw new Error(
          'Administrator session is unavailable.'
        );
      }

      const token =
        await auth.currentUser.getIdToken();

      const response = await fetch(
        '/api/admin/email/send',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
            Authorization:
              `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: recipientEmail,
            name: recipientName,
            subject,
            body,
            category,
            threadId,
            relatedRecordId,
            aiGenerated:
              Boolean(body.trim()),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Unable to send email.'
        );
      }

      setBody('');
      setInstruction('');

      alert(
        'Email sent successfully from Auronix Commerce Team.'
      );

      onSent?.();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Unable to send email.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-accent" />
        </div>

        <div>
          <h3 className="font-semibold">
            AI Email Composer
          </h3>

          <p className="text-xs text-foreground-muted">
            Auronix Commerce Team
          </p>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div>
          <label className="text-sm font-medium">
            Tell AI what to say
          </label>

          <textarea
            value={instruction}
            onChange={(event) =>
              setInstruction(
                event.target.value
              )
            }
            rows={4}
            placeholder="Example: Thank them for the supplier submission, confirm that we received the catalog, and ask them to provide wholesale pricing and MOQ."
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}

          {generating
            ? 'Generating…'
            : 'Generate Professional Email'}
        </button>

        <div>
          <label className="text-sm font-medium">
            Subject
          </label>

          <input
            value={subject}
            onChange={(event) =>
              setSubject(
                event.target.value
              )
            }
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div>
          <label className="text-sm font-medium">
            Email
          </label>

          <textarea
            value={body}
            onChange={(event) =>
              setBody(event.target.value)
            }
            rows={14}
            placeholder="Generate an email or write one manually..."
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-xs text-foreground-muted">
            From: support.auronixcommerce@gmail.com
          </div>

          <button
            type="button"
            onClick={send}
            disabled={
              sending ||
              !body.trim() ||
              !recipientEmail
            }
            className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}

            {sending
              ? 'Sending…'
              : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}