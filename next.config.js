// ============================================================
// TEAM FIT — Configuración de Next.js con cabeceras de seguridad
// ============================================================

const cabecerasSeguridad = [
  // Impide que la página se cargue dentro de un iframe ajeno (clickjacking)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Impide que el navegador "adivine" tipos de contenido (sniffing)
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // No filtra la URL completa hacia otros sitios
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Fuerza HTTPS siempre, por dos años, incluyendo subdominios
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Solo nuestra propia página puede usar geolocalización (para el presente);
  // cámara y micrófono quedan bloqueados por completo
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // no revelar la tecnología del sitio
  async headers() {
    return [
      {
        source: '/:path*',
        headers: cabecerasSeguridad,
      },
    ];
  },
};

module.exports = nextConfig;
