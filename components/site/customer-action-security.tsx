"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
export function CustomerActionSecurity({
  onToken,
  resetKey,
}: {
  onToken: (token: string) => void;
  resetKey: number;
}) {
  const container = useRef<HTMLDivElement>(null),
    widget = useRef<string>(),
    callback = useRef(onToken);
  callback.current = onToken;
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    const api = (window as any).turnstile;
    if (!sitekey || !ready || !container.current || !api) return;
    widget.current = api.render(container.current, {
      sitekey,
      size: "flexible",
      theme: "auto",
      callback: (token: string) => {
        setError("");
        callback.current(token);
      },
      "expired-callback": () => callback.current(""),
      "error-callback": () => {
        callback.current("");
        setError("The security check could not load. Please retry.");
      },
    });
    return () => {
      if (widget.current) api.remove(widget.current);
      widget.current = undefined;
    };
  }, [ready, sitekey]);
  useEffect(() => {
    if (resetKey && widget.current) {
      callback.current("");
      (window as any).turnstile?.reset(widget.current);
    }
  }, [resetKey]);
  if (!sitekey) return null;
  return (
    <div className="aio-action-security">
      <Script
        id="aio-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
        onError={() =>
          setError("The security check could not load. Please retry.")
        }
        strategy="afterInteractive"
      />
      <div ref={container} />
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
