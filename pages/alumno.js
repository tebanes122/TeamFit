import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, GIMNASIO_ID, hoyISO, diasHasta } from '../lib/supabase';

// ============================================================
// VISTA DEL ALUMNO — Supabase + presente con GPS + fichas
// Alumno demo: Esteban Fernández (DNI 42333444).
// ============================================================

const DNI_ALUMNO_DEMO = '42333444';
const ID_PRESS_BANCA = '33333333-3333-3333-3333-333333333301';

// Ubicación de Team Fit (Garupá, colectora RN12) y radio permitido
const GYM_LAT = -27.4388811;
const GYM_LNG = -55.8819258;
const RADIO_METROS = 150;

// Ícono por grupo muscular (placeholder hasta tener fotos propias del gym)
const ICONO_GRUPO = {
  pecho: '🏋️',
  espalda: '🚣',
  piernas: '🦵',
  hombros: '🤸',
  'bíceps': '💪',
  'tríceps': '💪',
};

// Rutina del día (fija por ahora; saldrá de rutinas/rutina_ejercicios
// cuando armemos el módulo del profesor)
const rutinaHoy = {
  dia: 'Día 3 — Espalda y bíceps',
  ejercicios: [
    { ejercicioId: '33333333-3333-3333-3333-333333333303', nombre: 'Jalón al pecho', series: '4 x 10' },
    { ejercicioId: '33333333-3333-3333-3333-333333333304', nombre: 'Remo con barra', series: '4 x 8' },
    { ejercicioId: '33333333-3333-3333-3333-333333333305', nombre: 'Remo en máquina', series: '3 x 12' },
    { ejercicioId: '33333333-3333-3333-3333-333333333311', nombre: 'Curl con barra', series: '4 x 10' },
    { ejercicioId: '33333333-3333-3333-3333-333333333312', nombre: 'Curl martillo', series: '3 x 12' },
  ],
};

function estadoCuota(dias) {
  if (dias === null) return { clase: 'b-pronto', badge: 'estado-pronto', texto: 'Sin datos', detalle: 'Consultá en recepción por tu cuota' };
  if (dias < 0) return { clase: 'b-vencida', badge: 'estado-vencida', texto: 'Cuota vencida', detalle: 'Acercate a recepción para regularizarla' };
  if (dias <= 5) return { clase: 'b-pronto', badge: 'estado-pronto', texto: 'Por vencer', detalle: 'Renovala antes para no perder el ritmo' };
  return { clase: 'b-ok', badge: 'estado-ok', texto: 'Al día', detalle: 'Tu cuota está activa' };
}

