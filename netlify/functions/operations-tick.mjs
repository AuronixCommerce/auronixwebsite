export default async function () {
  const secret = process.env.CRON_SECRET;
  const origin = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!secret || !origin)
    throw new Error(
      "Set CRON_SECRET and the production site URL for scheduled operations.",
    );
  const results = await Promise.all(
    ["email-queue", "offline-support"].map(async (task) => {
      const response = await fetch(new URL(`/api/cron/${task}`, origin), {
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(24000),
      });
      if (!response.ok) throw new Error(`${task} returned ${response.status}`);
      return response.json();
    }),
  );
  return new Response(JSON.stringify(results));
}
export const config = { schedule: "* * * * *" };
