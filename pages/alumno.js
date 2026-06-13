import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase, GIMNASIO_ID, hoyISO, diasHasta, usuarioActual, cerrarSesion } from '../lib/supabase';
import Pictograma from '../components/Pictogramas';

// ============================================================
// VISTA DEL ALUMNO — rutina semanal planificable
// Requiere sesión iniciada y cuenta aprobada por el gimnasio.
// ============================================================

const ID_PRESS_BANCA = '33333333-3333-3333-3333-333333333301';

// Ubicación de Team Fit (Garupá, colectora RN12) y radio permitido
const GYM_LAT = -27.4388811;
const GYM_LNG = -55.8819258;
const RADIO_METROS = 150;

const DIAS = [
  { num: 1, letra: 'L', nombre: 'Lunes' },
  { num: 2, letra: 'M', nombre: 'Martes' },
  { num: 3, letra: 'X', nombre: 'Miércoles' },
  { num: 4, letra: 'J', nombre: 'Jueves' },
  { num: 5, letra: 'V', nombre: 'Viernes' },
  { num: 6, letra: 'S', nombre: 'Sábado' },
  { num: 7, letra: 'D', nombre: 'Domingo' },
];

// Rutina inicial que se carga la primera vez (después el alumno la edita a gusto)
const RUTINA_INICIAL = [
  { dia: 1, ids: ['33333333-3333-3333-3333-333333333301', '33333333-3333-3333-3333-333333333302', '33333333-3333-3333-3333-333333333313', '33333333-3333-3333-3333-333333333314'] },
  { dia: 3, ids: ['33333333-3333-3333-3333-333333333303', '33333333-3333-3333-3333-333333333304', '33333333-3333-3333-3333-333333333305', '33333333-3333-3333-3333-333333333311', '33333333-3333-3333-3333-333333333312'] },
  { dia: 5, ids: ['33333333-3333-3333-3333-333333333306', '33333333-3333-3333-3333-333333333307', '33333333-3333-3333-3333-333333333309', '33333333-3333-3333-3333-333333333310'] },
];

function diaDeHoy() {
  const d = new Date().getDay(); // 0 = domingo
  return d === 0 ? 7 : d;
}

