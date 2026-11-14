"use client";
import Link from "next/link";
import { useState } from "react";
import { downloadPaymentReceipt } from "./client";
const date = (n: number) => (n ? new Date(n).toLocaleString() : "—");
export function InvoicePayments({
  invoices,
  busy,
  onAction,
}: {
  invoices: any[];
  busy: boolean;
  onAction: (b: any) => Promise<void>;
}) {
  const [receiptError, setReceiptError] = useState(""),
    [downloading, setDownloading] = useState("");
  if (!invoices.length)
    return <p className="dev-empty">No credit purchase requests yet.</p>;
  return (
    <div className="dev-invoice-list">
      {receiptError && (
        <p className="dev-alert dev-error" role="alert">
          {receiptError}
        </p>
      )}
      {invoices.map((i) => (
        <article className="dev-payment-card" key={i.id}>
          <div className="dev-section-title">
            <div>
              <strong>
                {i.credits} credits · ${(i.usdCents / 100).toFixed(2)} USD
              </strong>
              <p>
                {date(i.createdAt)} · <code>{i.id}</code>
              </p>
            </div>
            <span className="dev-badge">{i.status.replaceAll("_", " ")}</span>
          </div>
          {i.adminNote && (
            <div className="dev-alert dev-preserve">
              <strong>Team update</strong>
              <p>{i.adminNote}</p>
            </div>
          )}
          {i.instructions && (
            <details
              open={["awaiting_payment", "needs_information"].includes(
                i.status,
              )}
            >
              <summary>Payment instructions from Auronix</summary>
              <p className="dev-preserve">{i.instructions}</p>
              <p className="dev-fine">
                Pay only to the destination confirmed here by Auronix. Include
                your request ID. Do not send card details, passwords, or
                verification codes.
              </p>
            </details>
          )}
          {i.status === "requested" && (
            <p>
              The team will send payment instructions here. Wait for those
              instructions before making a transfer.
            </p>
          )}
          {["awaiting_payment", "needs_information"].includes(i.status) &&
            i.instructions && (
              <form
                className="dev-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void onAction({
                    action: "submit-payment",
                    invoiceId: i.id,
                    reference: f.get("reference"),
                    method: f.get("method"),
                    note: f.get("note"),
                    confirmed: f.get("confirmed") === "on",
                    termsAccepted: f.get("terms") === "on",
                  });
                }}
              >
                <h3>Already sent payment?</h3>
                <div className="dev-form-grid">
                  <label>
                    Transfer / transaction reference
                    <input
                      name="reference"
                      required
                      minLength={4}
                      maxLength={160}
                      defaultValue={i.submission?.reference || ""}
                    />
                  </label>
                  <label>
                    Payment method
                    <input
                      name="method"
                      required
                      minLength={2}
                      maxLength={80}
                      defaultValue={i.submission?.method || ""}
                      placeholder="Bank transfer, PayPal, etc."
                    />
                  </label>
                </div>
                <label>
                  Note for the team{" "}
                  <span className="dev-muted">(optional)</span>
                  <textarea
                    name="note"
                    rows={2}
                    maxLength={1000}
                    defaultValue={i.submission?.note || ""}
                  />
                </label>
                <label className="dev-checkbox">
                  <input name="confirmed" type="checkbox" required />
                  <span>
                    I sent ${(i.usdCents / 100).toFixed(2)} USD using the team’s
                    instructions. I understand that a submitted reference is not
                    payment approval.
                  </span>
                </label>
                <label className="dev-checkbox">
                  <input name="terms" type="checkbox" required />
                  <span>
                    I accept the{" "}
                    <Link href="/aio/developers/terms" target="_blank">
                      API billing terms
                    </Link>
                    .
                  </span>
                </label>
                <button className="dev-primary" disabled={busy}>
                  Submit payment for review
                </button>
              </form>
            )}
          {i.submission && (
            <p className="dev-fine">
              Submitted {date(i.submission.submittedAt)} · {i.submission.method}{" "}
              · Reference: {i.submission.reference}
            </p>
          )}
          {i.status === "payment_submitted" && (
            <div className="dev-alert">
              Your payment is awaiting admin verification. Credits will appear
              only after approval.
            </div>
          )}
          {i.status === "approving" && (
            <div className="dev-alert">
              Admin approval is being finalized. Do not pay again. Contact the
              team if this status persists.
            </div>
          )}
          {i.status === "credited" && (
            <div className="dev-alert">
              <strong>Payment approved · {i.credits} credits added</strong>
              <button
                className="dev-secondary"
                disabled={downloading === i.id}
                onClick={() => {
                  setReceiptError("");
                  setDownloading(i.id);
                  void downloadPaymentReceipt(i.id)
                    .catch((e) => setReceiptError(e.message))
                    .finally(() => setDownloading(""));
                }}
              >
                {downloading === i.id
                  ? "Preparing receipt…"
                  : "Download payment receipt PDF"}
              </button>
              <p>
                Approved {date(i.creditedAt)}. Your credit addition and API
                spending are visible in Billing and Usage.
              </p>
            </div>
          )}
          {["requested", "awaiting_payment"].includes(i.status) &&
            !i.submission && (
              <button
                className="dev-secondary"
                disabled={busy}
                onClick={() =>
                  void onAction({ action: "cancel-invoice", invoiceId: i.id })
                }
              >
                Cancel unpaid request
              </button>
            )}
        </article>
      ))}
    </div>
  );
}
export function AdminInvoiceReview({
  invoice,
  uid,
  busy,
  onReview,
}: {
  invoice: any;
  uid: string;
  busy: boolean;
  onReview: (body: any) => Promise<void>;
}) {
  const [action, setAction] = useState("send-instructions"),
    [receiptError, setReceiptError] = useState("");
  return (
    <div className="dev-payment-review">
      <h3>Manual payment review</h3>
      {receiptError && (
        <p className="dev-alert dev-error" role="alert">
          {receiptError}
        </p>
      )}
      {invoice.status === "credited" && (
        <button
          className="dev-secondary"
          onClick={() =>
            void downloadPaymentReceipt(invoice.id, uid).catch((e) =>
              setReceiptError(e.message),
            )
          }
        >
          Download payment receipt PDF
        </button>
      )}
      <p>
        Request <code>{invoice.id}</code> ·{" "}
        <strong>{invoice.status.replaceAll("_", " ")}</strong>
      </p>
      {invoice.submission && (
        <div className="dev-alert">
          <strong>Customer payment claim — independently verify this</strong>
          <p>
            Method: {invoice.submission.method}
            <br />
            Reference: {invoice.submission.reference}
            <br />
            Submitted: {date(invoice.submission.submittedAt)}
          </p>
          <p className="dev-preserve">{invoice.submission.note}</p>
        </div>
      )}
      {["payment_submitted", "approving"].includes(invoice.status) && (
        <p className="dev-fine">
          Use the credit approval form below only after checking the actual
          payment. The received USD amount must match the locked quote.
          Repeating an approval cannot add the credits twice.
        </p>
      )}
      {!["credited", "approving", "cancelled", "rejected"].includes(
        invoice.status,
      ) && (
        <form
          className="dev-form"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void onReview({
              action: "invoice-review",
              uid,
              invoiceId: invoice.id,
              reviewAction: action,
              instructions: f.get("instructions"),
              note: f.get("note"),
            });
          }}
        >
          <label>
            Action
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="send-instructions">
                Send / update payment instructions
              </option>
              <option value="request-information">
                Request payment clarification
              </option>
              <option value="reject">Reject this payment request</option>
            </select>
          </label>
          {action === "send-instructions" && (
            <label>
              Verified payment destination &amp; instructions
              <textarea
                name="instructions"
                required
                minLength={20}
                maxLength={3000}
                rows={4}
                defaultValue={invoice.instructions || ""}
                placeholder="Enter your actual payment method, business payee, destination, amount, currency, and transfer-reference instructions."
              />
            </label>
          )}
          <label>
            Note to developer
            <textarea
              name="note"
              required
              maxLength={2000}
              rows={2}
              defaultValue={invoice.adminNote || ""}
            />
          </label>
          <button className="dev-secondary" disabled={busy}>
            Save and notify developer
          </button>
        </form>
      )}
    </div>
  );
}
