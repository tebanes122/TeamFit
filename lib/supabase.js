import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ID del gimnasio Team Fit (tabla gimnasios)
export const GIMNASIO_ID = '11111111-1111-1111-1111-111111111111';

// Fecha de hoy en formato YYYY-MM-DD respetando la zona horaria local
export function hoyISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// Días entre hoy y una fecha YYYY-MM-DD (negativo si ya pasó)
export function diasHasta(fecha) {
  if (!fecha) return null;
  const hoy = new Date(hoyISO());
  const f = new Date(fecha);
  return Math.round((f - hoy) / 86400000);
}
