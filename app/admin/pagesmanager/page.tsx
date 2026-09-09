'use client';
import { Spinner } from '@/components/design/primitives';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe,
  Loader2,
  Search,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';

import {
  SITE_PAGES,
} from '@/lib/site-pages';

import {
  auth,
} from '@/lib/firebase';

import {
  AdminLayout,
} from '@/components/admin/admin-layout';

type PageControl = {
  path: string;

  /* ==========================================================
     WEBSITE / PAGE MAINTENANCE
     ========================================================== */

  maintenanceEnabled: boolean;

  maintenanceTitle: string;

  maintenanceMessage: string;

  scheduleEnabled: boolean;

  scheduleStartAt:
    | number
    | null;

  scheduleEndAt:
    | number
    | null;

  /* ==========================================================
     AI MAINTENANCE
     ========================================================== */

  aiMaintenanceEnabled: boolean;

  aiMaintenanceTitle: string;

  aiMaintenanceMessage: string;

  aiScheduleEnabled: boolean;

  aiScheduleStartAt:
    | number
    | null;

  aiScheduleEndAt:
    | number
    | null;

  /* ==========================================================
     PAGE POPUP
     ========================================================== */

  popupEnabled: boolean;

  popupTitle: string;

  popupMessage: string;

  popupButtonText: string;

  popupButtonUrl: string;

  popupFrequency:
    | 'once'
    | 'session'
    | 'always';

  popupUntilAt:
    | number
    | null;

  /* ==========================================================
     AUTOMATION / HEALTH
     ========================================================== */

  automaticMaintenanceEnabled: boolean;

  automaticRecoveryEnabled: boolean;

  failureThreshold: number;

  adminBypassEnabled: boolean;

  healthScore: number;

  healthStatus: string;

  consecutiveFailures: number;

  lastError: string;

  updatedAt?:
    | number;
};

type GlobalControl = {
  /* ==========================================================
     FULL WEBSITE
     ========================================================== */

  maintenanceEnabled: boolean;

  maintenanceTitle: string;

  maintenanceMessage: string;

  scheduleEnabled: boolean;

  scheduleStartAt:
    | number
    | null;

  scheduleEndAt:
    | number
    | null;

  automaticFullSiteShutdown: boolean;

  automaticRecovery: boolean;

  /* ==========================================================
     GLOBAL AI
     ========================================================== */

  aiMaintenanceEnabled: boolean;

  aiMaintenanceTitle: string;

  aiMaintenanceMessage: string;

  aiScheduleEnabled: boolean;

  aiScheduleStartAt:
    | number
    | null;

  aiScheduleEndAt:
    | number
    | null;
};

const EMPTY_PAGE:
  PageControl = {
  path: '',

  /* Website maintenance */

  maintenanceEnabled:
    false,

  maintenanceTitle:
    'This page is temporarily unavailable',

  maintenanceMessage:
    'We are making improvements to this page. Please check back shortly.',

  scheduleEnabled:
    false,

  scheduleStartAt:
    null,

  scheduleEndAt:
    null,

  /* AI maintenance */

  aiMaintenanceEnabled:
    false,

  aiMaintenanceTitle:
    'Auronix AI Maintenance',

  aiMaintenanceMessage:
    'Auronix AI is temporarily under maintenance. Please check back shortly.',

  aiScheduleEnabled:
    false,

  aiScheduleStartAt:
    null,

  aiScheduleEndAt:
    null,

  /* Popup */

  popupEnabled:
    false,

  popupTitle:
    'Important update',

  popupMessage:
    '',

  popupButtonText:
    'Learn More',

  popupButtonUrl:
    '',

  popupFrequency:
    'session',

  popupUntilAt:
    null,

  /* Automation */

  automaticMaintenanceEnabled:
    true,

  automaticRecoveryEnabled:
    false,

  failureThreshold:
    3,

  adminBypassEnabled:
    true,

  healthScore:
    100,

  healthStatus:
    'unknown',

  consecutiveFailures:
    0,

  lastError:
    '',
};

const EMPTY_GLOBAL:
  GlobalControl = {
  /* Full website */

  maintenanceEnabled:
    false,

  maintenanceTitle:
    'Auronix Commerce is temporarily unavailable',

  maintenanceMessage:
    'We are performing scheduled maintenance. Please check back soon.',

  scheduleEnabled:
    false,

  scheduleStartAt:
    null,

  scheduleEndAt:
    null,

  automaticFullSiteShutdown:
    false,

  automaticRecovery:
    false,

  /* Global AI */

  aiMaintenanceEnabled:
    false,

  aiMaintenanceTitle:
    'Auronix AI Maintenance',

  aiMaintenanceMessage:
    'Auronix AI is temporarily under maintenance. Please check back shortly.',

  aiScheduleEnabled:
    false,

  aiScheduleStartAt:
    null,

  aiScheduleEndAt:
    null,
};

