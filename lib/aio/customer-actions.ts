export type CustomerField = {
  key: string;
  label: string;
  type?:
    | "text"
    | "email"
    | "tel"
    | "url"
    | "number"
    | "textarea"
    | "select"
    | "checkbox";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  options?: string[];
  help?: string;
};
export type CustomerStep = { title: string; fields: readonly CustomerField[] };
const field = (
  key: string,
  label: string,
  type: CustomerField["type"] = "text",
  required = true,
  extra: Partial<CustomerField> = {},
): CustomerField => ({ key, label, type, required, ...extra });
export const CUSTOMER_ACTIONS = {
  supplier_apply: {
    title: "Apply as a supplier",
    description: "Verify your email and send a supplier submission for review.",
    group: "Applications",
    mode: "write",
    account: false,
    steps: [
      {
        title: "Your contact",
        fields: [
          field("contactName", "Contact name"),
          field("companyName", "Company name"),
          field("email", "Contact email", "email"),
          field("phone", "Phone with country code", "tel"),
          field("country", "Country"),
        ],
      },
      {
        title: "Your business",
        fields: [
          field("categories", "Product categories"),
          field("brands", "Brands you supply", "text", false),
          field("website", "Company website", "url", false),
          field("catalogUrl", "Catalog link", "url", false),
          field("distributionModel", "Distribution model", "select", true, {
            options: [
              "Manufacturer",
              "Distributor",
              "Wholesaler",
              "Brand",
              "Other",
            ],
          }),
        ],
      },
      {
        title: "Commercial details",
        fields: [
          field(
            "minimumOrderQuantity",
            "Minimum order quantity",
            "text",
            false,
          ),
          field("pricingModel", "Pricing model", "text", false),
          field("leadTimeDays", "Lead time in days", "number", false),
          field(
            "message",
            "Tell us about your supply business",
            "textarea",
            true,
            { minLength: 20 },
          ),
          field(
            "consent",
            "I agree to be contacted about this supplier application.",
            "checkbox",
            true,
            {
              help: "This submits an application for review; it does not create or approve an account.",
            },
          ),
        ],
      },
    ],
  },
  seller_apply: {
    title: "Apply for a seller account",
    description:
      "Complete the application here. An approved invitation is required to activate an account.",
    group: "Applications",
    mode: "write",
    account: false,
    steps: [
      {
        title: "Contact information",
        fields: [
          field("fullName", "Full name"),
          field("businessName", "Business name"),
          field("businessEmail", "Business email", "email"),
          field("personalEmail", "Personal email", "email"),
          field("preferredContact", "Preferred contact email", "select", true, {
            options: ["business", "personal"],
          }),
          field("phone", "Phone with country code", "tel"),
        ],
      },
      {
        title: "Business address",
        fields: [
          field("country", "Country"),
          field("address", "Street address"),
          field("city", "City"),
          field("state", "State / province"),
          field("zipCode", "ZIP / postal code"),
          field("website", "Website", "url", false),
        ],
      },
      {
        title: "Partnership",
        fields: [
          field("businessType", "Business type", "select", true, {
            options: [
              "Manufacturer",
              "Distributor",
              "Wholesaler",
              "Brand",
              "Retailer",
              "Other",
            ],
          }),
          field("yearsInBusiness", "Years in business", "number", false),
          field("productCategories", "Product categories"),
          field("catalogUrl", "Catalog link", "url", false),
          field(
            "businessInformation",
            "Describe your business",
            "textarea",
            true,
            { minLength: 30 },
          ),
          field(
            "whyWorkWithAuronix",
            "Why work with Auronix?",
            "textarea",
            true,
            { minLength: 20 },
          ),
        ],
      },
      {
        title: "Review agreements",
        fields: [
          field(
            "contactAgreement",
            "I agree to be contacted about this application.",
            "checkbox",
          ),
          field(
            "sellerPolicyAgreement",
            "I have read and agree to the Seller Policy.",
            "checkbox",
            true,
            { help: "/seller/policy" },
          ),
        ],
      },
    ],
  },
  application_track: {
    title: "Track an application",
    description:
      "Verify an email from your seller application to see its current status.",
    group: "Applications",
    mode: "write",
    account: false,
    steps: [
      {
        title: "Application details",
        fields: [
          field("trackingId", "Tracking ID"),
          field("email", "Application email", "email"),
          field("emailType", "Email type", "select", true, {
            options: ["business", "personal"],
          }),
        ],
      },
    ],
  },
  newsletter_subscribe: {
    title: "Subscribe to updates",
    description:
      "Choose your updates and confirm your email using a one-time code.",
    group: "Email preferences",
    mode: "write",
    account: false,
    steps: [
      {
        title: "Your subscription",
        fields: [
          field("email", "Email address", "email"),
          field("name", "Name", "text", false),
          field("frequency", "Email frequency", "select", true, {
            options: ["weekly", "monthly", "important_only"],
          }),
          field("company", "Company news", "checkbox", false),
          field("sourcing", "Sourcing updates", "checkbox", false),
          field("sellers", "Seller updates", "checkbox", false),
          field("suppliers", "Supplier updates", "checkbox", false),
          field(
            "consent",
            "I want to receive the Auronix updates selected above.",
            "checkbox",
          ),
        ],
      },
    ],
  },
  newsletter_unsubscribe: {
    title: "Unsubscribe from updates",
    description: "Verify your email and stop newsletter messages.",
    group: "Email preferences",
    mode: "write",
    account: false,
    steps: [
      {
        title: "Your email",
        fields: [
          field("email", "Email address", "email"),
          field("reason", "Reason (optional)", "select", false, {
            options: [
              "prefer_not_to_say",
              "too_many_emails",
              "not_relevant",
              "privacy_concerns",
              "never_signed_up",
            ],
          }),
        ],
      },
    ],
  },
  newsletter_preferences: {
    title: "Change email preferences",
    description:
      "Adjust the topics and frequency for your verified newsletter address.",
    group: "Email preferences",
    mode: "write",
    account: false,
    steps: [
      {
        title: "Your preferences",
        fields: [
          field("email", "Email address", "email"),
          field("frequency", "Email frequency", "select", true, {
            options: ["weekly", "monthly", "important_only"],
          }),
          field("company", "Company news", "checkbox", false),
          field("sourcing", "Sourcing updates", "checkbox", false),
          field("sellers", "Seller updates", "checkbox", false),
          field("suppliers", "Supplier updates", "checkbox", false),
        ],
      },
    ],
  },
  email_me: {
    title: "Email me a copy",
    description: "Review a message and send it to your verified email.",
    group: "Email & support",
    mode: "write",
    account: false,
    steps: [
      {
        title: "Your email draft",
        fields: [
          field("email", "Your email", "email"),
          field("subject", "Subject", "text", true, { maxLength: 160 }),
          field("message", "Email message", "textarea", true, {
            minLength: 10,
            maxLength: 6000,
          }),
        ],
      },
    ],
  },
  support_create: {
    title: "Contact the support team",
    description:
      "Create a support ticket and email the team. You receive a copy.",
    group: "Email & support",
    mode: "write",
    account: false,
    steps: [
      {
        title: "Your support request",
        fields: [
          field("name", "Your name"),
          field("email", "Reply email", "email"),
          field("category", "Category", "select", true, {
            options: [
              "General Inquiry",
              "Account Issue",
              "Technical Support",
              "Partnership",
              "Seller Support",
              "Other",
            ],
          }),
          field("subject", "Subject", "text", true, { maxLength: 150 }),
          field("message", "Message", "textarea", true, {
            minLength: 10,
            maxLength: 5000,
          }),
        ],
      },
    ],
  },
  support_reply: {
    title: "Reply to my ticket",
    description: "Add a message to a ticket belonging to your account.",
    group: "Email & support",
    mode: "write",
    account: true,
    steps: [
      {
        title: "Your reply",
        fields: [
          field("ticketId", "Ticket ID"),
          field("message", "Reply", "textarea", true, { maxLength: 5000 }),
        ],
      },
    ],
  },
  support_close: {
    title: "Close my ticket",
    description: "Close your own support ticket after reviewing the change.",
    group: "Email & support",
    mode: "write",
    account: true,
    steps: [{ title: "Your ticket", fields: [field("ticketId", "Ticket ID")] }],
  },
  support_reopen: {
    title: "Reopen my ticket",
    description: "Reopen your own support ticket for a follow-up.",
    group: "Email & support",
    mode: "write",
    account: true,
    steps: [{ title: "Your ticket", fields: [field("ticketId", "Ticket ID")] }],
  },
  profile_update: {
    title: "Update my profile",
    description: "Update your contact and business information.",
    group: "My account",
    mode: "write",
    account: true,
    steps: [
      {
        title: "Your profile",
        fields: [
          field("displayName", "Display name"),
          field("businessName", "Business name", "text", false),
          field("phone", "Phone", "tel", false),
          field("website", "Website", "url", false),
        ],
      },
    ],
  },
  product_draft: {
    title: "Add a product draft",
    description: "Save a draft in your seller workspace for later review.",
    group: "Seller workspace",
    mode: "write",
    account: true,
    steps: [
      {
        title: "Product details",
        fields: [
          field("name", "Product name"),
          field("sku", "SKU", "text", false),
          field("category", "Category", "text", false),
          field("description", "Description", "textarea", false, {
            maxLength: 2000,
          }),
        ],
      },
    ],
  },
  catalog_add: {
    title: "Add a catalog",
    description: "Connect a catalog link to your seller workspace.",
    group: "Seller workspace",
    mode: "write",
    account: true,
    steps: [
      {
        title: "Catalog details",
        fields: [
          field("name", "Catalog name"),
          field("url", "Catalog URL", "url"),
          field("description", "Description", "textarea", false, {
            maxLength: 2000,
          }),
        ],
      },
    ],
  },
  my_profile: {
    title: "View my profile",
    description: "Read your own account details.",
    group: "My account",
    mode: "read",
    account: true,
    steps: [],
  },
  my_application: {
    title: "My account application",
    description: "View the application linked to your seller account.",
    group: "My account",
    mode: "read",
    account: true,
    steps: [],
  },
  my_tickets: {
    title: "My support tickets",
    description: "See your own support conversations and their references.",
    group: "My account",
    mode: "read",
    account: true,
    steps: [],
  },
  my_products: {
    title: "My product drafts",
    description: "View products in your own seller workspace.",
    group: "Seller workspace",
    mode: "read",
    account: true,
    steps: [],
  },
  my_catalogs: {
    title: "My catalogs",
    description: "View catalogs connected to your own seller workspace.",
    group: "Seller workspace",
    mode: "read",
    account: true,
    steps: [],
  },
  my_notifications: {
    title: "My notifications",
    description: "Read recent notifications for your own account.",
    group: "My account",
    mode: "read",
    account: true,
    steps: [],
  },
} as const satisfies Record<
  string,
  {
    title: string;
    description: string;
    group: string;
    mode: "read" | "write";
    account: boolean;
    steps: readonly CustomerStep[];
  }
