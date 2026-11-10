import { submitSellerApplication } from "@/lib/seller-application-service";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return submitSellerApplication(request);
}