function toDateInput(
  timestamp:
    | number
    | null
) {
  if (
    !timestamp
  ) {
    return '';
  }

  const date =
    new Date(
      timestamp
    );

  const offset =
    date.getTimezoneOffset();

  const local =
    new Date(
      date.getTime() -
        offset *
          60000
    );

  return local
    .toISOString()
    .slice(
      0,
      16
    );
}

function fromDateInput(
  value: string
) {
  if (
    !value
  ) {
    return null;
  }

  const timestamp =
    new Date(
      value
    ).getTime();

  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : null;
}

export default function AdminPagesManagerPage() {
  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    pages,
    setPages,
  ] =
    useState<
      Record<
        string,
        PageControl
      >
    >({});

  const [
    global,
    setGlobal,
  ] =
    useState<
      GlobalControl
    >(
      EMPTY_GLOBAL
    );

  const [
    selected,
    setSelected,
  ] =
    useState(
      SITE_PAGES[0]
        ?.path ||
        '/'
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    saving,
    setSaving,
  ] =
    useState(
      false
    );

  const [
    aiLoading,
    setAiLoading,
  ] =
    useState(
      false
    );

  const [
    notice,
    setNotice,
  ] =
    useState('');

  const filtered =
    useMemo(
      () => {
        const term =
          search
            .trim()
            .toLowerCase();

        if (
          !term
        ) {
          return SITE_PAGES;
        }

        return SITE_PAGES.filter(
          (
            page
          ) =>
            page.title
              .toLowerCase()
              .includes(
                term
              ) ||
            page.path
              .toLowerCase()
              .includes(
                term
              ) ||
            page.category
              .toLowerCase()
              .includes(
                term
              )
        );
      },
      [
        search,
      ]
    );

  const selectedPage =
    SITE_PAGES.find(
      (
        page
      ) =>
        page.path ===
        selected
    );

  const current =
    selectedPage
      ? {
          ...EMPTY_PAGE,
          ...(
            pages[
              selectedPage.path
            ] ||
            {}
          ),
          path:
            selectedPage.path,
        }
      : EMPTY_PAGE;

  async function api(
    url: string,
    init?: RequestInit
  ) {
    const token =
      await auth.currentUser?.getIdToken();

    return fetch(
      url,
      {
        ...init,

        headers: {
          'Content-Type':
            'application/json',

          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {}),

          ...(init?.headers ||
            {}),
        },
      }
    );
  }

  async function load() {
    setLoading(
      true
    );

    try {
      const response =
        await api(
          '/api/admin/page-controls'
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            'Unable to load page controls.'
        );
      }

      setPages(
        data.pages ||
          {}
      );

      setGlobal({
        ...EMPTY_GLOBAL,
        ...(data.global ||
          {}),
      });
    } catch (
      error
    ) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Unable to load page controls.'
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateGlobal(
    field:
      keyof GlobalControl,
    value:
      unknown
  ) {
    setGlobal(
      (
        old
      ) => ({
        ...old,

        [field]:
          value,
      })
    );
  }

  function updatePage(
    field:
      keyof PageControl,
    value:
      unknown
  ) {
    if (
      !selectedPage
    ) {
      return;
    }

    setPages(
      (
        old
      ) => ({
        ...old,

        [selectedPage.path]:
          {
            ...EMPTY_PAGE,

            ...(
              old[
                selectedPage.path
              ] ||
              {}
            ),

            path:
              selectedPage.path,

            [field]:
              value,
          },
      })
    );
  }

  function validateGlobal() {
    if (
      global.scheduleEnabled &&
      global.scheduleStartAt &&
      global.scheduleEndAt &&
      global.scheduleEndAt <=
        global.scheduleStartAt
    ) {
      return 'Full-site maintenance end time must be after the start time.';
    }

    if (
      global.aiScheduleEnabled &&
      global.aiScheduleStartAt &&
      global.aiScheduleEndAt &&
      global.aiScheduleEndAt <=
        global.aiScheduleStartAt
    ) {
      return 'Global AI maintenance end time must be after the start time.';
    }

    return null;
  }

  function validatePage() {
    if (
      current.scheduleEnabled &&
      current.scheduleStartAt &&
      current.scheduleEndAt &&
      current.scheduleEndAt <=
        current.scheduleStartAt
    ) {
      return 'Page maintenance end time must be after the start time.';
    }

    if (
      current.aiScheduleEnabled &&
      current.aiScheduleStartAt &&
      current.aiScheduleEndAt &&
      current.aiScheduleEndAt <=
        current.aiScheduleStartAt
    ) {
      return 'Page AI maintenance end time must be after the start time.';
    }

    return null;
  }

  async function saveGlobal() {
    const validation =
      validateGlobal();

    if (
      validation
    ) {
      setNotice(
        validation
      );

      return;
    }

    setSaving(
      true
    );

    try {
      const response =
        await api(
          '/api/admin/page-controls',
          {
            method:
              'POST',

            body:
              JSON.stringify({
                action:
                  'global',

                ...global,
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
            'Unable to save global maintenance settings.'
        );
      }

      setGlobal({
        ...EMPTY_GLOBAL,
        ...(data.global ||
          global),
      });

      setNotice(
        'Global website and AI maintenance settings saved.'
      );
    } catch (
      error
    ) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Unable to save global settings.'
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  async function toggleInstantFullSiteMaintenance() {
    const nextEnabled =
      !global.maintenanceEnabled;

    setGlobal(
      (
        old
      ) => ({
        ...old,
        maintenanceEnabled:
          nextEnabled,
        ...(!nextEnabled ? { scheduleEnabled: false, scheduleStartAt: null, scheduleEndAt: null } : {}),
      })
    );

    setSaving(
      true
    );

    try {
      const response =
        await api(
          '/api/admin/page-controls',
          {
            method:
              'POST',

            body:
              JSON.stringify({
                action:
                  'global',

                ...global,

                maintenanceEnabled:
                  nextEnabled,
                ...(!nextEnabled ? { scheduleEnabled: false, scheduleStartAt: null, scheduleEndAt: null } : {}),
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
            'Unable to change full-site maintenance.'
        );
      }

      setGlobal({
        ...EMPTY_GLOBAL,
        ...(data.global ||
          global),

        maintenanceEnabled:
          nextEnabled,
        ...(!nextEnabled ? { scheduleEnabled: false, scheduleStartAt: null, scheduleEndAt: null } : {}),
      });

      setNotice(
        nextEnabled
          ? '🚨 Full website maintenance is now ON.'
          : '✅ Full website maintenance is now OFF.'
      );
    } catch (
      error
    ) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Unable to change maintenance mode.'
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  async function togglePageMaintenance(value: boolean) {
    if (!selectedPage || saving) return;
    const next = {
      ...current,
      maintenanceEnabled: value,
      ...(!value ? {
        scheduleEnabled: false,
        scheduleStartAt: null,
        scheduleEndAt: null,
        automaticMaintenanceEnabled: false,
        healthStatus: 'healthy' as const,
        healthScore: 100,
        consecutiveFailures: 0,
        lastError: '',
      } : {}),
    };
    setPages(old => ({ ...old, [selectedPage.path]: next }));
    setSaving(true);
    try {
      const response = await api('/api/admin/page-controls', { method: 'POST', body: JSON.stringify({ action: 'page', ...next }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to change page maintenance.');
      setPages(old => ({ ...old, [selectedPage.path]: { ...EMPTY_PAGE, ...(data.page || next), path: selectedPage.path } }));
      setNotice(value ? `🚨 ${selectedPage.title} maintenance is now ON.` : `✅ ${selectedPage.title} maintenance is now fully OFF.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to change page maintenance.');
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function disableAllMaintenance() {
    if (saving) return;
    setSaving(true);
    try {
      const response = await api('/api/admin/page-controls', { method: 'POST', body: JSON.stringify({ action: 'disable-all' }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to disable all maintenance.');
      await load();
      setNotice('✅ All website and page maintenance is fully OFF. Schedules and automatic reactivation were also disabled.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to disable all maintenance.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleGlobalAiMaintenance() {
    const nextEnabled =
      !global.aiMaintenanceEnabled;

    setGlobal(
      (
        old
      ) => ({
        ...old,
        aiMaintenanceEnabled:
          nextEnabled,
      })
    );

    setSaving(
      true
    );

    try {
      const response =
        await api(
          '/api/admin/page-controls',
          {
            method:
              'POST',

            body:
              JSON.stringify({
                action:
                  'global',

                ...global,

                aiMaintenanceEnabled:
                  nextEnabled,
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
            'Unable to change AI maintenance.'
        );
      }

      setGlobal({
        ...EMPTY_GLOBAL,
        ...(data.global ||
          global),

        aiMaintenanceEnabled:
          nextEnabled,
      });

      setNotice(
        nextEnabled
          ? '🤖 Auronix AI maintenance is now ON.'
          : '✅ Auronix AI maintenance is now OFF.'
      );
    } catch (
      error
    ) {
      setGlobal(
        (
          old
        ) => ({
          ...old,
          aiMaintenanceEnabled:
            !nextEnabled,
        })
      );

      setNotice(
        error instanceof Error
          ? error.message
          : 'Unable to change AI maintenance.'
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  async function savePage() {
    if (
      !selectedPage
    ) {
      return;
    }

    const validation =
      validatePage();

    if (
      validation
    ) {
      setNotice(
        validation
      );

      return;
    }

    setSaving(
      true
    );

    try {
      const response =
        await api(
          '/api/admin/page-controls',
          {
            method:
              'POST',

            body:
              JSON.stringify({
                action:
                  'page',

                ...current,
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
            'Unable to save page settings.'
        );
      }

      setPages(
        (
          old
        ) => ({
          ...old,

          [selectedPage.path]:
            {
              ...EMPTY_PAGE,

              ...(
                data.page ||
                current
              ),

              path:
                selectedPage.path,
            },
        })
      );

      setNotice(
        `${selectedPage.title} settings saved.`
      );
    } catch (
      error
    ) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'Unable to save page.'
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  async function generateGlobalMessage(
    kind:
      | 'website'
      | 'ai'
  ) {
    setAiLoading(
      true
    );

    try {
      const response =
        await api(
          '/api/admin/page-controls/generate',
          {
            method:
              'POST',

            body:
              JSON.stringify({
                page:
                  '*',

                pageTitle:
                  kind ===
                  'ai'
                    ? 'Auronix AI'
                    : 'Auronix Commerce website',

                incident:
                  kind ===
                  'ai'
                    ? 'AI assistant maintenance.'
                    : 'Scheduled full-site maintenance.',
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
            'AI generation failed.'
        );
      }

      if (
        kind ===
        'ai'
      ) {
        setGlobal(
          (
            old
          ) => ({
            ...old,

            aiMaintenanceTitle:
              data.title,

            aiMaintenanceMessage:
              data.message,
          })
        );

        setNotice(
          'AI generated the global AI maintenance message.'
        );
      } else {
        setGlobal(
          (
            old
          ) => ({
            ...old,

            maintenanceTitle:
              data.title,

            maintenanceMessage:
              data.message,
          })
        );

        setNotice(
          'AI generated the full-site maintenance message.'
        );
      }
    } catch (
      error
    ) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'AI generation failed.'
      );
    } finally {
      setAiLoading(
        false
      );
    }
  }

  async function generatePageMessage(
    kind:
      | 'website'
      | 'ai'
  ) {
    if (
      !selectedPage
    ) {
      return;
    }

    setAiLoading(
      true
    );

    try {
      const response =
        await api(
          '/api/admin/page-controls/generate',
          {
            method:
              'POST',

            body:
              JSON.stringify({
                page:
                  selectedPage.path,

                pageTitle:
                  selectedPage.title,

                incident:
                  kind ===
                  'ai'
                    ? 'AI assistant maintenance for this page.'
                    : current.lastError ||
                      'Scheduled page maintenance.',
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
            'AI generation failed.'
        );
      }

      if (
        kind ===
        'ai'
      ) {
        updatePage(
          'aiMaintenanceTitle',
          data.title
        );

        updatePage(
          'aiMaintenanceMessage',
          data.message
        );

        setNotice(
          'AI generated the page AI maintenance message.'
        );
      } else {
        updatePage(
          'maintenanceTitle',
          data.title
        );

        updatePage(
          'maintenanceMessage',
          data.message
        );

        setNotice(
          'AI generated the page maintenance message.'
        );
      }
    } catch (
      error
    ) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'AI generation failed.'
      );
    } finally {
      setAiLoading(
        false
      );
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">

        {/* ====================================================
            HEADER
            ==================================================== */}

        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              AURONIX ADMIN
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight">
              Pages Manager
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground-muted">
              Control full-site maintenance, AI maintenance,
              page maintenance, schedules, popups, and public
              page availability from one place.
            </p>
          </div>

          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold hover:bg-secondary"
          >
            <ExternalLink className="h-4 w-4" />
            View Website
          </Link>

        </div>

        {notice && (
          <div className="ac-content-panel p-4 text-sm">
            {notice}
          </div>
        )}

        {/* ====================================================
            GLOBAL WEBSITE MAINTENANCE
            ==================================================== */}

        <section
          className={`rounded-3xl border p-6 ${
            global.maintenanceEnabled ||
            global.scheduleEnabled
              ? 'border-red-500/30 bg-red-500/5'
              : 'border-border bg-card'
          }`}
        >

          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary">
              <Globe className="h-6 w-6 text-accent" />
            </div>

            <div className="min-w-0 flex-1">

              <div className="flex flex-wrap items-center gap-2">

                <h2 className="text-lg font-semibold">
                  Full Website Maintenance
                </h2>

                {global.maintenanceEnabled && (
                  <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-red-700">
                    ACTIVE
                  </span>
                )}

                {global.scheduleEnabled && (
                  <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
                    SCHEDULED
                  </span>
                )}

              </div>

              <p className="mt-2 text-sm leading-6 text-foreground-muted">
                Block the entire public website while keeping
                all administrator routes available.
              </p>

              <div className="mt-5 space-y-4">

                <ToggleRow
                  label="Schedule full-site maintenance"
                  description="Visitors receive an upcoming notice before the start time and the full maintenance screen during the active window."
                  enabled={
                    global.scheduleEnabled
                  }
                  onChange={(
                    value
                  ) =>
                    updateGlobal(
                      'scheduleEnabled',
                      value
                    )
                  }
                />

                <div className="grid gap-4 md:grid-cols-2">

                  <DateField
                    label="Start"
                    value={toDateInput(
                      global.scheduleStartAt
                    )}
                    onChange={(
                      value
                    ) =>
                      updateGlobal(
                        'scheduleStartAt',
                        fromDateInput(
                          value
                        )
                      )
                    }
                  />

                  <DateField
                    label="Finish"
                    value={toDateInput(
                      global.scheduleEndAt
                    )}
                    onChange={(
                      value
                    ) =>
                      updateGlobal(
                        'scheduleEndAt',
                        fromDateInput(
                          value
                        )
                      )
                    }
                  />

                </div>

                <input
                  value={
                    global.maintenanceTitle
                  }
                  onChange={(
                    event
                  ) =>
                    updateGlobal(
                      'maintenanceTitle',
                      event.target.value
                    )
                  }
                  placeholder="Full-site maintenance title"
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                />

                <textarea
                  value={
                    global.maintenanceMessage
                  }
                  onChange={(
                    event
                  ) =>
                    updateGlobal(
                      'maintenanceMessage',
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Full-site maintenance message"
                  className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm leading-6"
                />

                <div className="flex flex-wrap gap-3">

                  <button
                    type="button"
                    disabled={saving}
                    onClick={disableAllMaintenance}
                    className="inline-flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-xs font-bold text-green-700 hover:bg-green-500/15 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Turn All Maintenance OFF
                  </button>

                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={
                      toggleInstantFullSiteMaintenance
                    }
                    className={
                      global.maintenanceEnabled
                        ? 'inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/20 hover:bg-red-700 disabled:opacity-50'
                        : 'inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-500/15 disabled:opacity-50'
                    }
                  >
                    <Zap className="h-4 w-4" />

                    {global.maintenanceEnabled
                      ? '🚨 Turn Full-Site Maintenance OFF'
                      : '🚨 Instant Full-Site Maintenance ON'}
                  </button>

                  <button
                    type="button"
                    disabled={
                      aiLoading
                    }
                    onClick={() =>
                      generateGlobalMessage(
                        'website'
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <Spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}

                    Generate Website Message
                  </button>

                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={
                      saveGlobal
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? (
                      <Spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}

                    Save Website Maintenance
                  </button>

                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            GLOBAL AI MAINTENANCE
            ==================================================== */}

        <section
          className={`rounded-3xl border p-6 ${
            global.aiMaintenanceEnabled ||
            global.aiScheduleEnabled
              ? 'border-violet-500/30 bg-violet-500/5'
              : 'border-border bg-card'
          }`}
        >

          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10">
              <Sparkles className="h-6 w-6 text-violet-600" />
            </div>

            <div className="min-w-0 flex-1">

              <div className="flex flex-wrap items-center gap-2">

                <h2 className="text-lg font-semibold">
                  Global AI Maintenance
                </h2>

                {global.aiMaintenanceEnabled && (
                  <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-700">
                    AI MAINTENANCE ON
                  </span>
                )}

              </div>

              <p className="mt-2 text-sm leading-6 text-foreground-muted">
                The website remains available, but Auronix AI
                enters maintenance mode. Visitors can press
                Continue, but every AI request remains
                maintenance-only on the server.
              </p>

              <div className="mt-5 space-y-4">

                <ToggleRow
                  label="AI Maintenance"
                  description="Put the entire Auronix AI assistant into maintenance mode without disabling the website."
                  enabled={
                    global.aiMaintenanceEnabled
                  }
                  onChange={(
                    value
                  ) =>
                    updateGlobal(
                      'aiMaintenanceEnabled',
                      value
                    )
                  }
                />

                <ToggleRow
                  label="Schedule AI maintenance"
                  description="Automatically activate AI maintenance only during the configured period."
                  enabled={
                    global.aiScheduleEnabled
                  }
                  onChange={(
                    value
                  ) =>
                    updateGlobal(
                      'aiScheduleEnabled',
                      value
                    )
                  }
                />

                <div className="grid gap-4 md:grid-cols-2">

                  <DateField
                    label="AI Start"
                    value={toDateInput(
                      global.aiScheduleStartAt
                    )}
                    onChange={(
                      value
                    ) =>
                      updateGlobal(
                        'aiScheduleStartAt',
                        fromDateInput(
                          value
                        )
                      )
                    }
                  />

                  <DateField
                    label="AI Finish"
                    value={toDateInput(
                      global.aiScheduleEndAt
                    )}
                    onChange={(
                      value
                    ) =>
                      updateGlobal(
                        'aiScheduleEndAt',
                        fromDateInput(
                          value
                        )
                      )
                    }
                  />

                </div>

                <input
                  value={
                    global.aiMaintenanceTitle
                  }
                  onChange={(
                    event
                  ) =>
                    updateGlobal(
                      'aiMaintenanceTitle',
                      event.target.value
                    )
                  }
                  placeholder="AI maintenance title"
                  className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                />

                <textarea
                  value={
                    global.aiMaintenanceMessage
                  }
                  onChange={(
                    event
                  ) =>
                    updateGlobal(
                      'aiMaintenanceMessage',
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="AI maintenance message"
                  className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm leading-6"
                />

                <div className="flex flex-wrap gap-3">

                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={
                      toggleGlobalAiMaintenance
                    }
                    className={
                      global.aiMaintenanceEnabled
                        ? 'inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-700 disabled:opacity-50'
                        : 'inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-xs font-bold text-violet-700 hover:bg-violet-500/15 disabled:opacity-50'
                    }
                  >
                    <Sparkles className="h-4 w-4" />

                    {global.aiMaintenanceEnabled
                      ? 'Turn AI Maintenance OFF'
                      : 'Turn AI Maintenance ON'}
                  </button>

                  <button
                    type="button"
                    disabled={
                      aiLoading
                    }
                    onClick={() =>
                      generateGlobalMessage(
                        'ai'
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <Spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}

                    Generate AI Message
                  </button>

                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={
                      saveGlobal
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? (
                      <Spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}

                    Save AI Maintenance
                  </button>

                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            SEARCH
            ==================================================== */}

        <div className="relative">

          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />

          <input
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search pages..."
            className="h-12 w-full ac-content-panel pl-11 pr-4 text-sm"
          />

        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_500px]">

          {/* ==================================================
              PAGE LIST
              ================================================== */}

          <div className="space-y-3">

            {filtered.map(
              (
                page
              ) => {

                const control = {
                  ...EMPTY_PAGE,

                  ...(
                    pages[
                      page.path
                    ] ||
                    {}
                  ),

                  path:
                    page.path,
                };

                return (
                  <button
                    type="button"
                    key={
                      page.path
                    }
                    onClick={() =>
                      setSelected(
                        page.path
                      )
                    }
                    className={`w-full rounded-2xl border p-5 text-left transition ${
                      selected ===
                      page.path
                        ? 'border-accent bg-accent/5'
                        : 'border-border bg-card hover:bg-secondary/30'
                    }`}
                  >

                    <div className="flex items-center justify-between gap-4">

                      <div className="min-w-0">

                        <div className="font-semibold">
                          {
                            page.title
                          }
                        </div>

                        <div className="mt-1 font-mono text-xs text-foreground-muted">
                          {
                            page.path
                          }
                        </div>

                      </div>

                      <div className="flex shrink-0 items-center gap-2">

                        {control.scheduleEnabled && (
                          <CalendarClock className="h-4 w-4 text-accent" />
                        )}

                        {control.maintenanceEnabled ? (
                          <Wrench className="h-4 w-4 text-red-600" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}

                        {control.aiMaintenanceEnabled && (
                          <Sparkles className="h-4 w-4 text-violet-600" />
                        )}

                      </div>

                    </div>

                  </button>
                );
              }
            )}

          </div>

          {/* ==================================================
              PAGE EDITOR
              ================================================== */}

          <div className="rounded-3xl border border-border bg-card p-6">

            {selectedPage && (
              <>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                    PAGE CONTROL
                  </div>

                  <h2 className="mt-2 text-xl font-semibold">
                    {
                      selectedPage.title
                    }
                  </h2>

                  <p className="mt-1 font-mono text-xs text-foreground-muted">
                    {
                      selectedPage.path
                    }
                  </p>
                </div>

                {/* ============================================
                    PAGE WEBSITE SCHEDULE
                    ============================================ */}

                <div className="mt-6 rounded-2xl border border-border p-5">

                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-accent" />

                    <h3 className="font-semibold">
                      Dedicated Page Schedule
                    </h3>
                  </div>

                  <p className="mt-1 text-xs leading-5 text-foreground-muted">
                    Schedule downtime for this page only.
                    Home can show visitors the upcoming schedule.
                  </p>

                  <div className="mt-5 space-y-4">

                    <ToggleRow
                      label="Schedule this page"
                      description="Activate page maintenance automatically during the scheduled window."
                      enabled={
                        current.scheduleEnabled
                      }
                      onChange={(
                        value
                      ) =>
                        updatePage(
                          'scheduleEnabled',
                          value
                        )
                      }
                    />

                    <div className="grid gap-4 md:grid-cols-2">

                      <DateField
                        label="Start"
                        value={toDateInput(
                          current.scheduleStartAt
                        )}
                        onChange={(
                          value
                        ) =>
                          updatePage(
                            'scheduleStartAt',
                            fromDateInput(
                              value
                            )
                          )
                        }
                      />

                      <DateField
                        label="Finish"
                        value={toDateInput(
                          current.scheduleEndAt
                        )}
                        onChange={(
                          value
                        ) =>
                          updatePage(
                            'scheduleEndAt',
                            fromDateInput(
                              value
                            )
                          )
                        }
                      />

                    </div>

                  </div>

                </div>

                {/* ============================================
                    PAGE WEBSITE MAINTENANCE
                    ============================================ */}

                <div className="mt-5 rounded-2xl border border-border p-5">

                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-red-600" />

                    <h3 className="font-semibold">
                      Page Maintenance
                    </h3>
                  </div>

                  <div className="mt-4">

                    <ToggleRow
                      label="Maintenance"
                      description="Manually keep this page under maintenance."
                      enabled={
                        current.maintenanceEnabled
                      }
                      onChange={togglePageMaintenance}
                    />

                  </div>

                  <input
                    value={
                      current.maintenanceTitle
                    }
                    onChange={(
                      event
                    ) =>
                      updatePage(
                        'maintenanceTitle',
                        event.target.value
                      )
                    }
                    placeholder="Maintenance title"
                    className="mt-4 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  />

                  <textarea
                    value={
                      current.maintenanceMessage
                    }
                    onChange={(
                      event
                    ) =>
                      updatePage(
                        'maintenanceMessage',
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="Maintenance message"
                    className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm leading-6"
                  />

                  <button
                    type="button"
                    disabled={
                      aiLoading
                    }
                    onClick={() =>
                      generatePageMessage(
                        'website'
                      )
                    }
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                  >
                    {aiLoading ? (
                      <Spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}

                    Generate Maintenance Message
                  </button>

                </div>

                {/* ============================================
                    PAGE AI MAINTENANCE
                    ============================================ */}

                <div
                  className={`mt-5 rounded-2xl border p-5 ${
                    current.aiMaintenanceEnabled ||
                    current.aiScheduleEnabled
                      ? 'border-violet-500/30 bg-violet-500/5'
                      : 'border-border'
                  }`}
                >

                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600" />

                    <h3 className="font-semibold">
                      Page AI Maintenance
                    </h3>

                  </div>

                  <p className="mt-1 text-xs leading-5 text-foreground-muted">
                    The page itself stays available, but AI
                    enters maintenance mode only when visitors
                    are chatting from this page.
                  </p>

                  <div className="mt-5 space-y-4">

                    <ToggleRow
                      label="AI Maintenance"
                      description="Restrict AI to the maintenance response for this page."
                      enabled={
                        current.aiMaintenanceEnabled
                      }
                      onChange={(
                        value
                      ) =>
                        updatePage(
                          'aiMaintenanceEnabled',
                          value
                        )
                      }
                    />

                    <ToggleRow
                      label="Schedule AI maintenance"
                      description="Automatically activate page AI maintenance during the configured period."
                      enabled={
                        current.aiScheduleEnabled
                      }
                      onChange={(
                        value
                      ) =>
                        updatePage(
                          'aiScheduleEnabled',
                          value
                        )
                      }
                    />

                    <div className="grid gap-4 md:grid-cols-2">

                      <DateField
                        label="AI Start"
                        value={toDateInput(
                          current.aiScheduleStartAt
                        )}
                        onChange={(
                          value
                        ) =>
                          updatePage(
                            'aiScheduleStartAt',
                            fromDateInput(
                              value
                            )
                          )
                        }
                      />

                      <DateField
                        label="AI Finish"
                        value={toDateInput(
                          current.aiScheduleEndAt
                        )}
                        onChange={(
                          value
                        ) =>
                          updatePage(
                            'aiScheduleEndAt',
                            fromDateInput(
                              value
                            )
                          )
                        }
                      />

                    </div>

                    <input
                      value={
                        current.aiMaintenanceTitle
                      }
                      onChange={(
                        event
                      ) =>
                        updatePage(
                          'aiMaintenanceTitle',
                          event.target.value
                        )
                      }
                      placeholder="AI maintenance title"
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    />

                    <textarea
                      value={
                        current.aiMaintenanceMessage
                      }
                      onChange={(
                        event
                      ) =>
                        updatePage(
                          'aiMaintenanceMessage',
                          event.target.value
                        )
                      }
                      rows={4}
                      placeholder="AI maintenance message"
                      className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm leading-6"
                    />

                    <button
                      type="button"
                      disabled={
                        aiLoading
                      }
                      onClick={() =>
                        generatePageMessage(
                          'ai'
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
                    >
                      {aiLoading ? (
                        <Spinner className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}

                      Generate AI Maintenance Message
                    </button>

                  </div>

                </div>

                {/* ============================================
                    PAGE POPUP
                    ============================================ */}

                <div className="mt-5 rounded-2xl border border-border p-5">

                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-accent" />

                    <h3 className="font-semibold">
                      Page Popup
                    </h3>
                  </div>

                  <p className="mt-1 text-xs leading-5 text-foreground-muted">
                    This is the existing dedicated page popup.
                    It is independent from website and AI
                    maintenance.
                  </p>

                  <div className="mt-4">

                    <ToggleRow
                      label="Page Popup"
                      description="Show a dedicated popup on this page."
                      enabled={
                        current.popupEnabled
                      }
                      onChange={(
                        value
                      ) =>
                        updatePage(
                          'popupEnabled',
                          value
                        )
                      }
                    />

                  </div>

                  <input
                    value={
                      current.popupTitle
                    }
                    onChange={(
                      event
                    ) =>
                      updatePage(
                        'popupTitle',
                        event.target.value
                      )
                    }
                    placeholder="Popup title"
                    className="mt-4 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  />

                  <textarea
                    value={
                      current.popupMessage
                    }
                    onChange={(
                      event
                    ) =>
                      updatePage(
                        'popupMessage',
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="Popup content"
                    className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm leading-6"
                  />

                  <div className="mt-4 grid gap-4 md:grid-cols-2">

                    <input
                      value={
                        current.popupButtonText
                      }
                      onChange={(
                        event
                      ) =>
                        updatePage(
                          'popupButtonText',
                          event.target.value
                        )
                      }
                      placeholder="Button text"
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    />

                    <input
                      value={
                        current.popupButtonUrl
                      }
                      onChange={(
                        event
                      ) =>
                        updatePage(
                          'popupButtonUrl',
                          event.target.value
                        )
                      }
                      placeholder="Button URL"
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    />

                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">

                    <div>
                      <label className="text-xs font-semibold">
                        Frequency
                      </label>

                      <select
                        value={
                          current.popupFrequency
                        }
                        onChange={(
                          event
                        ) =>
                          updatePage(
                            'popupFrequency',
                            event.target.value
                          )
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                      >
                        <option value="once">
                          Once
                        </option>

                        <option value="session">
                          Session
                        </option>

                        <option value="always">
                          Always
                        </option>
                      </select>
                    </div>

                    <DateField
                      label="Popup Until"
                      value={toDateInput(
                        current.popupUntilAt
                      )}
                      onChange={(
                        value
                      ) =>
                        updatePage(
                          'popupUntilAt',
                          fromDateInput(
                            value
                          )
                        )
                      }
                    />

                  </div>

                </div>

                {/* ============================================
                    HEALTH / AUTOMATION
                    ============================================ */}

                <div className="mt-5 rounded-2xl border border-border p-5">

                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-accent" />

                    <h3 className="font-semibold">
                      Automation & Health
                    </h3>
                  </div>

                  <div className="mt-5 space-y-4">

                    <ToggleRow
                      label="Automatic maintenance"
                      description="Allow health monitoring to place this page into maintenance after repeated failures."
                      enabled={
                        current.automaticMaintenanceEnabled
                      }
                      onChange={(
                        value
                      ) =>
                        updatePage(
                          'automaticMaintenanceEnabled',
                          value
                        )
                      }
                    />

                    <ToggleRow
                      label="Automatic recovery"
                      description="Allow the system to recover the page when health checks become healthy again."
                      enabled={
                        current.automaticRecoveryEnabled
                      }
                      onChange={(
                        value
                      ) =>
                        updatePage(
                          'automaticRecoveryEnabled',
                          value
                        )
                      }
                    />

                    <ToggleRow
                      label="Admin bypass"
                      description="Allow authenticated administrators to preview or access this page while it is under maintenance."
                      enabled={
                        current.adminBypassEnabled
                      }
                      onChange={(
                        value
                      ) =>
                        updatePage(
                          'adminBypassEnabled',
                          value
                        )
                      }
                    />

                    <div className="grid gap-4 md:grid-cols-3">

                      <div>
                        <label className="text-xs font-semibold">
                          Failure threshold
                        </label>

                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={
                            current.failureThreshold
                          }
                          onChange={(
                            event
                          ) =>
                            updatePage(
                              'failureThreshold',
                              Math.max(
                                1,
                                Number(
                                  event.target.value ||
                                    1
                                )
                              )
                            )
                          }
                          className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold">
                          Health score
                        </label>

                        <div className="mt-2 flex h-11 items-center rounded-xl border border-border bg-secondary/30 px-3 text-sm font-bold">
                          {
                            current.healthScore
                          }
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold">
                          Status
                        </label>

                        <div className="mt-2 flex h-11 items-center rounded-xl border border-border bg-secondary/30 px-3 text-sm font-semibold">
                          {
                            current.healthStatus
                          }
                        </div>
                      </div>

                    </div>

                    <div className="rounded-xl border border-border bg-secondary/20 p-4">

                      <div className="text-xs font-semibold">
                        Consecutive failures
                      </div>

                      <div className="mt-1 text-2xl font-bold">
                        {
                          current.consecutiveFailures
                        }
                      </div>

                      {current.lastError && (
                        <div className="mt-2 rounded-lg bg-red-500/5 px-3 py-2 text-xs leading-5 text-red-700">
                          {
                            current.lastError
                          }
                        </div>
                      )}

                    </div>

                  </div>

                </div>

                {/* ============================================
                    PAGE ACTIONS
                    ============================================ */}

                <div className="mt-5 flex flex-wrap gap-3">

                  <Link
                    href={
                      selectedPage.path
                    }
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-secondary"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Preview Page
                  </Link>

                  <button
                    type="button"
                    disabled={
                      saving
                    }
                    onClick={
                      savePage
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {saving ? (
                      <Spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}

                    Save Page
                  </button>

                </div>

              </>
            )}

          </div>

        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-5 text-xs text-foreground-muted">
            <Spinner className="h-4 w-4 animate-spin" />
            Loading page controls...
          </div>
        )}

      </div>
    </AdminLayout>
  );
}

function DateField({
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

      <input
        type="datetime-local"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
      />
    </div>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (
    value: boolean
  ) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">

      <div className="min-w-0">
        <div className="text-sm font-semibold">
          {label}
        </div>

        <p className="mt-1 max-w-md text-xs leading-5 text-foreground-muted">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={() =>
          onChange(
            !enabled
          )
        }
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled
            ? 'bg-green-500'
            : 'border border-gray-300 bg-white'
        }`}
        aria-pressed={
          enabled
        }
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full shadow-sm transition ${
            enabled
              ? 'left-6 bg-white'
              : 'left-1 bg-gray-400'
          }`}
        />
      </button>

    </div>
  );
}