>;
export type CustomerActionKind = keyof typeof CUSTOMER_ACTIONS;
export const CUSTOMER_ACTION_KINDS = Object.keys(
  CUSTOMER_ACTIONS,
) as CustomerActionKind[];
export function isCustomerActionKind(
  value: unknown,
): value is CustomerActionKind {
  return typeof value === "string" && Object.hasOwn(CUSTOMER_ACTIONS, value);
}
export function customerActionSteps(
  kind: CustomerActionKind,
): readonly CustomerStep[] {
  return CUSTOMER_ACTIONS[kind].steps as unknown as readonly CustomerStep[];
}
export function suggestCustomerAction(text: string): CustomerActionKind | null {
  const s = text.trim().toLowerCase();
  if (
    /\b(unsubscribe|unsubcribe|stop (?:the )?(?:newsletter|marketing|updates))\b/.test(
      s,
    )
  )
    return "newsletter_unsubscribe";
  if (
    /\b(newsletter|email (?:preferences|frequency)|subscription)\b/.test(s) &&
    /\b(change|manage|preferences|topics|frequency)\b/.test(s)
  )
    return "newsletter_preferences";
  if (
    /\b(subscribe|subcribe|sign me up)\b/.test(s) &&
    /\b(newsletter|updates|email)\b/.test(s)
  )
    return "newsletter_subscribe";
  if (
    /\bmy (?:seller )?application\b/.test(s) &&
    /\b(show|view|open|look up)\b/.test(s)
  )
    return "my_application";
  if (
    /\b(supplier|vendor)\b/.test(s) &&
    /\b(apply|application|register|sign up|signup|become|start)\b/.test(s)
  )
    return "supplier_apply";
  if (
    /\b(track|check|status)\b/.test(s) &&
    /\b(application|tracking)\b/.test(s)
  )
    return "application_track";
  if (
    /\bseller\b/.test(s) &&
    /\b(apply|application|register|sign up|signup|become)\b/.test(s)
  )
    return "seller_apply";
  if (
    /\b(email|send|mail)\b/.test(s) &&
    /\b(me|myself|my inbox|my email)\b/.test(s)
  )
    return "email_me";
  if (
    /\b(close|resolve)\b/.test(s) &&
    /\b(my )?(ticket|support request)\b/.test(s)
  )
    return "support_close";
  if (/\breopen\b/.test(s) && /\bticket\b/.test(s)) return "support_reopen";
  if (/\b(reply|respond|add a message)\b/.test(s) && /\bticket\b/.test(s))
    return "support_reply";
  if (
    /\b(contact|email|message|create|open)\b/.test(s) &&
    /\b(support|team|ticket)\b/.test(s)
  )
    return "support_create";
  if (
    /\b(update|change|edit)\b/.test(s) &&
    /\b(my profile|my phone|my business name|display name)\b/.test(s)
  )
    return "profile_update";
  if (/\b(add|create|save|new)\b/.test(s) && /\b(product|listing)\b/.test(s))
    return "product_draft";
  if (
    /\b(add|connect|upload|new)\b/.test(s) &&
    /\b(catalog|catalogue)\b/.test(s)
  )
    return "catalog_add";
  if (
    /\bmy\b/.test(s) &&
    /\b(tickets|support requests|support conversations)\b/.test(s)
  )
    return "my_tickets";
  if (/\bmy\b/.test(s) && /\b(products|drafts|listings)\b/.test(s))
    return "my_products";
  if (/\bmy\b/.test(s) && /\b(catalogs|catalogues)\b/.test(s))
    return "my_catalogs";
  if (/\bmy\b/.test(s) && /\bnotifications\b/.test(s))
    return "my_notifications";
  if (/\bmy\b/.test(s) && /\b(profile|account details)\b/.test(s))
    return "my_profile";
  return null;
}

/** Serialize only fields defined for this action; UI defaults may include other forms' values. */
export function customerActionPayload(kind: CustomerActionKind, draft: Record<string, unknown>) {
  const fields = customerActionSteps(kind).flatMap(step => step.fields.map(field => field.key));
  return Object.fromEntries(fields.filter(key => Object.prototype.hasOwnProperty.call(draft, key)).map(key => [key, draft[key]]));
}
