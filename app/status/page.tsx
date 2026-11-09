import { ServiceStatus } from "@/components/site/service-status";
export const metadata = {
  title: "Service Status | Auronix Commerce",
  description: "Auronix service incidents, maintenance and status updates.",
};
export default function StatusPage() {
  return <ServiceStatus />;
}
