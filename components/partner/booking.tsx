"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock } from "lucide-react";
import { PartnerAccess, portalApi } from "./access";
export function PartnershipBooking() {
  const [slots, setSlots] = useState<any[]>([]),
    [selected, setSelected] = useState(""),
    [email, setEmail] = useState(""),
    [gate, setGate] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState<any>(null),
    [loaded, setLoaded] = useState(false),
    [zone, setZone] = useState("UTC"),
    [name, setName] = useState(""),
    [topic, setTopic] = useState("");
  async function load() {
    try {
      const d = await portalApi("/api/partner/bookings");
      setSlots(d.slots);
      setLoaded(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  }
  useEffect(() => {
    setZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    void load();
    void portalApi("/api/partner/workspace")
      .then((d) => setEmail(d.email))
      .catch(() => {});
  }, []);
  async function book(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) {
      setGate(true);
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const d = await portalApi("/api/partner/bookings", {
        action: "book",
        slotId: selected,
        name: form.get("name"),
        topic: form.get("topic"),
        confirmed: form.get("confirmed") === "on",
      });
      setReceipt(d);
      await load();
    } catch (e: any) {
      setError(e.message);
      if (e.status === 401) setGate(true);
      await load();
    } finally {
      setBusy(false);
    }
  }
  const slot = slots.find((s) => s.id === selected);
  return (
    <div className="op-booking">
      {error && (
        <p role="alert" className="op-error">
          {error}
        </p>
      )}
      {receipt ? (
        <div className="op-card">
          <Calendar />
          <h2>Your call is booked.</h2>
          <p>
            {new Date(receipt.booking.startsAt).toLocaleString()} ·{" "}
            {receipt.booking.duration} minutes
          </p>
          <p>
            {receipt.emailStatus === "queued"
              ? "Confirmation email is queued."
              : receipt.emailStatus === "failed"
                ? "The booking is saved. Email delivery needs attention."
                : "Confirmation email accepted by the mail service."}
          </p>
          <p>
            {receipt.booking.meetingUrl
              ? "Your meeting link is available in your workspace."
              : "The team will send connection details before the call."}
          </p>
          <div className="op-actions">
            <button
              className="op-secondary"
              onClick={() => {
                const b = receipt.booking,
                  stamp = (t: number) =>
                    new Date(t)
                      .toISOString()
                      .replace(/[-:]/g, "")
                      .replace(/\.\d{3}Z/, "Z"),
                  ics = [
                    "BEGIN:VCALENDAR",
                    "VERSION:2.0",
                    "PRODID:-//Auronix//Partnership//EN",
                    "BEGIN:VEVENT",
                    `UID:${b.id}@auronixcommerce.com`,
                    `DTSTAMP:${stamp(Date.now())}`,
                    `DTSTART:${stamp(b.startsAt)}`,
                    `DTEND:${stamp(b.startsAt + b.duration * 60000)}`,
                    "SUMMARY:Auronix partnership call",
                    "DESCRIPTION:Open your Auronix supplier workspace for connection details.",
                    "END:VEVENT",
                    "END:VCALENDAR",
                  ].join("\r\n");
                const url = URL.createObjectURL(
                    new Blob([ics], { type: "text/calendar" }),
                  ),
                  a = document.createElement("a");
                a.href = url;
                a.download = "auronix-partnership-call.ics";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Add to calendar
            </button>
            <Link className="op-primary" href="/supplier/track">
              Open workspace
            </Link>
          </div>
        </div>
      ) : (
        <div className="op-two-column">
          <section className="op-card">
            <span className="op-kicker">CHOOSE A TIME</span>
            <h2>Let’s find a time to talk.</h2>
            <label>
              Display time zone
              <select value={zone} onChange={(e) => setZone(e.target.value)}>
                {Array.from(
                  new Set([
                    zone,
                    "UTC",
                    "America/New_York",
                    "America/Los_Angeles",
                    "Europe/London",
                    "Asia/Karachi",
                    "Asia/Dubai",
                  ]),
                ).map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </label>
            <div className="op-slot-list">
              {!loaded ? (
                <p>Loading available times…</p>
              ) : error && !slots.length ? (
                <p>
                  Availability could not be loaded.{" "}
                  <button
                    type="button"
                    className="op-link"
                    onClick={() => {
                      setError("");
                      setLoaded(false);
                      void load();
                    }}
                  >
                    Retry availability
                  </button>
                </p>
              ) : !slots.length ? (
                <p>
                  No call times are currently published.{" "}
                  <Link href="/contact">Contact the team</Link> to arrange a
                  conversation.
                </p>
              ) : (
                slots.map((s) => (
                  <button
                    className={`op-slot ${selected === s.id ? "is-selected" : ""}`}
                    aria-pressed={selected === s.id}
                    key={s.id}
                    onClick={() => setSelected(s.id)}
                  >
                    <Calendar size={18} />
                    <span>
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: zone,
                      }).format(s.startsAt)}
                      <small>
                        <Clock size={12} />
                        {s.duration} minutes · {zone}
                      </small>
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
          <div>
            {gate ? (
              <PartnerAccess
                onVerified={(value) => {
                  setEmail(value);
                  setGate(false);
                }}
              />
            ) : (
              <form className="op-card" onSubmit={book}>
                <span className="op-kicker">YOUR CONVERSATION</span>
                <h2>A few details.</h2>
                <p>
                  {email
                    ? `Verified email: ${email}`
                    : "Verify your email before confirming your call."}
                </p>
                <label>
                  Your name
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  What would you like to discuss?
                  <textarea
                    name="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    rows={4}
                    required
                    minLength={5}
                    maxLength={1500}
                  />
                </label>
                {slot && (
                  <p>
                    Selected:{" "}
                    {new Date(slot.startsAt).toLocaleString("en", {
                      timeZone: zone,
                    })}{" "}
                    · {slot.duration} minutes
                  </p>
                )}
                <label className="op-checkbox">
                  <input type="checkbox" name="confirmed" required />
                  <span>
                    I confirm this time and agree to be contacted about this
                    call.
                  </span>
                </label>
                <button className="op-primary" disabled={!slot || busy}>
                  {busy
                    ? "Booking…"
                    : email
                      ? "Confirm booking"
                      : "Verify email to continue"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
