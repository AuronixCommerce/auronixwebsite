import { lookup } from "dns/promises";
import { request } from "https";
import { BlockList, isIP } from "net";
const blocked = new BlockList();
for (const [ip, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as [string, number][])
  blocked.addSubnet(ip, bits, "ipv4");
const global6 = new BlockList();
global6.addSubnet("2000::", 3, "ipv6");
for (const [ip, bits] of [
  ["2001:db8::", 32],
  ["2001::", 32],
  ["2002::", 16],
  ["2001:20::", 28],
] as [string, number][])
  blocked.addSubnet(ip, bits, "ipv6");
export function publicAddress(ip: string) {
  const family = isIP(ip);
  return family === 4
    ? !blocked.check(ip, "ipv4")
    : family === 6 && global6.check(ip, "ipv6") && !blocked.check(ip, "ipv6");
}
export function webhookUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 2048)
    throw Error("Enter a public HTTPS webhook URL.");
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw Error("Enter a valid webhook URL.");
  }
  if (
    u.protocol !== "https:" ||
    (u.port && u.port !== "443") ||
    u.username ||
    u.password ||
    u.hash ||
    isIP(u.hostname.replace(/^\[|\]$/g, "")) ||
    !u.hostname.includes(".") ||
    /\.(local|localhost|internal|test|invalid)$/i.test(u.hostname)
  )
    throw Error(
      "Use a public HTTPS hostname on port 443, without credentials or a fragment.",
    );
  return u;
}
export async function resolveWebhook(value: string) {
  const url = webhookUrl(value);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const addresses = await Promise.race([
    lookup(url.hostname, { all: true, verbatim: true }),
    new Promise<never>((_r, reject) => {
      timer = setTimeout(
        () => reject(Error("Webhook DNS lookup timed out.")),
        3000,
      );
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw Error(
      "The webhook hostname must resolve only to public Internet addresses.",
    );
  return {
    url,
    address: addresses.find((a) => a.family === 4) || addresses[0],
  };
}
export async function postWebhook(
  target: string,
  body: string,
  headers: Record<string, string>,
) {
  // Re-resolve every attempt, reject mixed/private answers, pin the validated IP, and keep TLS hostname verification.
  const { url, address } = await resolveWebhook(target);
  return await new Promise<number>((resolve, reject) => {
    const req = request(
      url,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "Content-Length": String(Buffer.byteLength(body)),
        },
        family: address.family,
        servername: url.hostname,
        rejectUnauthorized: true,
        agent: false,
        signal: AbortSignal.timeout(4000),
        lookup: ((_host: any, opts: any, cb: any) =>
          opts?.all
            ? cb(null, [address])
            : cb(null, address.address, address.family)) as any,
      },
      (res) => {
        const status = res.statusCode || 0;
        res.resume();
        if (status >= 200 && status < 300) resolve(status);
        else
          reject(
            Object.assign(Error("Webhook endpoint did not accept delivery."), {
              status,
            }),
          );
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}
