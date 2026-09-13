import { DEFAULT_GLOBAL_CONTROL, DEFAULT_PAGE_CONTROL, isScheduleActive, isScheduleUpcoming } from './page-controls';

export function maintenanceFlag(value: unknown): boolean {
  return value === true || value === 1 || (typeof value === 'string' && ['true', '1'].includes(value.trim().toLowerCase()));
}

export function maintenancePath(value: string): string {
  const path = String(value || '/').trim().split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
  return path ? `/${path}` : '/';
}

export function maintenanceBypass(path: string): boolean {
  return ['/admin', '/api', '/_next'].some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

export function normalizeControl(raw: Record<string, any>) {
  const result = { ...raw };
  for (const key of ['maintenanceEnabled', 'scheduleEnabled', 'automaticFullSiteShutdown', 'automaticRecovery', 'automaticMaintenanceEnabled', 'automaticRecoveryEnabled', 'popupEnabled', 'aiMaintenanceEnabled', 'aiScheduleEnabled']) {
    result[key] = maintenanceFlag(raw[key]);
  }
  for (const key of ['scheduleStartAt', 'scheduleEndAt', 'aiScheduleStartAt', 'aiScheduleEndAt', 'popupUntilAt']) {
    const value = raw[key];
    result[key] = value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
  }
  return result;
}

export function resolveControls(data: any, requestedPath: string) {
  const path = maintenancePath(requestedPath);
  const pages: Record<string, any> = {};
  const priorities: Record<string, number> = {};
  for (const [key, raw] of Object.entries(data?.pages || {})) {
    if (!raw || typeof raw !== 'object') continue;
    const value = raw as Record<string, any>;
    const storedPath = maintenancePath(typeof value.path === 'string' ? value.path : key === 'home' ? '/' : key.split('__').join('/'));
    const canonicalKey = storedPath.slice(1).replace(/\//g, '__') || 'home';
    // Admin writes the canonical key. Retired aliases must not override its OFF switch.
    const priority = key === canonicalKey ? Infinity : Number(value.updatedAt || 0);
    if (pages[storedPath] && priority < priorities[storedPath]) continue;
    pages[storedPath] = normalizeControl({ ...DEFAULT_PAGE_CONTROL, ...value, path: storedPath });
    priorities[storedPath] = priority;
  }
  return {
    global: normalizeControl({ ...DEFAULT_GLOBAL_CONTROL, ...(data?.global || {}) }),
    page: pages[path] || normalizeControl({ ...DEFAULT_PAGE_CONTROL, path }),
    pages,
  };
}

export function controlSchedule(control: Record<string, any>, now = Date.now()) {
  return {
    enabled: maintenanceFlag(control.scheduleEnabled),
    startAt: control.scheduleStartAt ?? null,
    endAt: control.scheduleEndAt ?? null,
    active: maintenanceFlag(control.scheduleEnabled) && isScheduleActive(control.scheduleStartAt, control.scheduleEndAt, now),
    upcoming: maintenanceFlag(control.scheduleEnabled) && isScheduleUpcoming(control.scheduleStartAt, control.scheduleEndAt, now),
  };
}