function estadoCuota(dias) {
  if (dias === null) return { clase: 'b-pronto', badge: 'estado-pronto', texto: 'Sin datos', detalle: 'Consultá en recepción por tu cuota' };
  if (dias < 0) return { clase: 'b-vencida', badge: 'estado-vencida', texto: 'Cuota vencida', detalle: 'Acercate a recepción para regularizarla' };
  if (dias <= 5) return { clase: 'b-pronto', badge: 'estado-pronto', texto: 'Por vencer', detalle: 'Renovala antes para no perder el ritmo' };
  return { clase: 'b-ok', badge: 'estado-ok', texto: 'Al día', detalle: 'Tu cuota está activa' };
}

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
  const router = useRouter();
  const [pendiente, setPendiente] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [alumno, setAlumno] = useState(null);
  const [asistencias, setAsistencias] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [rutinaId, setRutinaId] = useState(null);
  const [items, setItems] = useState([]);
  const [diaSel, setDiaSel] = useState(diaDeHoy());
  const [editando, setEditando] = useState(false);
  const [fichaAbierta, setFichaAbierta] = useState(null);
  const [pesosForm, setPesosForm] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [marcando, setMarcando] = useState(false);
  const [msgPresente, setMsgPresente] = useState(null);

  // ---------- carga inicial ----------
  async function cargar() {
    try {
      const { session, alumno: al } = await usuarioActual();
      if (!session) {
        router.replace('/login');
        return;
      }
      if (!al) {
        // cuenta creada pero todavía no aprobada/vinculada por el gimnasio
        setPendiente(true);
        setCargando(false);
        return;
      }
      setAlumno(al);

      const hace7 = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
      const [rAsis, rReg, rCat] = await Promise.all([
        supabase.from('asistencias').select('fecha').eq('alumno_id', al.id).gte('fecha', hace7),
        supabase
          .from('registros_peso')
          .select('ejercicio_id, peso_kg, fecha')
          .eq('alumno_id', al.id)
          .order('fecha', { ascending: true }),
        supabase
          .from('ejercicios')
          .select('id, nombre, grupo_muscular, descripcion, musculos, consejos, video_url')
          .order('grupo_muscular')
          .order('nombre'),
      ]);
      if (rAsis.error) throw rAsis.error;
      if (rReg.error) throw rReg.error;
      if (rCat.error) throw rCat.error;
      setAsistencias(rAsis.data || []);
      setRegistros(rReg.data || []);
      setCatalogo(rCat.data || []);

      await cargarRutina(al.id);
    } catch (e) {
      setError(e.message || 'Error al cargar tus datos');
    } finally {
      setCargando(false);
    }
  }

  async function cargarRutina(alumnoId) {
    // buscar la rutina del alumno; si no existe, crearla con la rutina inicial
    let rRutina = await supabase
      .from('rutinas')
      .select('id')
      .eq('alumno_id', alumnoId)
      .eq('es_plantilla', false)
      .limit(1);
    if (rRutina.error) throw rRutina.error;

    let id;
    if (rRutina.data && rRutina.data.length > 0) {
      id = rRutina.data[0].id;
    } else {
      const rNueva = await supabase
        .from('rutinas')
        .insert({ gimnasio_id: GIMNASIO_ID, alumno_id: alumnoId, nombre: 'Mi rutina', es_plantilla: false })
        .select('id')
        .single();
      if (rNueva.error) throw rNueva.error;
      id = rNueva.data.id;

      // sembrar la rutina inicial
      const filas = [];
      RUTINA_INICIAL.forEach((d) => {
        d.ids.forEach((ejId, i) => {
          filas.push({ rutina_id: id, ejercicio_id: ejId, dia: d.dia, orden: i + 1, series: 4, repeticiones: '10' });
        });
      });
      const rSeed = await supabase.from('rutina_ejercicios').insert(filas);
      if (rSeed.error) throw rSeed.error;
    }
    setRutinaId(id);

    const rItems = await supabase
      .from('rutina_ejercicios')
      .select('id, dia, orden, series, repeticiones, ejercicio_id')
      .eq('rutina_id', id)
      .order('dia')
      .order('orden');
    if (rItems.error) throw rItems.error;
    setItems(rItems.data || []);
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const hace7 = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
      const r = await supabase.from('asistencias').select('fecha').eq('alumno_id', alumno.id).gte('fecha', hace7);
      if (!r.error) setAsistencias(r.data || []);
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

  // ---------- edición de rutina ----------
  async function agregarEjercicio(ejId) {
    const delDia = items.filter((it) => it.dia === diaSel);
    const orden = delDia.length ? Math.max(...delDia.map((it) => it.orden)) + 1 : 1;
    const r = await supabase
      .from('rutina_ejercicios')
      .insert({ rutina_id: rutinaId, ejercicio_id: ejId, dia: diaSel, orden, series: 4, repeticiones: '10' })
      .select('id, dia, orden, series, repeticiones, ejercicio_id')
      .single();
    if (r.error) {
      alert('No se pudo agregar: ' + r.error.message);
    } else {
      setItems([...items, r.data]);
    }
  }

  async function quitarItem(itemId) {
    const r = await supabase.from('rutina_ejercicios').delete().eq('id', itemId);
    if (r.error) {
      alert('No se pudo quitar: ' + r.error.message);
    } else {
      setItems(items.filter((it) => it.id !== itemId));
    }
  }

  function cambiarItemLocal(itemId, campos) {
    setItems(items.map((it) => (it.id === itemId ? { ...it, ...campos } : it)));
  }

  async function guardarItem(itemId) {
    const it = items.find((x) => x.id === itemId);
    if (!it) return;
    await supabase
      .from('rutina_ejercicios')
      .update({ series: Number(it.series) || 1, repeticiones: String(it.repeticiones || '10') })
      .eq('id', itemId);
  }

  // ---------- guardar pesos ----------
  async function guardarPesos() {
    if (!alumno) return;
    const delDia = items.filter((it) => it.dia === diaSel);
    const filas = delDia
      .filter((it) => pesosForm[it.ejercicio_id] && Number(pesosForm[it.ejercicio_id]) > 0)
      .map((it) => ({
        gimnasio_id: GIMNASIO_ID,
        alumno_id: alumno.id,
        ejercicio_id: it.ejercicio_id,
        peso_kg: Number(pesosForm[it.ejercicio_id]),
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
      const r = await supabase
        .from('registros_peso')
        .select('ejercicio_id, peso_kg, fecha')
        .eq('alumno_id', alumno.id)
        .order('fecha', { ascending: true });
      if (!r.error) setRegistros(r.data || []);
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

  if (pendiente) {
    return (
      <div className="shell">
        <div className="topbar">
          <Link href="/" className="logo">TEAM<span>FIT</span></Link>
          <button className="btn-salir" onClick={async () => { await cerrarSesion(); router.push('/login'); }}>Salir</button>
        </div>
        <div className="seccion" style={{ textAlign: 'center', paddingTop: 40 }}>
          <div className="eyebrow">Cuenta en revisión</div>
          <h1 className="titulo">¡Ya casi! ⏳</h1>
          <p className="subtitulo" style={{ maxWidth: 420, margin: '14px auto 0' }}>
            Tu cuenta fue creada y está esperando la aprobación del gimnasio.
            Apenas Team Fit la apruebe vas a poder ver tu rutina, tu cuota y tu progreso.
          </p>
        </div>
      </div>
    );
  }

  if (error || !alumno) {
    return (
      <div className="shell">
        <div className="topbar">
          <Link href="/" className="logo">TEAM<span>FIT</span></Link>
          <button className="btn-salir" onClick={async () => { await cerrarSesion(); router.push('/login'); }}>Salir</button>
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

  const catalogoPorId = {};
  catalogo.forEach((c) => (catalogoPorId[c.id] = c));

  const itemsDia = items.filter((it) => it.dia === diaSel).sort((a, b) => a.orden - b.orden);
  const gruposDia = [...new Set(itemsDia.map((it) => catalogoPorId[it.ejercicio_id]?.grupo_muscular).filter(Boolean))];
  const tituloDia = gruposDia.length
    ? gruposDia.map((g) => g.charAt(0).toUpperCase() + g.slice(1)).join(' · ')
    : 'Día libre';
  const nombreDia = DIAS.find((d) => d.num === diaSel)?.nombre || '';
  const esHoy = diaSel === diaDeHoy();

  const idsEnDia = new Set(itemsDia.map((it) => it.ejercicio_id));
  const gruposCatalogo = [...new Set(catalogo.map((c) => c.grupo_muscular).filter(Boolean))];

  const progreso = (porEjercicio[ID_PRESS_BANCA] || []).slice(-8);
  const maxKg = Math.max(1, ...progreso.map((p) => Number(p.peso_kg)));
  const mejora =
    progreso.length >= 2
      ? Math.round(((Number(progreso[progreso.length - 1].peso_kg) - Number(progreso[0].peso_kg)) / Number(progreso[0].peso_kg)) * 100)
      : null;

  const ficha = fichaAbierta ? catalogoPorId[fichaAbierta] : null;

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="logo">TEAM<span>FIT</span></Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {alumno.planes?.nombre && <span className="rol-chip">Plan {alumno.planes.nombre}</span>}
          <button className="btn-salir" onClick={async () => { await cerrarSesion(); router.push('/login'); }}>Salir</button>
        </div>
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
        {msgPresente && <p className="subtitulo" style={{ marginTop: 8 }}>{msgPresente}</p>}
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

      {/* ---------- Planificador semanal ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">Mi rutina semanal</div>
        <div className="tabs-dias">
          {DIAS.map((d) => {
            const tiene = items.some((it) => it.dia === d.num);
            return (
              <button
                key={d.num}
                className={
                  'tab-dia' +
                  (d.num === diaSel ? ' activo' : '') +
                  (tiene ? ' con-rutina' : '')
                }
                onClick={() => {
                  setDiaSel(d.num);
                  setEditando(false);
                  setPesosForm({});
                }}
              >
                {d.letra}
              </button>
            );
          })}
        </div>

        <div className="dia-encabezado">
          <div>
            <div className="dia-nombre">
              {nombreDia} {esHoy && <span className="hoy-badge">HOY</span>}
            </div>
            <div className="dia-grupos">{tituloDia}</div>
          </div>
          <button className="btn-editar" onClick={() => setEditando(!editando)}>
            {editando ? '✓ Listo' : '✎ Editar día'}
          </button>
        </div>

        {itemsDia.length === 0 && !editando && (
          <p className="subtitulo" style={{ marginTop: 10 }}>
            Este día no tiene ejercicios. Tocá «Editar día» para armarlo.
          </p>
        )}

        {itemsDia.length > 0 && !editando && (
          <p className="subtitulo" style={{ margin: '8px 0 12px' }}>
            Tocá un ejercicio para ver cómo se hace 👆
          </p>
        )}

        <div className="lista" style={{ marginTop: editando ? 12 : 0 }}>
          {itemsDia.map((it, i) => {
            const ej = catalogoPorId[it.ejercicio_id];
            if (!ej) return null;
            const ult = ultimoPeso(it.ejercicio_id);
            return (
              <div className="ejercicio" key={it.id}>
                <button className="mini-ejercicio" onClick={() => setFichaAbierta(it.ejercicio_id)}>
                  <Pictograma nombre={ej.nombre} />
                </button>
                <div
                  className="ejercicio-info"
                  onClick={() => !editando && setFichaAbierta(it.ejercicio_id)}
                  style={{ cursor: editando ? 'default' : 'pointer' }}
                >
                  <div className="ejercicio-nombre">
                    {ej.nombre} {esPR(it.ejercicio_id) && <span className="pr-badge">PR 🔥</span>}
                  </div>
                  {editando ? (
                    <div className="series-editor">
                      <input
                        className="input-mini"
                        type="number"
                        min="1"
                        value={it.series}
                        onChange={(e) => cambiarItemLocal(it.id, { series: e.target.value })}
                        onBlur={() => guardarItem(it.id)}
                      />
                      <span>x</span>
                      <input
                        className="input-mini input-reps"
                        type="text"
                        value={it.repeticiones}
                        onChange={(e) => cambiarItemLocal(it.id, { repeticiones: e.target.value })}
                        onBlur={() => guardarItem(it.id)}
                      />
                    </div>
                  ) : (
                    <div className="ejercicio-series">
                      {it.series} x {it.repeticiones} · {ej.grupo_muscular}
                    </div>
                  )}
                </div>
                {editando ? (
                  <button className="btn-quitar" onClick={() => quitarItem(it.id)}>✕</button>
                ) : (
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
                      value={pesosForm[it.ejercicio_id] ?? ''}
                      onChange={(e) => setPesosForm({ ...pesosForm, [it.ejercicio_id]: e.target.value })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* catálogo para agregar (solo en modo edición) */}
        {editando && (
          <div className="catalogo">
            <div className="ficha-sub" style={{ marginTop: 18 }}>Agregar ejercicios</div>
            {gruposCatalogo.map((grupo) => {
              const disponibles = catalogo.filter((c) => c.grupo_muscular === grupo && !idsEnDia.has(c.id));
              if (disponibles.length === 0) return null;
              return (
                <div key={grupo} className="catalogo-grupo">
                  <div className="catalogo-grupo-nombre">{grupo}</div>
                  {disponibles.map((c) => (
                    <button key={c.id} className="catalogo-item" onClick={() => agregarEjercicio(c.id)}>
                      <span className="catalogo-pic"><Pictograma nombre={c.nombre} /></span>
                      <span className="catalogo-nombre">{c.nombre}</span>
                      <span className="catalogo-mas">+</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {!editando && itemsDia.length > 0 && esHoy && (
          <button
            className="btn"
            style={{ width: '100%', marginTop: 14 }}
            onClick={guardarPesos}
            disabled={guardando}
          >
            {guardando ? 'Guardando...' : guardado ? '✓ Pesos guardados' : 'Guardar pesos de hoy'}
          </button>
        )}
        {!editando && itemsDia.length > 0 && !esHoy && (
          <p className="nota-privacidad">Los pesos se cargan el día del entrenamiento 📅</p>
        )}
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
            <div className="ficha-icono">
              <Pictograma nombre={ficha.nombre} />
            </div>
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