// Distancia en metros entre dos coordenadas (fórmula de Haversine)
function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function Alumno() {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [alumno, setAlumno] = useState(null);
  const [asistencias, setAsistencias] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [fichas, setFichas] = useState({});
  const [fichaAbierta, setFichaAbierta] = useState(null);
  const [pesosForm, setPesosForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const [msgPresente, setMsgPresente] = useState(null);

  async function cargar() {
    try {
      const rAlumno = await supabase
        .from('alumnos')
        .select('id, nombre, apellido, peso_corporal, vencimiento, planes(nombre)')
        .eq('gimnasio_id', GIMNASIO_ID)
        .eq('dni', DNI_ALUMNO_DEMO)
        .single();
      if (rAlumno.error) throw rAlumno.error;
      const al = rAlumno.data;
      setAlumno(al);

      const hace7 = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
      const idsEjercicios = rutinaHoy.ejercicios.map((e) => e.ejercicioId);
      const [rAsis, rReg, rFichas] = await Promise.all([
        supabase.from('asistencias').select('fecha').eq('alumno_id', al.id).gte('fecha', hace7),
        supabase
          .from('registros_peso')
          .select('ejercicio_id, peso_kg, fecha')
          .eq('alumno_id', al.id)
          .order('fecha', { ascending: true }),
        supabase
          .from('ejercicios')
          .select('id, nombre, grupo_muscular, descripcion, musculos, consejos, video_url')
          .in('id', idsEjercicios),
      ]);
      if (rAsis.error) throw rAsis.error;
      if (rReg.error) throw rReg.error;
      if (rFichas.error) throw rFichas.error;
      setAsistencias(rAsis.data || []);
      setRegistros(rReg.data || []);
      const mapa = {};
      (rFichas.data || []).forEach((f) => (mapa[f.id] = f));
      setFichas(mapa);
    } catch (e) {
      setError(e.message || 'Error al cargar tus datos');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  // ---------- presente con verificación de ubicación ----------
  async function insertarPresente() {
    const { error: e } = await supabase.from('asistencias').insert({
      gimnasio_id: GIMNASIO_ID,
      alumno_id: alumno.id,
      fecha: hoyISO(),
    });
    if (e && e.code !== '23505') {
      setMsgPresente('No se pudo marcar el presente: ' + e.message);
    } else {
      setMsgPresente(null);
      await cargar();
    }
    setMarcando(false);
  }

  function marcarPresente() {
    if (!alumno) return;
    setMsgPresente(null);

    if (!navigator.geolocation) {
      setMsgPresente('Tu navegador no soporta ubicación. Pedí en recepción que te marquen el presente.');
      return;
    }

    setMarcando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const d = distanciaMetros(pos.coords.latitude, pos.coords.longitude, GYM_LAT, GYM_LNG);
        if (d <= RADIO_METROS) {
          insertarPresente();
        } else {
          setMarcando(false);
          setMsgPresente(
            `Estás a ${d >= 1000 ? (d / 1000).toFixed(1) + ' km' : d + ' m'} de Team Fit. El presente solo se puede marcar desde el gimnasio 😉`
          );
        }
      },
      (err) => {
        setMarcando(false);
        if (err.code === 1) {
          setMsgPresente('Necesitamos tu permiso de ubicación para verificar que estés en el gimnasio. Activalo y volvé a intentar.');
        } else {
          setMsgPresente('No pudimos obtener tu ubicación. Verificá que el GPS esté activado y reintentá.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // ---------- guardar pesos ----------
  async function guardarPesos() {
    if (!alumno) return;
    const filas = rutinaHoy.ejercicios
      .filter((ej) => pesosForm[ej.ejercicioId] && Number(pesosForm[ej.ejercicioId]) > 0)
      .map((ej) => ({
        gimnasio_id: GIMNASIO_ID,
        alumno_id: alumno.id,
        ejercicio_id: ej.ejercicioId,
        peso_kg: Number(pesosForm[ej.ejercicioId]),
        fecha: hoyISO(),
      }));
    if (filas.length === 0) {
      alert('Cargá al menos un peso antes de guardar.');
      return;
    }
    setGuardando(true);
    const { error: e } = await supabase.from('registros_peso').insert(filas);
    if (e) {
      alert('No se pudieron guardar los pesos: ' + e.message);
    } else {
      setGuardado(true);
      setPesosForm({});
      await cargar();
      setTimeout(() => setGuardado(false), 3000);
    }
    setGuardando(false);
  }

  if (cargando) {
    return (
      <div className="shell">
        <div className="topbar">
          <Link href="/" className="logo">TEAM<span>FIT</span></Link>
        </div>
        <p className="subtitulo">Cargando tu entrenamiento...</p>
      </div>
    );
  }

  if (error || !alumno) {
    return (
      <div className="shell">
        <div className="topbar">
          <Link href="/" className="logo">TEAM<span>FIT</span></Link>
        </div>
        <p className="subtitulo">No se pudieron cargar tus datos: {error}</p>
      </div>
    );
  }

  // ---------- derivados ----------
  const dias = diasHasta(alumno.vencimiento);
  const cuota = estadoCuota(dias);

  const letras = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const fechasAsistidas = new Set(asistencias.map((a) => a.fecha));
  const semana = [...Array(7)].map((_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const off = d.getTimezoneOffset();
    const iso = new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
    return { dia: letras[d.getDay()], fue: fechasAsistidas.has(iso) };
  });
  const diasRacha = semana.filter((d) => d.fue).length;
  const presenteHoy = semana[6].fue;

  const porEjercicio = {};
  registros.forEach((r) => {
    if (!porEjercicio[r.ejercicio_id]) porEjercicio[r.ejercicio_id] = [];
    porEjercicio[r.ejercicio_id].push(r);
  });
  function ultimoPeso(ejId) {
    const lista = porEjercicio[ejId];
    return lista?.length ? Number(lista[lista.length - 1].peso_kg) : null;
  }
  function esPR(ejId) {
    const lista = porEjercicio[ejId];
    if (!lista || lista.length < 2) return false;
    const ultimo = Number(lista[lista.length - 1].peso_kg);
    return lista.slice(0, -1).every((r) => Number(r.peso_kg) < ultimo);
  }

  const progreso = (porEjercicio[ID_PRESS_BANCA] || []).slice(-8);
  const maxKg = Math.max(1, ...progreso.map((p) => Number(p.peso_kg)));
  const mejora =
    progreso.length >= 2
      ? Math.round(((Number(progreso[progreso.length - 1].peso_kg) - Number(progreso[0].peso_kg)) / Number(progreso[0].peso_kg)) * 100)
      : null;

  const ficha = fichaAbierta ? fichas[fichaAbierta] : null;

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="logo">TEAM<span>FIT</span></Link>
        <span className="rol-chip">Plan {alumno.planes?.nombre}</span>
      </div>

      <div>
        <div className="eyebrow">Tu entrenamiento</div>
        <h1 className="titulo">Hola, {alumno.nombre} 💪</h1>
        {alumno.peso_corporal && (
          <p className="subtitulo">Peso corporal actual: {alumno.peso_corporal} kg</p>
        )}
      </div>

      {/* ---------- Semáforo de cuota ---------- */}
      <div className="seccion">
        <div className={`banner-cuota ${cuota.clase}`}>
          <div>
            <span className={`estado ${cuota.badge}`}>{cuota.texto}</span>
            <p className="subtitulo" style={{ marginTop: 8 }}>{cuota.detalle}</p>
          </div>
          {dias !== null && (
            <div style={{ textAlign: 'right' }}>
              <div className="banner-dias">{Math.abs(dias)}</div>
              <div className="fila-detalle">{dias < 0 ? 'días vencida' : 'días restantes'}</div>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Presente ---------- */}
      <div className="seccion">
        <button
          className={'btn' + (presenteHoy ? ' btn-secundario' : '')}
          style={{ width: '100%' }}
          onClick={marcarPresente}
          disabled={presenteHoy || marcando}
        >
          {presenteHoy
            ? '✓ Presente marcado — ¡A entrenar!'
            : marcando
            ? 'Verificando que estés en el gym...'
            : 'Marcar mi presente de hoy'}
        </button>
        {msgPresente && (
          <p className="subtitulo" style={{ marginTop: 8 }}>{msgPresente}</p>
        )}
        {!presenteHoy && (
          <p className="nota-privacidad">
            Tu ubicación se usa únicamente para verificar que estés en Team Fit al marcar el presente. No se almacena.
          </p>
        )}
      </div>

      {/* ---------- Racha ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">Tu semana · {diasRacha} {diasRacha === 1 ? 'asistencia' : 'asistencias'}</div>
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
        <p className="subtitulo" style={{ marginBottom: 12 }}>
          Tocá un ejercicio para ver cómo se hace 👆
        </p>
        <div className="lista">
          {rutinaHoy.ejercicios.map((ej, i) => {
            const ult = ultimoPeso(ej.ejercicioId);
            const f = fichas[ej.ejercicioId];
            return (
              <div className="ejercicio" key={ej.ejercicioId}>
                <button className="mini-ejercicio" onClick={() => setFichaAbierta(ej.ejercicioId)}>
                  {ICONO_GRUPO[f?.grupo_muscular] || '🏋️'}
                </button>
                <div
                  className="ejercicio-info"
                  onClick={() => setFichaAbierta(ej.ejercicioId)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="ejercicio-nombre">
                    {ej.nombre} {esPR(ej.ejercicioId) && <span className="pr-badge">PR 🔥</span>}
                  </div>
                  <div className="ejercicio-series">
                    {ej.series}
                    {f?.grupo_muscular && <> · {f.grupo_muscular}</>}
                  </div>
                </div>
                <div className="peso-box">
                  <div className="peso-anterior">
                    Última vez
                    <br />
                    <strong>{ult !== null ? ult + ' kg' : '—'}</strong>
                  </div>
                  <input
                    className="peso-input"
                    type="number"
                    inputMode="decimal"
                    placeholder="kg"
                    value={pesosForm[ej.ejercicioId] ?? ''}
                    onChange={(e) => setPesosForm({ ...pesosForm, [ej.ejercicioId]: e.target.value })}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <button
          className="btn"
          style={{ width: '100%', marginTop: 14 }}
          onClick={guardarPesos}
          disabled={guardando}
        >
          {guardando ? 'Guardando...' : guardado ? '✓ Pesos guardados' : 'Guardar pesos de hoy'}
        </button>
      </div>

      {/* ---------- Progreso ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">Progreso · Press banca</div>
        {progreso.length === 0 ? (
          <p className="subtitulo">Todavía no cargaste pesos de press banca. ¡Empezá hoy!</p>
        ) : (
          <>
            <div className="barras">
              {progreso.map((p, i) => (
                <div
                  key={i}
                  className={'barra' + (Number(p.peso_kg) === maxKg ? ' activa' : '')}
                  style={{ height: `${(Number(p.peso_kg) / maxKg) * 100}%` }}
                >
                  <span className="barra-label">{Number(p.peso_kg)}</span>
                </div>
              ))}
            </div>
            {mejora !== null && mejora > 0 && (
              <p className="subtitulo" style={{ marginTop: 10 }}>
                De {Number(progreso[0].peso_kg)} kg a {Number(progreso[progreso.length - 1].peso_kg)} kg. +{mejora}% de fuerza 🔥
              </p>
            )}
          </>
        )}
      </div>

      {/* ---------- Ficha de ejercicio (modal) ---------- */}
      {ficha && (
        <div className="modal-fondo" onClick={() => setFichaAbierta(null)}>
          <div className="modal-ficha" onClick={(e) => e.stopPropagation()}>
            <div className="ficha-icono">{ICONO_GRUPO[ficha.grupo_muscular] || '🏋️'}</div>
            <h2 className="ficha-titulo">{ficha.nombre}</h2>
            {ficha.musculos && <p className="ficha-musculos">{ficha.musculos}</p>}
            {ficha.descripcion && (
              <>
                <div className="ficha-sub">Cómo se hace</div>
                <p className="ficha-texto">{ficha.descripcion}</p>
              </>
            )}
            {ficha.consejos && (
              <>
                <div className="ficha-sub">Consejos</div>
                <ul className="ficha-consejos">
                  {ficha.consejos.split('|').map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </>
            )}
            {ficha.video_url && (
              <a className="btn" style={{ width: '100%', marginTop: 14 }} href={ficha.video_url} target="_blank" rel="noreferrer">
                ▶ Ver videos de la técnica
              </a>
            )}
            <button className="btn btn-secundario" style={{ width: '100%', marginTop: 8 }} onClick={() => setFichaAbierta(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
