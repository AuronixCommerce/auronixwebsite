'use client';
import { userFacingError } from '@/lib/user-facing-error';

import {
  FormEvent,
  useState,
} from 'react';

type CampaignFormField =
  | 'name'
  | 'email'
  | 'company'
  | 'phone'
  | 'attendees'
  | 'message'
  | 'notes';

type CampaignFormProps = {
  token: string;

  title: string;

  description: string;

  submitText: string;

  fields: CampaignFormField[];

  successTitle: string;

  successMessage: string;
};

type FormState = {
  name: string;
  email: string;
  company: string;
  phone: string;
  attendees: string;
  message: string;
  notes: string;
};

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  company: '',
  phone: '',
  attendees: '',
  message: '',
  notes: '',
};

export default function CampaignForm({
  token,
  title,
  description,
  submitText,
  fields,
  successTitle,
  successMessage,
}: CampaignFormProps) {
  const [form, setForm] =
    useState<FormState>(
      INITIAL_FORM
    );

  const [loading, setLoading] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);

  const [error, setError] =
    useState('');

  function updateField(
    field: keyof FormState,
    value: string
  ) {
    setForm(
      current => ({
        ...current,
        [field]: value,
      })
    );
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response =
        await fetch(
          '/api/newsletter/campaign/' +
            encodeURIComponent(
              token
            ) +
            '/reserve',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              name: form.name,
              email: form.email,
              company: form.company,
              phone: form.phone,
              attendees:
                form.attendees,
              message:
                form.message,
              notes: form.notes,
            }),
          }
        );

      const contentType =
        response.headers.get(
          'content-type'
        ) || '';

      if (
        !contentType.includes(
          'application/json'
        )
      ) {
        const raw =
          await response.text();

        throw new Error(
          'The campaign form returned an unexpected response (' +
            response.status +
            '). ' +
            raw.slice(0, 200)
        );
      }

      const data =
        await response.json();

      if (
        !response.ok ||
        data?.success !== true
      ) {
        throw new Error(
          data?.error ||
            'Unable to submit your information.'
        );
      }

      setSubmitted(true);
    } catch (
      submissionError
    ) {
      setError(
        submissionError instanceof Error
          ? userFacingError(submissionError)
          : 'Unable to submit your information.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-7 rounded-[24px] border border-green-500/20 bg-green-500/5 p-6">

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">

          <span className="text-lg font-bold text-green-700">
            ✓
          </span>

        </div>

        <h3 className="mt-5 text-xl font-extrabold tracking-[-0.03em]">
          {successTitle}
        </h3>

        <p className="mt-3 text-sm leading-7 text-foreground-muted">
          {successMessage}
        </p>

        <div className="mt-5 rounded-xl border border-border bg-background/60 p-4 text-xs leading-5 text-foreground-muted">
          A confirmation may be sent to the email
          address you provided.
        </div>

      </div>
    );
  }

  return (
    <div className="mt-7">

      {title && (
        <h3 className="text-xl font-extrabold tracking-[-0.03em] sm:text-2xl">
          {title}
        </h3>
      )}

      {description && (
        <p className="mt-2 text-sm leading-6 text-foreground-muted">
          {description}
        </p>
      )}

      <form
        onSubmit={
          handleSubmit
        }
        className="mt-6 space-y-4"
      >

        {fields.includes(
          'name'
        ) && (
          <InputField
            label="Full name"
            value={
              form.name
            }
            required
            onChange={
              value =>
                updateField(
                  'name',
                  value
                )
            }
          />
        )}

        {fields.includes(
          'email'
        ) && (
          <InputField
            label="Email address"
            type="email"
            value={
              form.email
            }
            required
            onChange={
              value =>
                updateField(
                  'email',
                  value
                )
            }
          />
        )}

        {fields.includes(
          'company'
        ) && (
          <InputField
            label="Company"
            value={
              form.company
            }
            onChange={
              value =>
                updateField(
                  'company',
                  value
                )
            }
          />
        )}

        {fields.includes(
          'phone'
        ) && (
          <InputField
            label="Phone"
            type="tel"
            value={
              form.phone
            }
            onChange={
              value =>
                updateField(
                  'phone',
                  value
                )
            }
          />
        )}

        {fields.includes(
          'attendees'
        ) && (
          <InputField
            label="Number of attendees"
            type="number"
            min="1"
            value={
              form.attendees
            }
            onChange={
              value =>
                updateField(
                  'attendees',
                  value
                )
            }
          />
        )}

        {fields.includes(
          'message'
        ) && (
          <TextareaField
            label="Message"
            value={
              form.message
            }
            onChange={
              value =>
                updateField(
                  'message',
                  value
                )
            }
          />
        )}

        {fields.includes(
          'notes'
        ) && (
          <TextareaField
            label="Notes"
            value={
              form.notes
            }
            onChange={
              value =>
                updateField(
                  'notes',
                  value
                )
            }
          />
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs leading-5 text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={
            loading
          }
          className="w-full rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? 'Submitting...'
            : submitText || 'Submit'}
        </button>

        <p className="text-center text-[10px] leading-5 text-foreground-muted">
          By submitting this form, you are
          providing your information to
          Auronix Commerce LLC for this
          campaign.
        </p>

      </form>

    </div>
  );
}

function InputField({
  label,
  type = 'text',
  value,
  required = false,
  min,
  onChange,
}: {
  label: string;

  type?: string;

  value: string;

  required?: boolean;

  min?: string;

  onChange: (
    value: string
  ) => void;
}) {
  return (
    <div>

      <label className="text-xs font-semibold">
        {label}
      </label>

      <input
        type={
          type
        }
        value={
          value
        }
        required={
          required
        }
        min={
          min
        }
        onChange={
          event =>
            onChange(
              event.target.value
            )
        }
        className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
      />

    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string;

  value: string;

  onChange: (
    value: string
  ) => void;
}) {
  return (
    <div>

      <label className="text-xs font-semibold">
        {label}
      </label>

      <textarea
        rows={4}
        value={
          value
        }
        onChange={
          event =>
            onChange(
              event.target.value
            )
        }
        className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-3 text-sm leading-6 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/10"
      />

    </div>
  );
}