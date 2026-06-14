import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase, GIMNASIO_ID, usuarioActual, cerrarSesion } from '../lib/supabase';
import Pictograma from '../components/Pictogramas';

// ============================================================
// PANEL DEL PROFESOR — plantillas de rutina y asignación
// Accesible para rol 'profesor' y 'dueno'.
// ============================================================

const DIAS = [
  { num: 1, letra: 'L' }, { num: 2, letra: 'M' }, { num: 3, letra: 'X' },
  { num: 4, letra: 'J' }, { num: 5, letra: 'V' }, { num: 6, letra: 'S' }, { num: 7, letra: 'D' },
];

function iniciales(n, a) {
  return ((n?.[0] || '') + (a?.[0] || '')).toUpperCase();
}

export default function Profesor() {
  const router = useRouter();
  const [estado, setEstado] = useState('cargando'); // cargando | sinpermiso | ok
  const [catalogo, setCatalogo] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [vista, setVista] = useState('plantillas'); // plantillas | editar | asignar
  const [plantillaActiva, setPlantillaActiva] = useState(null);
  const [items, setItems] = useState([]);
  const [diaSel, setDiaSel] = useState(1);
  const [nombrePlantilla, setNombrePlantilla] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [msg, setMsg] = useState(null);

  async function cargar() {
    const { session, alumno: yo } = await usuarioActual();
    if (!session) { router.replace('/login'); return; }
    if (yo?.rol !== 'profesor' && yo?.rol !== 'dueno') { setEstado('sinpermiso'); return; }

    const [rCat, rPlant, rAl] = await Promise.all([
      supabase.from('ejercicios').select('id, nombre, grupo_muscular').order('grupo_muscular').order('nombre'),
      supabase.from('rutinas').select('id, nombre').eq('gimnasio_id', GIMNASIO_ID).eq('es_plantilla', true).order('nombre'),
      supabase.from('alumnos').select('id, nombre, apellido').eq('gimnasio_id', GIMNASIO_ID).eq('rol', 'alumno').eq('activo', true).order('apellido'),
    ]);
    setCatalogo(rCat.data || []);
    setPlantillas(rPlant.data || []);
    setAlumnos(rAl.data || []);
    setEstado('ok');
  }

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  async function crearPlantilla() {
    const nombre = prompt('Nombre de la plantilla (ej: Hipertrofia 5 días - Principiante):');
    if (!nombre || !nombre.trim()) return;
    const r = await supabase.from('rutinas')
      .insert({ gimnasio_id: GIMNASIO_ID, nombre: nombre.trim(), es_plantilla: true, alumno_id: null })
      .select('id, nombre').single();
    if (r.error) { alert('No se pudo crear: ' + r.error.message); return; }
    setPlantillas([...plantillas, r.data]);
    abrirPlantilla(r.data);
  }

  async function abrirPlantilla(p) {
    setPlantillaActiva(p);
    setNombrePlantilla(p.nombre);
    setDiaSel(1);
    const r = await supabase.from('rutina_ejercicios')
      .select('id, dia, orden, series, repeticiones, ejercicio_id')
      .eq('rutina_id', p.id).order('dia').order('orden');
    setItems(r.data || []);
    setVista('editar');
  }

  async function borrarPlantilla(p) {
    if (!confirm(`¿Borrar la plantilla "${p.nombre}"? Las rutinas ya asignadas a alumnos no se tocan.`)) return;
    const r = await supabase.from('rutinas').delete().eq('id', p.id);
    if (r.error) { alert('No se pudo borrar: ' + r.error.message); return; }
    setPlantillas(plantillas.filter((x) => x.id !== p.id));
  }

  async function agregarEjercicio(ejId) {
    const delDia = items.filter((it) => it.dia === diaSel);
    const orden = delDia.length ? Math.max(...delDia.map((it) => it.orden)) + 1 : 1;
    const r = await supabase.from('rutina_ejercicios')
      .insert({ rutina_id: plantillaActiva.id, ejercicio_id: ejId, dia: diaSel, orden, series: 4, repeticiones: '10' })
      .select('id, dia, orden, series, repeticiones, ejercicio_id').single();
    if (r.error) { alert('No se pudo agregar: ' + r.error.message); return; }
    setItems([...items, r.data]);
  }

  async function quitarItem(itemId) {
    const r = await supabase.from('rutina_ejercicios').delete().eq('id', itemId);
    if (!r.error) setItems(items.filter((it) => it.id !== itemId));
  }

  function cambiarLocal(itemId, campos) {
    setItems(items.map((it) => (it.id === itemId ? { ...it, ...campos } : it)));
  }
  async function guardarItem(itemId) {
    const it = items.find((x) => x.id === itemId);
    if (!it) return;
    await supabase.from('rutina_ejercicios')
      .update({ series: Number(it.series) || 1, repeticiones: String(it.repeticiones || '10') })
      .eq('id', itemId);
  }

  async function guardarNombre() {
    if (!nombrePlantilla.trim()) return;
    await supabase.from('rutinas').update({ nombre: nombrePlantilla.trim() }).eq('id', plantillaActiva.id);
    setPlantillas(plantillas.map((p) => (p.id === plantillaActiva.id ? { ...p, nombre: nombrePlantilla.trim() } : p)));
  }

  // ---------- asignar plantilla a un alumno ----------
  async function asignarAAlumno(alumnoId) {
    if (!confirm('Esto reemplaza la rutina actual del alumno por esta plantilla. ¿Confirmás?')) return;
    setTrabajando(true);
    setMsg(null);
    try {
      // 1) traer los ejercicios de la plantilla
      const rPlant = await supabase.from('rutina_ejercicios')
        .select('dia, orden, series, repeticiones, ejercicio_id')
        .eq('rutina_id', plantillaActiva.id);
      if (rPlant.error) throw rPlant.error;

      // 2) buscar (o crear) la rutina personal del alumno
      let rutinaAlumno;
      const rBusca = await supabase.from('rutinas')
        .select('id').eq('alumno_id', alumnoId).eq('es_plantilla', false).limit(1);
      if (rBusca.error) throw rBusca.error;
      if (rBusca.data && rBusca.data.length) {
        rutinaAlumno = rBusca.data[0].id;
        // limpiar la rutina actual
        const rDel = await supabase.from('rutina_ejercicios').delete().eq('rutina_id', rutinaAlumno);
        if (rDel.error) throw rDel.error;
      } else {
        const rNueva = await supabase.from('rutinas')
          .insert({ gimnasio_id: GIMNASIO_ID, alumno_id: alumnoId, nombre: 'Mi rutina', es_plantilla: false })
          .select('id').single();
        if (rNueva.error) throw rNueva.error;
        rutinaAlumno = rNueva.data.id;
      }

      // 3) copiar los ejercicios de la plantilla a la rutina del alumno
      const filas = (rPlant.data || []).map((e) => ({
        rutina_id: rutinaAlumno, ejercicio_id: e.ejercicio_id,
        dia: e.dia, orden: e.orden, series: e.series, repeticiones: e.repeticiones,
      }));
      if (filas.length) {
        const rIns = await supabase.from('rutina_ejercicios').insert(filas);
        if (rIns.error) throw rIns.error;
      }
      const al = alumnos.find((a) => a.id === alumnoId);
      setMsg(`✓ Rutina asignada a ${al.nombre} ${al.apellido}`);
    } catch (e) {
      setMsg('Error al asignar: ' + e.message);
    } finally {
      setTrabajando(false);
    }
  }

  // ---------- render ----------
  if (estado === 'cargando') {
    return (
      <div className="shell">
        <div className="topbar"><Link href="/" className="logo">TEAM<span>FIT</span></Link></div>
        <p className="subtitulo">Cargando...</p>
      </div>
    );
  }
  if (estado === 'sinpermiso') {
    return (
      <div className="shell">
        <div className="topbar">
          <Link href="/" className="logo">TEAM<span>FIT</span></Link>
          <button className="btn-salir" onClick={async () => { await cerrarSesion(); router.push('/login'); }}>Salir</button>
        </div>
        <div className="seccion" style={{ textAlign: 'center', paddingTop: 40 }}>
          <div className="eyebrow">Acceso restringido</div>
          <h1 className="titulo">Solo para profesores 🔒</h1>
        </div>
      </div>
    );
  }

  const catPorId = {};
  catalogo.forEach((c) => (catPorId[c.id] = c));
  const itemsDia = items.filter((it) => it.dia === diaSel).sort((a, b) => a.orden - b.orden);
  const idsEnDia = new Set(itemsDia.map((it) => it.ejercicio_id));
  const grupos = [...new Set(catalogo.map((c) => c.grupo_muscular).filter(Boolean))];

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="logo">TEAM<span>FIT</span></Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="rol-chip">Profesor</span>
          <button className="btn-salir" onClick={async () => { await cerrarSesion(); router.push('/login'); }}>Salir</button>
        </div>
      </div>

      {/* ============ LISTA DE PLANTILLAS ============ */}
      {vista === 'plantillas' && (
        <>
          <div>
            <div className="eyebrow">Profesor</div>
            <h1 className="titulo">Plantillas de rutina</h1>
            <p className="subtitulo">Creá rutinas modelo y asignalas a tus alumnos en un toque.</p>
          </div>
          <div className="seccion">
            <button className="btn" style={{ width: '100%' }} onClick={crearPlantilla}>+ Nueva plantilla</button>
          </div>
          <div className="seccion">
            {plantillas.length === 0 ? (
              <p className="subtitulo">Todavía no hay plantillas. Creá la primera 💪</p>
            ) : (
              <div className="lista">
                {plantillas.map((p) => (
                  <div className="fila" key={p.id}>
                    <div className="fila-info">
                      <div className="fila-nombre">{p.nombre}</div>
                    </div>
                    <button className="btn-wsp" onClick={() => abrirPlantilla(p)}>✎ Editar</button>
                    <button className="btn-mini" onClick={() => { setPlantillaActiva(p); setVista('asignar'); setMsg(null); }}>👤 Asignar</button>
                    <button className="btn-mini btn-mini-baja" onClick={() => borrarPlantilla(p)}>🗑</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ============ EDITAR PLANTILLA ============ */}
      {vista === 'editar' && plantillaActiva && (
        <>
          <button className="login-link" onClick={() => { setVista('plantillas'); cargar(); }}>← Volver a plantillas</button>
          <div style={{ marginTop: 10 }}>
            <div className="eyebrow">Editando plantilla</div>
            <input className="input-login" style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}
              value={nombrePlantilla} onChange={(e) => setNombrePlantilla(e.target.value)} onBlur={guardarNombre} />
          </div>
          <div className="seccion">
            <div className="tabs-dias">
              {DIAS.map((d) => {
                const tiene = items.some((it) => it.dia === d.num);
                return (
                  <button key={d.num}
                    className={'tab-dia' + (d.num === diaSel ? ' activo' : '') + (tiene ? ' con-rutina' : '')}
                    onClick={() => setDiaSel(d.num)}>{d.letra}</button>
                );
              })}
            </div>

            {itemsDia.length === 0 ? (
              <p className="subtitulo" style={{ marginBottom: 12 }}>Día sin ejercicios. Agregá del catálogo de abajo.</p>
            ) : (
              <div className="lista" style={{ marginBottom: 16 }}>
                {itemsDia.map((it) => {
                  const ej = catPorId[it.ejercicio_id];
                  if (!ej) return null;
                  return (
                    <div className="ejercicio" key={it.id}>
                      <span className="mini-ejercicio"><Pictograma nombre={ej.nombre} /></span>
                      <div className="ejercicio-info">
                        <div className="ejercicio-nombre">{ej.nombre}</div>
                        <div className="series-editor">
                          <input className="input-mini" type="number" min="1" value={it.series}
                            onChange={(e) => cambiarLocal(it.id, { series: e.target.value })} onBlur={() => guardarItem(it.id)} />
                          <span>x</span>
                          <input className="input-mini input-reps" type="text" value={it.repeticiones}
                            onChange={(e) => cambiarLocal(it.id, { repeticiones: e.target.value })} onBlur={() => guardarItem(it.id)} />
                        </div>
                      </div>
                      <button className="btn-quitar" onClick={() => quitarItem(it.id)}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="ficha-sub">Agregar ejercicios</div>
            {grupos.map((g) => {
              const disp = catalogo.filter((c) => c.grupo_muscular === g && !idsEnDia.has(c.id));
              if (!disp.length) return null;
              return (
                <div key={g} className="catalogo-grupo">
                  <div className="catalogo-grupo-nombre">{g}</div>
                  {disp.map((c) => (
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
        </>
      )}

      {/* ============ ASIGNAR PLANTILLA ============ */}
      {vista === 'asignar' && plantillaActiva && (
        <>
          <button className="login-link" onClick={() => { setVista('plantillas'); setMsg(null); }}>← Volver a plantillas</button>
          <div style={{ marginTop: 10 }}>
            <div className="eyebrow">Asignar plantilla</div>
            <h1 className="titulo" style={{ fontSize: 26 }}>{plantillaActiva.nombre}</h1>
            <p className="subtitulo">Tocá un alumno para asignarle esta rutina.</p>
          </div>
          {msg && <p className={'login-msg' + (msg.startsWith('✓') ? '' : ' error')} style={{ marginTop: 14 }}>{msg}</p>}
          <div className="seccion">
            <div className="lista">
              {alumnos.map((a) => (
                <div className="fila" key={a.id}>
                  <div className="avatar">{iniciales(a.nombre, a.apellido)}</div>
                  <div className="fila-info">
                    <div className="fila-nombre">{a.nombre} {a.apellido}</div>
                  </div>
                  <button className="btn-wsp" disabled={trabajando} onClick={() => asignarAAlumno(a.id)}>
                    {trabajando ? '...' : 'Asignar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
