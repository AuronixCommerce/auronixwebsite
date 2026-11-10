import { submitSupplierApplication } from "@/lib/supplier-application-service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return submitSupplierApplication(request);
}
