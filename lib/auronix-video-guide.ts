export const AURONIX_OVERVIEW_VIDEO =
  "https://pub-b16dcf377d0647a5b33af7da32570957.r2.dev/Auronix_Commerce_Ad.mp4";
export const OVERVIEW_DURATION_SECONDS = 120;
export const OVERVIEW_CHAPTERS = [
  {
    title: "Welcome to Auronix",
    start: 0,
    end: 6,
    transcript:
      "Good products. Right connections. New possibilities. Welcome to Auronix Commerce.",
  },
  {
    title: "The commerce ecosystem",
    start: 6,
    end: 14,
    transcript:
      "From sourcing and supplier partnerships to marketplace operations and distribution. One connected approach, from source to sale.",
  },
  {
    title: "Meet AIO",
    start: 14,
    end: 21,
    transcript:
      "Meet AIO, the Auronix assistant. Ask a question, explore your options, and find your next step.",
  },
  {
    title: "Choose your mode",
    start: 21,
    end: 30,
    transcript:
      "Choose AIO One for relaxed replies, AIO 2 for balanced explanations, or AIO 2 Fast for everyday questions.",
  },
  {
    title: "From questions to actions",
    start: 30,
    end: 39,
    transcript:
      "Go from a question to an action. Start applications, track progress, manage subscriptions, create support tickets, or update your profile.",
  },
  {
    title: "Verify and review",
    start: 39,
    end: 47,
    transcript:
      "Enter your details, verify your email in a dedicated code box, and review the action before it is submitted.",
  },
  {
    title: "Your saved workspace",
    start: 47,
    end: 55,
    transcript:
      "Keep useful work close. Search and rename conversations, pin important answers, and return to your account-synced chat history.",
  },
  {
    title: "Answers with sources",
    start: 55,
    end: 63,
    transcript:
      "Approved company documents give AIO relevant context. Supporting source links help you check where an answer comes from.",
  },
  {
    title: "Support by topic",
    start: 63,
    end: 70,
    transcript:
      "Get topic-based support for applications, email and catalogs, with offline replies and escalation to the team.",
  },
  {
    title: "Application review",
    start: 70,
    end: 78,
    transcript:
      "AI-assisted screening flags missing application details. Administrators review the information and make the approval decision.",
  },
  {
    title: "Email operations",
    start: 78,
    end: 86,
    transcript:
      "Track email delivery, retry failed messages, and alert administrators about verification, recovery and notification issues.",
  },
  {
    title: "Partner workflows",
    start: 86,
    end: 93,
    transcript:
      "Manage seller drafts, catalogs, application tracking and partner resources through a clearer workflow.",
  },
  {
    title: "Keep a copy",
    start: 93,
    end: 99,
    transcript:
      "Download a transcript PDF, or verify your email to receive a copy.",
  },
  {
    title: "Service status",
    start: 99,
    end: 106,
    transcript:
      "See service status, planned maintenance, and incident updates on a dedicated public page.",
  },
  {
    title: "Make AIO your own",
    start: 106,
    end: 113,
    transcript:
      "Shape the experience with reply tone, length, context, memory preferences, and theme controls. Work your way.",
  },
  {
    title: "What’s next",
    start: 113,
    end: 120,
    transcript:
      "Auronix Commerce. Strong relationships. New possibilities. Start your conversation at auronixcommerce dot com.",
  },
];
export function videoTimestamp(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
export const OVERVIEW_GUIDE_MARKDOWN = [
  "# Meet Auronix: the video guide",
  "A two-minute introduction to Auronix Commerce and AIO.",
  "## Start with AIO",
  "Open /aio/chat, choose an assistant mode, and ask your question. You can also use the popup chat on the website.",
  "## Take an action",
  "Choose Actions in chat to start a supplier or seller application, track an application, manage newsletter preferences, contact support, or use your account tools. Enter verification codes only in the dedicated code box, then review and confirm. Account tools require the appropriate signed-in account.",
  "## Keep useful work",
  "Sign in and enable chat memory to search and rename conversations, pin answers, and return to your account history. Use Email conversation to request a copy.",
  "## Find your next step",
  "Supplier applications: /supplier\nSeller applications: /seller/apply\nTechnical guides: /help\nService updates: /status",
  "## Video transcript",
  ...OVERVIEW_CHAPTERS.map(
    (chapter) =>
      `### ${videoTimestamp(chapter.start)} — ${chapter.title}\n${chapter.transcript}`,
  ),
  `Watch online: https://auronixcommerce.com/guide\nVideo: ${AURONIX_OVERVIEW_VIDEO}`,
].join("\n\n");
