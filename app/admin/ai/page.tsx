"use client";
import { DEFAULT_AI_INSTRUCTIONS } from "@/lib/aio/settings";
import { onAuthStateChanged } from "firebase/auth";
import { userFacingError } from "@/lib/user-facing-error";
import { Spinner } from "@/components/design/primitives";

import { useEffect, useState } from "react";
import {
  Bot,
  Loader2,
  Save,
  ShieldCheck,
  MessageSquare,
  Brain,
  Settings2,
} from "lucide-react";

import { auth } from "@/lib/firebase";
import { AdminLayout } from "@/components/admin/admin-layout";
import { notifyAction } from "@/components/ui/confirm-action";

const DEFAULT_INSTRUCTIONS = DEFAULT_AI_INSTRUCTIONS;

export default function AdminAIPage() {
  const [publicChatEnabled, setPublicChatEnabled] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [replySettings, setReplySettings] = useState({
    aioReplyLength: "adaptive",
    aioTone: "professional",
    aioMaxResponseTokens: 1600,
    aioRetrievalLimit: 4,
    aioTemperature: 0.25,
    aioModel: "",
    aioFastModel: "openai/gpt-oss-20b",
  aioOneModel: "openai/gpt-oss-20b",
    aioFallbackModel: "",
  });
  const [customerSettings,setCustomerSettings]=useState({customerActionsEnabled:true,customerEmailEnabled:true,customerApplicationsEnabled:true,customerNewsletterEnabled:true});
  const [enabled, setEnabled] = useState(true);
  const [autoReplyWhenOffline, setAutoReplyWhenOffline] = useState(true);
  const [continueTicketConversations, setContinueTicketConversations] =
    useState(true);
  const [knowledgeEnabled, setKnowledgeEnabled] = useState(true);
  const [moderationEnabled, setModerationEnabled] = useState(true);
  const [customInstructions, setCustomInstructions] =
    useState(DEFAULT_INSTRUCTIONS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!auth.currentUser) return;

        const token = await auth.currentUser.getIdToken();

        const response = await fetch("/api/admin/ai-settings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load AI settings.");
        }

        if (cancelled) return;

        setPublicChatEnabled(data.publicChatEnabled !== false);
        setCustomerSettings(current=>Object.fromEntries(Object.keys(current).map(key=>[key,data[key]!==false])) as typeof current);
        setReplySettings(
          (current) =>
            Object.fromEntries(
              Object.entries(current).map(([key, value]) => [
                key,
                data[key] ?? value,
              ]),
            ) as typeof current,
        );
        setLoadError("");
        setEnabled(data.enabled !== false);
        setAutoReplyWhenOffline(data.autoReplyWhenOffline !== false);
        setContinueTicketConversations(
          data.continueTicketConversations !== false,
        );
        setKnowledgeEnabled(data.knowledgeEnabled !== false);
        setModerationEnabled(data.moderationEnabled !== false);
        setCustomInstructions(data.customInstructions || DEFAULT_INSTRUCTIONS);
      } catch (error) {
        console.error("AI settings load failed:", error);
        if (!cancelled)
          setLoadError(
            "AI settings could not be loaded. Reload this page before saving changes.",
          );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    const stopAuth = onAuthStateChanged(auth, (user) => {
      if (user) void load();
    });

    return () => {
      stopAuth();
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!auth.currentUser || saving || loading || loadError) return;

    setSaving(true);

    try {
      const token = await auth.currentUser.getIdToken();

      const response = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled,
          publicChatEnabled,
          ...replySettings,
          ...customerSettings,
          autoReplyWhenOffline,
          continueTicketConversations,
          knowledgeEnabled,
          moderationEnabled,
          customInstructions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save AI settings.");
      }

      notifyAction("AI settings saved successfully.");
    } catch (error) {
      notifyAction(
        error instanceof Error
          ? userFacingError(error)
          : "Unable to save AI settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl space-y-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-accent mb-3">
            AURONIX AI
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            AI Control Center
          </h1>

          <p className="mt-2 text-sm text-foreground-muted">
            Configure how AI handles support conversations, knowledge,
            moderation, and offline assistance.
          </p>
        </div>

        {loading ? (
          <div className="ac-content-panel p-10 flex justify-center">
            <Spinner className="w-6 h-6" />
          </div>
        ) : (
          <>
            {loadError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
              >
                {loadError}
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-4">{([{key:'customerActionsEnabled',title:'Customer actions in chat',description:'Allow typed self-service workflows with account checks, email verification and confirmation.'},{key:'customerEmailEnabled',title:'Customer email & support',description:'Let customers send reviewed messages to their own email and the support team.'},{key:'customerApplicationsEnabled',title:'Applications & tracking',description:'Offer supplier and seller application steps and email-verified tracking in chat.'},{key:'customerNewsletterEnabled',title:'Newsletter self-service',description:'Offer email-verified subscribe, unsubscribe and preference updates.'}] as const).map(item=><ToggleCard key={item.key} icon={<Bot className="w-5 h-5"/>} title={item.title} description={item.description} value={customerSettings[item.key]} onChange={value=>setCustomerSettings(current=>({...current,[item.key]:value}))}/>)}
              <ToggleCard
                icon={<MessageSquare className="w-5 h-5" />}
                title="Public AIO chat"
                description="Allow visitors to ask the website assistant questions."
                value={publicChatEnabled}
                onChange={setPublicChatEnabled}
              />

              <ToggleCard
                icon={<Bot className="w-5 h-5" />}
                title="AI Support"
                description="Enable AI-assisted support responses."
                value={enabled}
                onChange={setEnabled}
              />

              <ToggleCard
                icon={<MessageSquare className="w-5 h-5" />}
                title="Offline Auto Reply"
                description="Allow AI to respond when Admin is offline."
                value={autoReplyWhenOffline}
                onChange={setAutoReplyWhenOffline}
              />

              <ToggleCard
                icon={<Brain className="w-5 h-5" />}
                title="Conversation Memory"
                description="Let AI use the complete ticket conversation."
                value={continueTicketConversations}
                onChange={setContinueTicketConversations}
              />

              <ToggleCard
                icon={<Settings2 className="w-5 h-5" />}
                title="Knowledge Base"
                description="Use approved Auronix knowledge during responses."
                value={knowledgeEnabled}
                onChange={setKnowledgeEnabled}
              />

              <ToggleCard
                icon={<ShieldCheck className="w-5 h-5" />}
                title="Moderation"
                description="Flag suspicious or abusive support activity."
                value={moderationEnabled}
                onChange={setModerationEnabled}
              />
            </div>

            <section
              className="ac-content-panel p-6 space-y-6"
              aria-label="AI reply controls"
            >
              <div>
                <h2 className="font-semibold">Reply quality & delivery</h2>
                <p className="mt-2 text-sm text-foreground-muted">
                  Set the assistant’s defaults and response limits. Visitors can
                  choose their own reply length and tone in chat.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <label className="grid gap-2">
                  Default reply length
                  <select
                    className="px-3 py-2"
                    value={replySettings.aioReplyLength}
                    onChange={(e) =>
                      setReplySettings((v) => ({
                        ...v,
                        aioReplyLength: e.target.value,
                      }))
                    }
                  >
                    <option value="adaptive">Adaptive to the question</option>
                    <option value="brief">Brief</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  Default tone
                  <select
                    className="px-3 py-2"
                    value={replySettings.aioTone}
                    onChange={(e) =>
                      setReplySettings((v) => ({
                        ...v,
                        aioTone: e.target.value,
                      }))
                    }
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="direct">Direct</option>
                  </select>
                </label>
                <label className="grid gap-2">
                  Reply budget (tokens)
                  <input
                    className="px-3 py-2"
                    type="number"
                    min={200}
                    max={3000}
                    step={100}
                    value={replySettings.aioMaxResponseTokens}
                    onChange={(e) =>
                      setReplySettings((v) => ({
                        ...v,
                        aioMaxResponseTokens: Number(e.target.value),
                      }))
                    }
                  />
                  <small className="text-foreground-muted font-normal">
                    200–3000. Higher limits allow fuller answers and may take
                    longer.
                  </small>
                </label>
                <label className="grid gap-2">
                  Retrieved references
                  <input
                    className="px-3 py-2"
                    type="number"
                    min={1}
                    max={6}
                    value={replySettings.aioRetrievalLimit}
                    onChange={(e) =>
                      setReplySettings((v) => ({
                        ...v,
                        aioRetrievalLimit: Number(e.target.value),
                      }))
                    }
                  />
                  <small className="text-foreground-muted font-normal">
                    1–6 approved references per question.
                  </small>
                </label>
                <label className="grid gap-2 sm:col-span-2">
                  Response variation: {replySettings.aioTemperature.toFixed(2)}
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={replySettings.aioTemperature}
                    onChange={(e) =>
                      setReplySettings((v) => ({
                        ...v,
                        aioTemperature: Number(e.target.value),
                      }))
                    }
                  />
                  <small className="text-foreground-muted font-normal">
                    Lower values favor consistent wording; higher values add
                    variety.
                  </small>
                </label>
              </div>
              <details className="border-t border-border pt-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Model & fallback configuration
                </summary>
                <div className="grid sm:grid-cols-2 gap-5 mt-5">
                  <label className="grid gap-2">
                    Primary model
                    <input
                      className="px-3 py-2"
                      value={replySettings.aioModel}
                      placeholder="Use hosting configuration"
                      onChange={(e) =>
                        setReplySettings((v) => ({
                          ...v,
                          aioModel: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="grid gap-2">
                    Fallback model
                    <input
                      className="px-3 py-2"
                      value={replySettings.aioFallbackModel}
                      placeholder="Use hosting configuration"
                      onChange={(e) =>
                        setReplySettings((v) => ({
                          ...v,
                          aioFallbackModel: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="grid gap-2">
                    AIO 2 Fast model
                    <input
                      className="px-3 py-2"
                      value={replySettings.aioFastModel}
                      onChange={(e) =>
                        setReplySettings((v) => ({
                          ...v,
                          aioFastModel: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="grid gap-2">AIO One model<input className="px-3 py-2" value={replySettings.aioOneModel} onChange={e=>setReplySettings(v=>({...v,aioOneModel:e.target.value}))}/></label>
                  <p className="sm:col-span-2 text-xs leading-6 text-foreground-muted">
                    Use valid IDs supported by the configured provider. Leave
                    blank to inherit hosting settings. Fallback is tried before
                    any reply text has streamed.
                  </p>
                </div>
              </details>
            </section>
            <div className="ac-content-panel overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="font-semibold">AI Instructions</h2>

                <p className="text-sm text-foreground-muted mt-1">
                  Tell the AI exactly how you want it to behave.
                </p>
              </div>

              <div className="p-6">
                <textarea
                  value={customInstructions}
                  onChange={(event) =>
                    setCustomInstructions(event.target.value)
                  }
                  rows={18}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-4 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-accent/20"
                  placeholder="Tell the AI how to respond..."
                />

                <div className="mt-4 text-xs text-foreground-muted">
                  Keep instructions focused on support behavior. Sensitive
                  administrative actions remain protected.
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={save}
                disabled={saving || loading || Boolean(loadError)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 text-sm font-medium disabled:opacity-50"
              >
                {saving ? (
                  <Spinner className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}

                {saving ? "Saving…" : "Save AI Settings"}
              </button>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

function ToggleCard({
  icon,
  title,
  description,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="ac-content-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground-muted">
            {icon}
          </div>

          <div>
            <h3 className="font-semibold">{title}</h3>

            <p className="text-sm text-foreground-muted mt-1">{description}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onChange(!value)}
          className={`relative w-12 h-7 rounded-full transition-colors ${
            value ? "bg-primary" : "bg-secondary border border-border"
          }`}
          role="switch"
          aria-checked={value}
          aria-label={title}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
              value ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
