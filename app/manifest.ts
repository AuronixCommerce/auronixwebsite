import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Auronix Commerce', short_name: 'Auronix', description: 'Auronix Commerce partner and seller workspace.', start_url: '/', display: 'standalone', background_color: '#f4f7fa', theme_color: '#111827', orientation: 'portrait-primary',
    icons: [{ src: '/auronix-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
