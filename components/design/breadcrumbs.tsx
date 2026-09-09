"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { pageFor } from "@/lib/design/navigation";
export function Breadcrumbs() {
  const path = usePathname();
  if (path === "/") return null;
  const page = pageFor(path);
  return (
    <nav aria-label="Breadcrumb" className="ac-breadcrumbs">
      <Link href="/">Home</Link>
      <ChevronRight size={13} />
      <span aria-current="page">
        {page?.title || path.split("/").pop()?.replace(/-/g, " ")}
      </span>
    </nav>
  );
}
