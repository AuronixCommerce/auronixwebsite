export const SUPPLIER_FIELDS = [
  "companyName",
  "contactName",
  "email",
  "phone",
  "website",
  "country",
  "categories",
  "yearsInBusiness",
  "distributionModel",
  "catalogUrl",
  "brands",
  "minimumOrderQuantity",
  "pricingModel",
  "currency",
  "leadTimeDays",
  "incoterms",
  "commercialNotes",
  "message",
] as const;
export const text = (value: unknown, max = 2000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
export const validId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-zA-Z0-9_-]{1,160}$/.test(value);
export const emailAddress = (value: unknown) => text(value, 320).toLowerCase();
export const isEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function cleanDraft(value: any, email: string) {
  const result: Record<string, string | boolean> = {};
  for (const key of SUPPLIER_FIELDS)
    result[key] = text(
      value?.[key],
      key === "message" || key === "commercialNotes" ? 5000 : 1000,
    );
  result.email = email;
  result.consent = false;
  return result;
}
export const DEFAULT_TEMPLATES = [
  {
    id: "pricing",
    title: "Request pricing",
    subject: "Pricing details for your supplier submission",
    body: "Thank you for your submission. Please share your current wholesale pricing, currency, minimum order quantity, and any volume tiers.",
  },
  {
    id: "authorization",
    title: "Request authorization",
    subject: "Brand authorization documents requested",
    body: "Please upload your available brand authorization or distributor documentation in your secure supplier workspace. Let us know if a document does not apply.",
  },
  {
    id: "samples",
    title: "Discuss samples",
    subject: "Product sample details",
    body: "Please share sample availability, sample pricing, and estimated lead times. We will confirm any purchase separately before an order is placed.",
  },
  {
    id: "details",
    title: "Missing application details",
    subject: "More information for your supplier submission",
    body: "We need a little more information to continue reviewing your submission. Please review the document requests in your secure workspace and reply with the missing details.",
  },
];
export function checklist(
  form: any,
  files: { catalog?: boolean; authorization?: boolean },
  requests: any[] = [],
) {
  return [
    {
      label: "Company and contact details",
      complete: !!(
        form.companyName?.trim() &&
        form.contactName?.trim() &&
        isEmail(emailAddress(form.email)) &&
        form.phone?.trim()
      ),
      required: true,
    },
    {
      label: "Product categories",
      complete: !!form.categories?.trim(),
      required: true,
    },
    {
      label: "Contact permission",
      complete: form.consent === true,
      required: true,
    },
    {
      label: "Product catalog or catalog link",
      complete: !!(files.catalog || form.catalogUrl?.trim()),
      required: false,
    },
    {
      label: "Brand authorization, if applicable",
      complete: !!files.authorization,
      required: false,
    },
    ...requests
      .filter((r) => r.status === "open")
      .map((r) => ({ label: r.title, complete: false, required: true })),
  ];
}
export function safeConversation(value: any) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-40)
    .filter(
      (v) =>
        v &&
        ["user", "assistant"].includes(v.role) &&
        typeof v.content === "string",
    )
    .map((v) => ({ role: v.role, content: text(v.content, 2000) }));
}
export function issueSummary(
  messages: Array<{ role: string; content: string }>,
  fallback = "",
) {
  const questions = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content);
  return text(questions.slice(-3).join("\n"), 1500) || text(fallback, 1500);
}
export function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
    if (rows.length > 5000)
      throw Error(
        "Preview supports up to 5,000 rows. Split the catalog into smaller files.",
      );
  }
  if (quoted) throw Error("A quoted CSV value is not closed. Check your file.");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export function catalogIssues(headers: string[], row: string[]) {
  const normalized = headers.map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, ""),
  );
  const issues: string[] = [];
  for (const aliases of [
    ["sku", "itemnumber", "productid"],
    ["productname", "name", "title", "description"],
    ["price", "unitprice", "wholesaleprice", "cost"],
  ]) {
    const index = normalized.findIndex((h) => aliases.includes(h));
    if (index < 0) issues.push("Missing " + aliases[0] + " column");
    else if (!row[index]?.trim()) issues.push("Missing " + headers[index]);
    else if (
      aliases[0] === "price" &&
      (!Number.isFinite(Number(row[index].replace(/[$,]/g, ""))) ||
        Number(row[index].replace(/[$,]/g, "")) <= 0)
    )
      issues.push("Invalid " + headers[index]);
  }
  return issues;
}
export function csvDownload(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const safe = /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
          return '"' + safe.replace(/"/g, '""') + '"';
        })
        .join(","),
    )
    .join("\r\n");
}
export const EVENT_NAMES = [
  "supplier_start",
  "supplier_section",
  "supplier_submit",
  "video_start",
  "video_25",
  "video_50",
  "video_75",
  "video_complete",
] as const;
