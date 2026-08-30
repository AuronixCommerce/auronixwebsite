'use client';

import {
  useEffect,
  useState,
} from 'react';
import Link from 'next/link';

import {
  onValue,
  ref,
} from 'firebase/database';

import {
  Bot,
  Eye,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Users,
  Trash2,
} from 'lucide-react';

import {
  auth,
  db,
} from '@/lib/firebase';

import {
  AdminLayout,
} from '@/components/admin/admin-layout';
import { confirmAction } from '@/components/ui/confirm-action';

type NewsletterDraft = {
  subject: string;
  preheader: string;
  html: string;
  text: string;
};

type Campaign = {
  id: string;
  subject?: string;
  type?: string;
  status?: string;
  createdAt?: number;
  completedAt?: number;
  totalRecipients?: number;
  sent?: number;
  failed?: number;
};

const EMPTY_DRAFT: NewsletterDraft = {
  subject: '',
  preheader: '',
  html: '',
  text: '',
};

export default function AdminNewsletterPage() {
  const [
    topic,
    setTopic,
  ] =
    useState('');

  const [
    instructions,
    setInstructions,
  ] =
    useState('');

  const [
    draft,
    setDraft,
  ] =
    useState<NewsletterDraft>(
      EMPTY_DRAFT
    );

  const [
    subscribers,
    setSubscribers,
  ] =
    useState(0);

  const [
    campaigns,
    setCampaigns,
  ] =
    useState<Campaign[]>(
      []
    );

  const [
    generating,
    setGenerating,
  ] =
    useState(false);

  const [
    sending,
    setSending,
  ] =
    useState(false);

  const [
    notice,
    setNotice,
  ] =
    useState('');

  useEffect(() => {
    if (!db) {
      return;
    }

    const unsubscribeSubscribers =
      onValue(
        ref(
          db,
          'newsletterSubscribers'
        ),
        (snapshot) => {
          const value =
            snapshot.exists()
              ? snapshot.val()
              : {};

          const activeCount =
            value &&
            typeof value ===
              'object'
              ? Object.values(
                  value as Record<
                    string,
                    {
                      active?: boolean;
                    }
                  >
                ).filter(
                  (item) =>
                    item.active ===
                    true
                ).length
              : 0;

          setSubscribers(
            activeCount
          );
        }
      );

    const unsubscribeCampaigns =
      onValue(
        ref(
          db,
          'newsletterCampaigns'
        ),
        (snapshot) => {
          const value =
            snapshot.exists()
              ? snapshot.val()
              : {};

          const list =
            value &&
            typeof value ===
              'object'
              ? Object.entries(
                  value as Record<
                    string,
                    Campaign
                  >
                )
                  .map(
                    ([
                      id,
                      campaign,
                    ]) => ({
                      ...campaign,
                      id,
                    })
                  )
                  .sort(
                    (
                      a,
                      b
                    ) =>
                      Number(
                        b.createdAt ||
                          0
                      ) -
                      Number(
                        a.createdAt ||
                          0
                      )
                  )
              : [];

          setCampaigns(
            list
          );
        }
      );

    return () => {
      unsubscribeSubscribers();
      unsubscribeCampaigns();
    };
  }, []);

  const getToken =
    async () => {
      if (
        !auth.currentUser
      ) {
        return '';
      }

      return auth.currentUser.getIdToken();
    };

  const generateNewsletter =
    async () => {
      if (
        generating ||
        !topic.trim()
      ) {
        return;
      }

      setGenerating(
        true
      );

      setNotice('');

      try {
        const token =
          await getToken();

        const response =
          await fetch(
            '/api/admin/newsletter/generate',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                ...(token
                  ? {
                      Authorization:
                        `Bearer ${token}`,
                    }
                  : {}),
              },

              body:
                JSON.stringify({
                  topic:
                    topic.trim(),

                  instructions:
                    instructions.trim(),
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

          console.error(
            'Newsletter generate returned non-JSON:',
            raw
          );

          throw new Error(
            `Newsletter generator returned an unexpected response (${response.status}).`
          );
        }

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              'Unable to generate newsletter.'
          );
        }

        setDraft(
          data.newsletter ||
            EMPTY_DRAFT
        );

        setNotice(
          'AI newsletter generated. Review the content before sending.'
        );
      } catch (
        error
      ) {
        setNotice(
          error instanceof Error
            ? error.message
            : 'Unable to generate newsletter.'
        );
      } finally {
        setGenerating(
          false
        );
      }
    };

  const sendNewsletter =
    async () => {
      if (
        sending
      ) {
        return;
      }

      if (
        !draft.subject.trim() ||
        !draft.html.trim() ||
        !draft.text.trim()
      ) {
        setNotice(
          'Subject, HTML, and plain-text content are required.'
        );

        return;
      }

      if (
        subscribers <=
        0
      ) {
        setNotice(
          'There are currently no active newsletter subscribers.'
        );

        return;
      }

      const confirmed =
        await confirmAction({
          title: 'Send this newsletter now?',
          description: `This sends the campaign to ${subscribers} active subscriber${subscribers === 1 ? '' : 's'}.`,
          confirmLabel: 'Send newsletter',
        });

      if (
        !confirmed
      ) {
        return;
      }

      setSending(
        true
      );

      setNotice('');

      try {
        const token =
          await getToken();

        const response =
          await fetch(
            '/api/admin/newsletter/send',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                ...(token
                  ? {
                      Authorization:
                        `Bearer ${token}`,
                    }
                  : {}),
              },

              body:
                JSON.stringify({
                  subject:
                    draft.subject.trim(),

                  html:
                    draft.html,

                  text:
                    draft.text,
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

          console.error(
            'Newsletter send returned non-JSON:',
            raw
          );

          throw new Error(
            `Newsletter send returned an unexpected response (${response.status}).`
          );
        }

        const data =
          await response.json();

        if (
          !response.ok
        ) {
          throw new Error(
            data.error ||
              'Unable to send newsletter.'
          );
        }

        setNotice(
          `Newsletter sent. ${data.sent ?? 0} delivered, ${data.failed ?? 0} failed.`
        );
      } catch (
        error
      ) {
        setNotice(
          error instanceof Error
            ? error.message
            : 'Unable to send newsletter.'
        );
      } finally {
        setSending(
          false
        );
      }
    };

  const deleteCampaign = async (
    campaignId: string,
    subject: string
  ) => {
    const confirmed =
      await confirmAction({
        title: `Delete “${subject}”?`,
        description: 'This permanently removes the campaign, its linked campaign page, and temporary URL.',
        confirmLabel: 'Delete campaign',
        destructive: true,
      });

    if (!confirmed) {
      return;
    }

    try {
      const token =
        await getToken();

      const response =
        await fetch(
          '/api/admin/newsletter/delete',
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',

              ...(token
                ? {
                    Authorization:
                      'Bearer ' +
                      token,
                  }
                : {}),
            },

            body:
              JSON.stringify({
                mode:
                  'single',

                campaignId,
              }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        data?.success !== true
      ) {
        throw new Error(
          data?.error ||
            'Unable to delete campaign.'
        );
      }

      setCampaigns(
        current =>
          current.filter(
            campaign =>
              campaign.id !==
              campaignId
          )
      );

      setNotice(
        'Campaign deleted successfully. ' +
        String(
          data.aiPagesDeleted || 0
        ) +
        ' linked AI page(s) were also deleted.'
      );
    } catch (
      error
    ) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Unable to delete campaign.'
      );
    }
  };

  const deleteAllCampaigns =
    async () => {
      if (
        campaigns.length ===
        0
      ) {
        return;
      }

      const confirmed =
        await confirmAction({
          title: 'Delete all newsletter campaigns?',
          description: 'This permanently removes every campaign, generated campaign page, and temporary campaign link. This cannot be undone.',
          confirmLabel: 'Delete everything',
          destructive: true,
        });

      if (!confirmed) {
        return;
      }

      try {
        const token =
          await getToken();

        const response =
          await fetch(
            '/api/admin/newsletter/delete',
            {
              method:
                'POST',

              headers: {
                'Content-Type':
                  'application/json',

                ...(token
                  ? {
                      Authorization:
                        'Bearer ' +
                        token,
                    }
                  : {}),
              },

              body:
                JSON.stringify({
                  mode:
                    'all',
                }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          data?.success !== true
        ) {
          throw new Error(
            data?.error ||
              'Unable to clear campaign history.'
          );
        }

        setCampaigns(
          []
        );

        setNotice(
          'Campaign history cleared. ' +
          String(
            data.campaignsDeleted || 0
          ) +
          ' campaign(s) and ' +
          String(
            data.aiPagesDeleted || 0
          ) +
          ' AI page(s) were deleted.'
        );
      } catch (
        error
      ) {
        setNotice(
          error instanceof Error
            ? error.message
            : 'Unable to clear campaign history.'
        );
      }
    };
  const clearDraft =
    () => {
      setDraft(
        EMPTY_DRAFT
      );

      setNotice('');
    };

  const previewNewsletter =
    () => {
      const preview =
        window.open(
          '',
          '_blank'
        );

      if (
        !preview
      ) {
        return;
      }

      preview.document.open();

      preview.document.write(
        draft.html ||
          '<p>No newsletter content yet.</p>'
      );

      preview.document.close();
    };

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              AURONIX ADMIN
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Newsletter Manager
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground-muted">
              Create professional newsletters with AI,
              review them, and send them to your active
              subscribers.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">

            <div className="col-span-2 grid grid-cols-3 gap-3"><Link href="/admin/newsletter/subscribers" className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3 py-2.5 text-center text-xs font-semibold transition hover:bg-secondary">Manage subscribers</Link><Link href="/admin/newsletter/reasons" className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3 py-2.5 text-center text-xs font-semibold transition hover:bg-secondary">Unsubscribe reasons</Link><Link href="/admin/newsletter/analytics" className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3 py-2.5 text-center text-xs font-semibold transition hover:bg-secondary">Analytics</Link></div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <Users className="h-4 w-4 text-foreground-muted" />

              <div className="mt-3 text-2xl font-semibold">
                {subscribers}
              </div>

              <div className="text-xs text-foreground-muted">
                Active subscribers
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <Mail className="h-4 w-4 text-foreground-muted" />

              <div className="mt-3 text-2xl font-semibold">
                {campaigns.length}
              </div>

              <div className="text-xs text-foreground-muted">
                Campaigns
              </div>
            </div>

          </div>
        </div>

        {/* NOTICE */}
        {notice && (
          <div className="rounded-2xl border border-border bg-card p-4 text-sm">
            {notice}
          </div>
        )}

        {/* COMPOSER */}
        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">

          {/* AI PANEL */}
          <section className="rounded-2xl border border-border bg-card p-6">

            <div className="flex items-start gap-3">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Bot className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold">
                  AI Newsletter Writer
                </h2>

                <p className="mt-1 text-xs leading-5 text-foreground-muted">
                  Describe what you want to tell subscribers
                  and AI will prepare a draft.
                </p>
              </div>

            </div>

            <div className="mt-6 space-y-5">

              <div>
                <label className="text-sm font-medium">
                  What should the newsletter be about?
                </label>

                <input
                  value={
                    topic
                  }
                  onChange={(
                    event
                  ) =>
                    setTopic(
                      event.target.value
                    )
                  }
                  placeholder="Example: New supplier portal launch"
                  className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Additional instructions
                </label>

                <textarea
                  value={
                    instructions
                  }
                  onChange={(
                    event
                  ) =>
                    setInstructions(
                      event.target.value
                    )
                  }
                  rows={8}
                  placeholder="Explain the points you want included, tone, CTA, audience, and anything else AI should know."
                  className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <button
                type="button"
                onClick={
                  generateNewsletter
                }
                disabled={
                  generating ||
                  !topic.trim()
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}

                {generating
                  ? 'Generating...'
                  : 'Generate with AI'}
              </button>

            </div>
          </section>

          {/* EDITOR */}
          <section className="rounded-2xl border border-border bg-card p-6">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="font-semibold">
                  Newsletter Editor
                </h2>

                <p className="mt-1 text-xs leading-5 text-foreground-muted">
                  You can edit anything AI generates before sending.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  clearDraft
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-secondary"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Clear
              </button>

            </div>

            <div className="mt-6 space-y-5">

              <div>
                <label className="text-sm font-medium">
                  Subject
                </label>

                <input
                  value={
                    draft.subject
                  }
                  onChange={(
                    event
                  ) =>
                    setDraft(
                      (
                        current
                      ) => ({
                        ...current,
                        subject:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Newsletter subject"
                  className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Preheader
                </label>

                <input
                  value={
                    draft.preheader
                  }
                  onChange={(
                    event
                  ) =>
                    setDraft(
                      (
                        current
                      ) => ({
                        ...current,
                        preheader:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Short preview text"
                  className="mt-2 h-12 w-full rounded-xl border border-border bg-background px-4 text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  HTML Content
                </label>

                <textarea
                  value={
                    draft.html
                  }
                  onChange={(
                    event
                  ) =>
                    setDraft(
                      (
                        current
                      ) => ({
                        ...current,
                        html:
                          event.target.value,
                      })
                    )
                  }
                  rows={16}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs leading-5"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Plain Text Content
                </label>

                <textarea
                  value={
                    draft.text
                  }
                  onChange={(
                    event
                  ) =>
                    setDraft(
                      (
                        current
                      ) => ({
                        ...current,
                        text:
                          event.target.value,
                      })
                    )
                  }
                  rows={8}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-6"
                />
              </div>

              <div className="flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={
                    previewNewsletter
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-medium hover:bg-secondary"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </button>

                <button
                  type="button"
                  onClick={
                    sendNewsletter
                  }
                  disabled={
                    sending ||
                    subscribers ===
                      0
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}

                  {sending
                    ? 'Sending...'
                    : `Send to ${subscribers} Subscribers`}
                </button>

              </div>

            </div>
          </section>
        </div>

        {/* CAMPAIGNS */}
        <section className="rounded-2xl border border-border bg-card">

          <div className="border-b border-border p-5">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="font-semibold">
                  Campaign History
                </h2>

                <p className="mt-1 text-xs text-foreground-muted">
                  {campaigns.length}
                  {' '}
                  campaign
                  {campaigns.length === 1 ? '' : 's'}
                </p>
              </div>

              {campaigns.length > 0 && (
                <button
                  type="button"
                  onClick={deleteAllCampaigns}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete All History
                </button>
              )}

            </div>

          </div>

          {campaigns.length === 0 ? (
            <div className="p-8 text-center text-sm text-foreground-muted">
              No newsletter campaigns have been sent yet.
            </div>
          ) : (
            <div className="divide-y divide-border">

              {campaigns.map(
                campaign => (
                  <div
                    key={campaign.id}
                    className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                  >

                    <div className="min-w-0">

                      <div className="font-medium">
                        {campaign.subject ||
                          'Untitled newsletter'}
                      </div>

                      <div className="mt-1 text-xs text-foreground-muted">
                        {campaign.status ||
                          'unknown'}

                        {' · '}

                        {campaign.createdAt
                          ? new Date(
                              campaign.createdAt
                            ).toLocaleString()
                          : 'Unknown date'}
                      </div>

                    </div>

                    <div className="flex flex-wrap items-center gap-3">

                      <div className="text-xs text-foreground-muted">
                        Sent:{' '}
                        {campaign.sent ??
                          0}

                        {' / '}

                        {campaign.totalRecipients ??
                          0}

                        {' · Failed: '}

                        {campaign.failed ??
                          0}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          deleteCampaign(
                            campaign.id,
                            campaign.subject ||
                              'Untitled newsletter'
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </section>

      </div>
    </AdminLayout>
  );
}
