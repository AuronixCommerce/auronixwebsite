'use client';
import { userFacingError } from '@/lib/user-facing-error';
import { Spinner } from '@/components/design/primitives';

import { useEffect, useState } from 'react';
import { onAuthChange } from '@/lib/auth';
import { sellerWorkspaceRequest } from '@/lib/seller-workspace-client';
import { SellerLayout } from '@/components/seller/seller-layout';
import { BellRing, Download, Gauge, MessageCircle, Save, Smartphone } from 'lucide-react';
import { auth } from '@/lib/firebase';

interface Settings {
  displayName: string;
  phone: string;
  businessName: string;
  website: string;
}

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

async function authorized(path: string, init: RequestInit = {}) {
  const user = auth.currentUser; if (!user) throw new Error('Your seller session has expired.'); const token = await user.getIdToken();
  const response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) }, cache: 'no-store' });
  const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'The settings request failed.'); return data;
}

function decodeVapid(value: string) { const padding = '='.repeat((4 - value.length % 4) % 4); const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw.split('').map(character => character.charCodeAt(0))); }

export default function SellerSettingsPage() {
  const [form, setForm] = useState<Settings>({
    displayName: '',
    phone: '',
    businessName: '',
    website: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [preferences, setPreferences] = useState({ email: true, push: false, whatsapp: false, whatsappPhone: '' });
  const [pushInfo, setPushInfo] = useState({ configured: false, publicKey: '', subscribed: false });
  const [reduceMotion, setReduceMotion] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [notificationSaving, setNotificationSaving] = useState(false);

  useEffect(() => {
    try { setReduceMotion(localStorage.getItem('auronix-reduce-glass-motion') === 'true'); } catch {}
    const install = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    window.addEventListener('beforeinstallprompt', install);
    return () => window.removeEventListener('beforeinstallprompt', install);
  }, []);

  useEffect(() => {
    return onAuthChange(async (user) => {
      if (!user) { setLoading(false); return; }
      try {
      const [workspace, dealRoom, push] = await Promise.all([sellerWorkspaceRequest(), authorized('/api/seller/deal-room').catch(() => ({ room: null })), authorized('/api/push/subscriptions').catch(() => ({ configured: false, publicKey: '', subscribed: false }))]); const data = workspace.profile || {};

      setForm({
        displayName: data.displayName || data.name || '',
        phone: data.phone || '',
        businessName: data.businessName || '',
        website: data.website || '',
      });
      if (dealRoom.room?.notificationPreferences) setPreferences(dealRoom.room.notificationPreferences);
      setPushInfo(push);

      } catch (loadError) { setError(loadError instanceof Error ? userFacingError(loadError) : 'Unable to load settings.'); }
      finally { setLoading(false); }
    });
  }, []);

  const save = async () => {
    setSaving(true); setError(''); setMessage('');

    try {
      await sellerWorkspaceRequest('', { method: 'PATCH', body: JSON.stringify({
        displayName: form.displayName.trim(),
        name: form.displayName.trim(),
        phone: form.phone.trim(),
        businessName: form.businessName.trim(),
        website: form.website.trim(),
      }) });
      setMessage('Settings saved successfully.');
    } catch (saveError) {
      setError(saveError instanceof Error ? userFacingError(saveError) : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const setMotion = (value: boolean) => { setReduceMotion(value); try { localStorage.setItem('auronix-reduce-glass-motion', String(value)); document.documentElement.dataset.acReduceMotion = String(value); window.dispatchEvent(new Event('auronix:motion-preference')); } catch {} };
  const saveNotifications = async () => { setNotificationSaving(true); setError(''); try { await authorized('/api/seller/deal-room', { method: 'PATCH', body: JSON.stringify({ action: 'preferences', ...preferences, push: pushInfo.subscribed }) }); setMessage('Notification preferences saved.'); } catch (caught) { setError(caught instanceof Error ? userFacingError(caught) : 'Unable to save notification preferences.'); } finally { setNotificationSaving(false); } };
  const togglePush = async () => {
    setNotificationSaving(true); setError('');
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Push notifications are not supported in this browser.');
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (pushInfo.subscribed) {
        await authorized('/api/push/subscriptions', { method: 'POST', body: JSON.stringify({ action: 'unsubscribe', endpoint: existing?.endpoint || '' }) }); await existing?.unsubscribe(); setPushInfo({ ...pushInfo, subscribed: false }); setPreferences({ ...preferences, push: false });
      } else {
        if (!pushInfo.configured || !pushInfo.publicKey) throw new Error('Device notifications are not available yet. Email updates remain active.');
        const permission = await Notification.requestPermission(); if (permission !== 'granted') throw new Error('Notification permission was not granted. You can change it in browser settings.');
        const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeVapid(pushInfo.publicKey) });
        await authorized('/api/push/subscriptions', { method: 'POST', body: JSON.stringify({ action: 'subscribe', subscription: subscription.toJSON() }) }); setPushInfo({ ...pushInfo, subscribed: true }); setPreferences({ ...preferences, push: true });
      }
    } catch (caught) { setError(caught instanceof Error ? userFacingError(caught) : 'Unable to update device notifications.'); }
    finally { setNotificationSaving(false); }
  };
  const install = async () => { if (!installPrompt) return; await installPrompt.prompt(); await installPrompt.userChoice; setInstallPrompt(null); };

  return (
    <SellerLayout>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Settings
          </h1>

          <p className="mt-2 text-sm text-foreground-muted">
            Manage your seller profile information.
          </p>
        </div>

        {loading ? (
          <div className="ac-content-panel p-12 flex justify-center">
            <Spinner className="w-6 h-6" />
          </div>
        ) : (
          <div className="ac-content-panel p-6 space-y-5">
            {error && <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}
            {message && <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm text-green-700 dark:text-green-300">{message}</div>}
            <Field
              label="Display Name"
              value={form.displayName}
              onChange={(value) =>
                setForm({ ...form, displayName: value })
              }
            />

            <Field
              label="Business Name"
              value={form.businessName}
              onChange={(value) =>
                setForm({ ...form, businessName: value })
              }
            />

            <Field
              label="Phone"
              value={form.phone}
              onChange={(value) =>
                setForm({ ...form, phone: value })
              }
            />

            <Field
              label="Website"
              value={form.website}
              onChange={(value) =>
                setForm({ ...form, website: value })
              }
            />

            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {saving ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
        {!loading && <>
          <section className="ac-content-panel p-6 space-y-5"><div className="flex items-start gap-3"><BellRing className="mt-0.5 h-5 w-5 text-accent" /><div><h2 className="text-lg font-semibold">Status notifications</h2><p className="mt-1 text-sm text-foreground-muted">Email stays on by default. Push and WhatsApp are optional status channels and are never used for verification or access.</p></div></div>
            <SettingToggle icon={BellRing} title="Email updates" description="Application, document, message, and review status updates." checked={preferences.email} onChange={(checked) => setPreferences({ ...preferences, email: checked })} />
            <SettingToggle icon={Smartphone} title="Device push notifications" description={pushInfo.configured ? 'Receive important workspace updates on this device.' : 'Awaiting push-service configuration; email remains active.'} checked={pushInfo.subscribed} onChange={() => togglePush()} disabled={notificationSaving} />
            <SettingToggle icon={MessageCircle} title="WhatsApp status updates" description="Optional one-way status notices only. Never authentication, OTP, or gating." checked={preferences.whatsapp} onChange={(checked) => setPreferences({ ...preferences, whatsapp: checked })} />
            {preferences.whatsapp && <Field label="WhatsApp phone with country code" value={preferences.whatsappPhone} onChange={(value) => setPreferences({ ...preferences, whatsappPhone: value })} />}
            <button className="ac-button" onClick={saveNotifications} disabled={notificationSaving}>{notificationSaving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}Save notification preferences</button>
          </section>
          <section className="ac-content-panel p-6 space-y-5"><div className="flex items-start gap-3"><Gauge className="mt-0.5 h-5 w-5 text-accent" /><div><h2 className="text-lg font-semibold">Display & installation</h2><p className="mt-1 text-sm text-foreground-muted">Tune the real-glass interface for this device.</p></div></div><SettingToggle icon={Gauge} title="Reduce glass motion" description="Keeps glass depth and blur while disabling pointer stretch, parallax, and elastic motion." checked={reduceMotion} onChange={setMotion} />
            <div className="ac-setting-row"><span className="ac-section-icon"><Download className="h-5 w-5" /></span><div><strong>Install Auronix</strong><p>{installPrompt ? 'Install the standalone app on this device.' : 'On iPhone or iPad, use Share → Add to Home Screen. On desktop, use your browser install control.'}</p></div>{installPrompt && <button onClick={install}>Install app</button>}</div>
          </section>
        </>}
      </div>
    </SellerLayout>
  );
}

function SettingToggle({ icon: Icon, title, description, checked, onChange, disabled = false }: { icon: any; title: string; description: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return <label className="ac-setting-row"><span className="ac-section-icon"><Icon className="h-5 w-5" /></span><div><strong>{title}</strong><p>{description}</p></div><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm"
      />
    </div>
  );
}
