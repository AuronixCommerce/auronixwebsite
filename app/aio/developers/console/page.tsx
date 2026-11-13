import { DeveloperConsole } from "@/components/developers/console";
import { buildSeo } from "@/lib/seo";
export const metadata = buildSeo({
  title: "AIO Developer Console",
  description:
    "Manage your AIO developer account, API keys, billing credits, and usage.",
  path: "/aio/developers/console",
  noIndex: true,
});
export default function Page() {
  return <DeveloperConsole />;
}
