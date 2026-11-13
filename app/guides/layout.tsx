import { buildSeo } from "@/lib/seo";
export const metadata = buildSeo({
  title: "Guide Library",
  description:
    "Watch Auronix video tutorials and explore guides for suppliers, accounts, applications, and AIO.",
  path: "/guides",
});
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
