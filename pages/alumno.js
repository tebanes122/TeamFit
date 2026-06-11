import { useState } from 'react';
import Link from 'next/link';

// ============================================================
// DATOS DE PRUEBA (después esto sale de Supabase)
// ============================================================

const alumno = {
  nombre: 'Esteban',
  plan: '5 días',
  diasParaVencer: 4, // probá cambiar a 12 (verde) o -2 (vencida) para ver el semáforo
  pesoCorporal: 78.5,
};

const rutinaHoy = {
  dia: 'Día 3 — Espalda y bíceps',
  ejercicios: [
    { id: 1, nombre: 'Jalón al pecho', series: '4 x 10', ultimoPeso: 55, esPR: false },
    { id: 2, nombre: 'Remo con barra', series: '4 x 8', ultimoPeso: 60, esPR: true },
    { id: 3, nombre: 'Remo en máquina', series: '3 x 12', ultimoPeso: 50, esPR: false },
    { id: 4, nombre: 'Curl con barra', series: '4 x 10', ultimoPeso: 25, esPR: false },
    { id: 5, nombre: 'Curl martillo', series: '3 x 12', ultimoPeso: 12, esPR: false },
  ],
};

// últimos 7 días (racha)
const semana = [
  { dia: 'J', fue: true },
  { dia: 'V', fue: true },
  { dia: 'S', fue: false },
  { dia: 'D', fue: false },
  { dia: 'L', fue: true },
  { dia: 'M', fue: true },
  { dia: 'X', fue: true },
];

// progreso de un ejercicio clave (press banca, últimas 8 semanas)
const progreso = [
  { sem: 'S1', kg: 50 },
  { sem: 'S2', kg: 52 },
  { sem: 'S3', kg: 52 },
  { sem: 'S4', kg: 55 },
  { sem: 'S5', kg: 57 },
  { sem: 'S6', kg: 57 },
  { sem: 'S7', kg: 60 },
  { sem: 'S8', kg: 62 },
];

// ============================================================

function estadoCuota(dias) {
  if (dias < 0) return { clase: 'b-vencida', badge: 'estado-vencida', texto: 'Cuota vencida', detalle: 'Acercate a recepción para regularizarla' };
  if (dias <= 5) return { clase: 'b-pronto', badge: 'estado-pronto', texto: 'Por vencer', detalle: 'Renovala antes para no perder el ritmo' };
  return { clase: 'b-ok', badge: 'estado-ok', texto: 'Al día', detalle: 'Tu cuota está activa' };
}

export default function Alumno() {
  const [pesos, setPesos] = useState({});
  const [presente, setPresente] = useState(false);

  const cuota = estadoCuota(alumno.diasParaVencer);
  const maxKg = Math.max(...progreso.map((p) => p.kg));
  const diasRacha = semana.filter((d) => d.fue).length;

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="logo">
          TEAM<span>FIT</span>
        </Link>
        <span className="rol-chip">Plan {alumno.plan}</span>
      </div>

      <div>
        <div className="eyebrow">Tu entrenamiento</div>
        <h1 className="titulo">Hola, {alumno.nombre} 💪</h1>
        <p className="subtitulo">Peso corporal actual: {alumno.pesoCorporal} kg</p>
      </div>

      {/* ---------- Semáforo de cuota ---------- */}
      <div className="seccion">
        <div className={`banner-cuota ${cuota.clase}`}>
          <div>
            <span className={`estado ${cuota.badge}`}>{cuota.texto}</span>
            <p className="subtitulo" style={{ marginTop: 8 }}>
              {cuota.detalle}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="banner-dias">
              {alumno.diasParaVencer < 0 ? Math.abs(alumno.diasParaVencer) : alumno.diasParaVencer}
            </div>
            <div className="fila-detalle">
              {alumno.diasParaVencer < 0 ? 'días vencida' : 'días restantes'}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Presente ---------- */}
      <div className="seccion">
        <button
          className={'btn' + (presente ? ' btn-secundario' : '')}
          style={{ width: '100%' }}
          onClick={() => setPresente(true)}
          disabled={presente}
        >
          {presente ? '✓ Presente marcado — ¡A entrenar!' : 'Marcar mi presente de hoy'}
        </button>
      </div>

      {/* ---------- Racha ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">Tu semana · {diasRacha} asistencias</div>
        <div className="racha">
          {semana.map((d, i) => (
            <div key={i} className={'dia-racha' + (d.fue ? ' fue' : '')}>
              {d.dia}
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Rutina de hoy ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">{rutinaHoy.dia}</div>
        <div className="lista">
          {rutinaHoy.ejercicios.map((ej, i) => (
            <div className="ejercicio" key={ej.id}>
              <div className="ejercicio-num">{String(i + 1).padStart(2, '0')}</div>
              <div className="ejercicio-info">
                <div className="ejercicio-nombre">
                  {ej.nombre} {ej.esPR && <span className="pr-badge">PR 🔥</span>}
                </div>
                <div className="ejercicio-series">{ej.series}</div>
              </div>
              <div className="peso-box">
                <div className="peso-anterior">
                  Última vez
                  <br />
                  <strong>{ej.ultimoPeso} kg</strong>
                </div>
                <input
                  className="peso-input"
                  type="number"
                  inputMode="decimal"
                  placeholder="kg"
                  value={pesos[ej.id] ?? ''}
                  onChange={(e) => setPesos({ ...pesos, [ej.id]: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
        <button className="btn" style={{ width: '100%', marginTop: 14 }}>
          Guardar pesos de hoy
        </button>
      </div>

      {/* ---------- Progreso ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">Progreso · Press banca</div>
        <div className="barras">
          {progreso.map((p) => (
            <div
              key={p.sem}
              className={'barra' + (p.kg === maxKg ? ' activa' : '')}
              style={{ height: `${(p.kg / maxKg) * 100}%` }}
            >
              <span className="barra-label">{p.kg}</span>
            </div>
          ))}
        </div>
        <p className="subtitulo" style={{ marginTop: 10 }}>
          De 50 kg a 62 kg en 8 semanas. +24% de fuerza 🔥
        </p>
      </div>
    </div>
  );
}
