'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { maintenanceBypass, maintenancePath } from '@/lib/maintenance-controls';

/** Root layouts persist across navigation; refresh only when their maintenance decision changes. */
export function MaintenanceRefresh({ serverPath, blocked }: { serverPath: string; blocked: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    const path = maintenancePath(pathname || '/');
    if (maintenanceBypass(path)) return;
    let cancelled = false;
    let pending = false;
    const controller = new AbortController();
    async function check() {
      if (pending || document.visibilityState === 'hidden') return;
      pending = true;
      try {
        const response = await fetch(`/api/maintenance/status?path=${encodeURIComponent(path)}`, { cache: 'no-store', signal: controller.signal });
        const status = await response.json();
        if (!cancelled && response.ok && status.success) {
          const active = status.global?.active === true || status.page?.active === true;
          if (active !== blocked || maintenancePath(serverPath) !== path) router.refresh();
        }
      } catch { /* A failed status check must not invent maintenance or bypass an active screen. */ }
      finally { pending = false; }
    }
    void check();
    const timer = window.setInterval(check, 10000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [pathname, serverPath, blocked, router]);
  return null;
}
