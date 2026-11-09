export const SERVICE_NAMES = {
  website: "Website",
  aio: "AIO chat",
  email: "Transactional email",
  portal: "Partner portal",
} as const;
export const SERVICE_STATES = [
  "operational",
  "degraded",
  "outage",
  "maintenance",
  "unknown",
] as const;
export const INCIDENT_STATES = [
  "investigating",
  "identified",
  "monitoring",
  "resolved",
  "scheduled",
  "maintenance",
] as const;
export function publicStatus(value: any, maintenance?: any) {
  const services = Object.entries(SERVICE_NAMES).map(([id, name]) => ({
    id,
    name,
    status: SERVICE_STATES.includes(value?.services?.[id]?.status)
      ? value.services[id].status
      : "unknown",
    updatedAt: Number(value?.services?.[id]?.updatedAt || 0),
  }));
  if (maintenance?.active)
    services.find((s) => s.id === "website")!.status = "maintenance";
  if (maintenance?.aiActive)
    services.find((s) => s.id === "aio")!.status = "maintenance";
  const incidents = Object.entries(value?.incidents || {})
    .map(([id, i]: any) => ({
      id,
      title: String(i.title || "").slice(0, 180),
      body: String(i.body || "").slice(0, 4000),
      status: INCIDENT_STATES.includes(i.status) ? i.status : "investigating",
      serviceIds: Array.isArray(i.serviceIds)
        ? i.serviceIds.filter((s: string) => s in SERVICE_NAMES)
        : [],
      createdAt: Number(i.createdAt || 0),
      updatedAt: Number(i.updatedAt || 0),
      startAt: Number(i.startAt || 0),
      endAt: Number(i.endAt || 0),
      updates: Object.values(i.updates || {})
        .map((u: any) => ({
          body: String(u.body || "").slice(0, 2000),
          status: INCIDENT_STATES.includes(u.status)
            ? u.status
            : "investigating",
          createdAt: Number(u.createdAt || 0),
        }))
        .sort((a, b) => b.createdAt - a.createdAt),
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 50);
  const scheduled =
    maintenance?.upcoming || maintenance?.active
      ? {
          title: String(maintenance.title || "Scheduled maintenance"),
          message: String(maintenance.message || ""),
          active: !!maintenance.active,
          startAt: maintenance.startAt || null,
          endAt: maintenance.endAt || null,
        }
      : null;
  return {
    services,
    incidents,
    maintenance: scheduled,
    updatedAt: Math.max(
      0,
      ...services.map((s) => s.updatedAt),
      ...incidents.map((i) => i.updatedAt),
    ),
    checkedAt: Date.now(),
  };
}
