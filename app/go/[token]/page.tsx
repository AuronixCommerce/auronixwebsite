import {
  getTemporaryNewsletterLink,
  recordTemporaryNewsletterView,
} from '@/lib/temporary-newsletter-links';

import {
  CampaignBlock,
} from '@/lib/campaign-page-schema';

import CampaignForm from './campaign-form';

export const dynamic =
  'force-dynamic';

function date(
  value: unknown
) {
  const timestamp =
    Number(value);

  if (
    !Number.isFinite(
      timestamp
    )
  ) {
    return null;
  }

  return new Date(
    timestamp
  ).toLocaleString(
    'en-US',
    {
      dateStyle:
        'medium',

      timeStyle:
        'short',
    }
  );
}

function Block({
  block,
}: {
  block: CampaignBlock;
}) {
  if (
    block.type ===
    'hero'
  ) {
    return null;
  }

  if (
    block.type ===
    'text'
  ) {
    return (
      <section className="rounded-[30px] border border-border bg-card/80 p-7 sm:p-9">
        {block.title && (
          <h2 className="text-2xl font-extrabold tracking-[-0.04em]">
            {block.title}
          </h2>
        )}

        <p className="mt-4 whitespace-pre-line text-sm leading-7 text-foreground-muted sm:text-base">
          {block.body}
        </p>
      </section>
    );
  }

  if (
    block.type ===
    'features'
  ) {
    return (
      <section className="rounded-[30px] border border-border bg-card/80 p-7 sm:p-9">

        {block.title && (
          <h2 className="text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">
            {block.title}
          </h2>
        )}

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {block.items.map(
            item => (
              <div
                key={
                  item.title
                }
                className="rounded-2xl border border-border bg-background/60 p-5"
              >
                <h3 className="font-bold">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-foreground-muted">
                  {item.description}
                </p>
              </div>
            )
          )}
        </div>

      </section>
    );
  }

  if (
    block.type ===
    'steps'
  ) {
    return (
      <section className="rounded-[30px] border border-border bg-card/80 p-7 sm:p-9">

        {block.title && (
          <h2 className="text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">
            {block.title}
          </h2>
        )}

        <div className="mt-7 space-y-4">
          {block.items.map(
            (
              item,
              index
            ) => (
              <div
                key={
                  item.title +
                  index
                }
                className="flex gap-4 rounded-2xl border border-border bg-background/60 p-5"
              >

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-primary-foreground">
                  {item.number ||
                    String(
                      index + 1
                    )}
                </div>

                <div>
                  <h3 className="font-bold">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-foreground-muted">
                    {item.description}
                  </p>
                </div>

              </div>
            )
          )}
        </div>

      </section>
    );
  }

  if (
    block.type ===
    'stats'
  ) {
    return (
      <section className="rounded-[30px] border border-border bg-card/80 p-7 sm:p-9">

        {block.title && (
          <h2 className="text-2xl font-extrabold">
            {block.title}
          </h2>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {block.items.map(
            item => (
              <div
                key={
                  item.label
                }
                className="rounded-2xl border border-border bg-background/60 p-6"
              >
                <div className="text-3xl font-extrabold tracking-[-0.05em]">
                  {item.value}
                </div>

                <div className="mt-2 text-xs text-foreground-muted">
                  {item.label}
                </div>
              </div>
            )
          )}
        </div>

      </section>
    );
  }

  if (
    block.type ===
    'quote'
  ) {
    return (
      <section className="rounded-[30px] border border-border bg-card/80 p-7 sm:p-9">

        <div className="text-xl font-semibold leading-8 tracking-[-0.02em] sm:text-2xl">
          “{block.quote}”
        </div>

        {block.author && (
          <div className="mt-5 text-sm font-bold">
            {block.author}
          </div>
        )}

        {block.role && (
          <div className="mt-1 text-xs text-foreground-muted">
            {block.role}
          </div>
        )}

      </section>
    );
  }

  if (
    block.type ===
    'faq'
  ) {
    return (
      <section className="rounded-[30px] border border-border bg-card/80 p-7 sm:p-9">

        {block.title && (
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            {block.title}
          </h2>
        )}

        <div className="mt-7 space-y-3">
          {block.items.map(
            item => (
              <details
                key={
                  item.question
                }
                className="rounded-2xl border border-border bg-background/60 p-5"
              >
                <summary className="cursor-pointer font-bold">
                  {item.question}
                </summary>

                <p className="mt-3 text-sm leading-6 text-foreground-muted">
                  {item.answer}
                </p>
              </details>
            )
          )}
        </div>

      </section>
    );
  }

  if (
    block.type ===
    'cta'
  ) {
    return (
      <section className="rounded-[30px] border border-border bg-primary p-7 text-primary-foreground sm:p-9">

        <h2 className="text-2xl font-extrabold sm:text-3xl">
          {block.title}
        </h2>

        {block.description && (
          <p className="mt-3 max-w-2xl text-sm leading-6 opacity-80">
            {block.description}
          </p>
        )}

        {block.buttonUrl && (
          <a
            href={
              block.buttonUrl
            }
            className="mt-6 inline-flex rounded-full bg-primary-foreground px-6 py-3 text-sm font-bold text-primary transition hover:-translate-y-0.5"
          >
            {block.buttonText}
          </a>
        )}

      </section>
    );
  }

  if (
    block.type ===
    'image'
  ) {
    return (
      <section className="overflow-hidden rounded-[30px] border border-border bg-card/80">

        <img
          src={
            block.imageUrl
          }
          alt={
            block.alt ||
            ''
          }
          className="h-auto w-full object-cover"
        />

        {(block.title ||
          block.caption) && (
          <div className="p-6">
            {block.title && (
              <h2 className="font-extrabold">
                {block.title}
              </h2>
            )}

            {block.caption && (
              <p className="mt-2 text-xs text-foreground-muted">
                {block.caption}
              </p>
            )}
          </div>
        )}

      </section>
    );
  }

  if (
    block.type ===
    'countdown'
  ) {
    return (
      <section className="rounded-[30px] border border-border bg-card/80 p-7 sm:p-9">

        {block.title && (
          <h2 className="text-2xl font-extrabold">
            {block.title}
          </h2>
        )}

        {block.label && (
          <p className="mt-3 text-sm text-foreground-muted">
            {block.label}
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-border bg-background/60 p-6">
          <div className="text-sm font-bold">
            Event timing
          </div>

          <div className="mt-2 text-lg font-extrabold">
            {date(
              block.targetAt
            ) || 'Coming soon'}
          </div>
        </div>

      </section>
    );
  }

  if (
    block.type ===
    'notice'
  ) {
    return (
      <section className="rounded-[24px] border border-border bg-secondary/40 p-6">

        {block.title && (
          <div className="font-bold">
            {block.title}
          </div>
        )}

        <p className="mt-2 text-sm leading-6 text-foreground-muted">
          {block.message}
        </p>

      </section>
    );
  }

  return null;
}

export default async function CampaignPage({
  params,
}: {
  params: {
    token: string;
  };
}) {
  const campaign =
    await getTemporaryNewsletterLink(
      params.token
    );

  if (
    !campaign
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16 font-sans text-foreground">

        <section className="ac-content-panel w-full max-w-lg p-8 text-center shadow-2xl">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <div className="h-4 w-4 rounded-full bg-white" />
          </div>

          <div className="mt-6 text-[10px] font-bold uppercase tracking-[0.22em] text-foreground-muted">
            Auronix Commerce LLC
          </div>

          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.05em]">
            Campaign Unavailable
          </h1>

          <p className="mt-4 text-sm leading-7 text-foreground-muted">
            This campaign has expired or is no longer available.
          </p>

          <a
            href="/"
            className="mt-7 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            Visit Auronix Commerce
          </a>

        </section>

      </main>
    );
  }

  try {
    await recordTemporaryNewsletterView(
      campaign.token
    );
  } catch (
    error
  ) {
    console.error(
      '[Campaign View]',
      error
    );
  }

  const page =
    campaign.pageData;

  return (
    <main className="min-h-screen bg-background font-sans text-foreground">

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        <div className="absolute left-[10%] top-[-220px] h-[520px] w-[520px] rounded-full bg-primary/10 blur-[130px]" />

        <div className="absolute right-[5%] top-[35%] h-[440px] w-[440px] rounded-full bg-accent/10 blur-[120px]" />

      </div>

      <div className="relative">

        <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-7 sm:px-8 lg:px-10">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary">
              <div className="h-4 w-4 rounded-full bg-white" />
            </div>

            <div>
              <div className="text-sm font-extrabold">
                AURONIX
              </div>

              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-foreground-muted">
                COMMERCE LLC
              </div>
            </div>

          </div>

          <div className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-foreground-muted">
            {page.badge}
          </div>

        </header>

        <section className="mx-auto w-full max-w-7xl px-5 pb-12 pt-10 sm:px-8 sm:pt-16 lg:px-10 lg:pt-20">

          <div className="grid items-start gap-10 lg:grid-cols-[1.08fr_0.92fr]">

            <div>

              {page.eyebrow && (
                <div className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                  {page.eyebrow}
                </div>
              )}

              <h1 className="mt-5 text-5xl font-extrabold leading-[0.94] tracking-[-0.065em] sm:text-6xl lg:text-8xl">
                {page.headline}
              </h1>

              {page.subheadline && (
                <p className="mt-7 max-w-2xl text-lg leading-8 text-foreground-muted sm:text-xl">
                  {page.subheadline}
                </p>
              )}

              {page.description && (
                <p className="mt-5 max-w-2xl text-sm leading-7 text-foreground-muted sm:text-base">
                  {page.description}
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">

                {page.primaryCtaText && (
                  <a
                    href={
                      campaign.url
                    }
                    className="rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5"
                  >
                    {
                      page.primaryCtaText
                    }
                  </a>
                )}

                {page.secondaryCtaText && (
                  <a
                    href={
                      page.secondaryCtaUrl ||
                      campaign.url
                    }
                    className="rounded-full border border-border bg-card/70 px-6 py-3.5 text-sm font-semibold backdrop-blur-xl transition hover:bg-secondary"
                  >
                    {
                      page.secondaryCtaText
                    }
                  </a>
                )}

              </div>

              {date(
                campaign.expiresAt
              ) && (
                <div className="mt-5 text-xs text-foreground-muted">
                  Campaign available until{' '}
                  {date(
                    campaign.expiresAt
                  )}
                </div>
              )}

            </div>

            {page.formEnabled && (
              <CampaignForm
                token={
                  campaign.token
                }

                title={
                  page.formTitle
                }

                description={
                  page.formDescription
                }

                submitText={
                  page.formSubmitText
                }

                fields={
                  page.formFields
                }

                successTitle={
                  page.successTitle
                }

                successMessage={
                  page.successMessage
                }
              />
            )}

          </div>

        </section>

        {page.blocks.length > 0 && (
          <section className="mx-auto grid w-full max-w-7xl gap-5 px-5 pb-20 sm:px-8 lg:px-10">

            {page.blocks.map(
              (
                block,
                index
              ) => (
                <Block
                  key={
                    index
                  }
                  block={
                    block
                  }
                />
              )
            )}

          </section>
        )}

        <footer className="border-t border-border bg-card/50">

          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">

            <div>
              <div className="text-sm font-extrabold">
                Auronix Commerce LLC
              </div>

              <div className="mt-1 text-xs text-foreground-muted">
                eCommerce · Procurement · Marketplace Operations
              </div>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">

              <a
                href="https://auronixcommerce.com"
                className="font-semibold underline underline-offset-4"
              >
                auronixcommerce.com
              </a>

              <a
                href="mailto:business@auronixcommerce.com"
                className="font-semibold underline underline-offset-4"
              >
                business@auronixcommerce.com
              </a>

            </div>

          </div>

        </footer>

      </div>

    </main>
  );
}