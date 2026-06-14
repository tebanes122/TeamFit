import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase, GIMNASIO_ID, hoyISO, diasHasta, usuarioActual, cerrarSesion } from '../lib/supabase';

// ============================================================
// GESTIÓN DE ALUMNOS — solo para el dueño
// Alta, edición, baja, registro de pagos y cambio de plan.
// ============================================================

function pesos(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR');
}
function iniciales(n, a) {
  return ((n?.[0] || '') + (a?.[0] || '')).toUpperCase();
}
function fechaLinda(iso) {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function estadoTexto(dias) {
  if (dias === null) return { txt: 'Sin cuota', clase: 'estado-pronto' };
  if (dias < 0) return { txt: `Venció hace ${Math.abs(dias)}d`, clase: 'estado-vencida' };
  if (dias <= 5) return { txt: `Vence en ${dias}d`, clase: 'estado-pronto' };
  return { txt: 'Al día', clase: 'estado-ok' };
}

const FORM_VACIO = { nombre: '', apellido: '', dni: '', telefono: '', email: '', plan_id: '' };

function linkInvitacion(a) {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams({ inv: a.dni || '', n: a.nombre || '', a: a.apellido || '' });
  if (a.telefono) params.set('tel', a.telefono);
  return base + '/login?' + params.toString();
}

function linkWspInvitacion(a) {
  const url = linkInvitacion(a);
  const msg = 'Hola ' + a.nombre + '! Te invitamos a activar tu cuenta en la app de Team Fit. Con este link ya quedan cargados tus datos, solo pones tu email y una contrasena:\n\n' + url + '\n\nAhi vas a ver tu rutina, tus pesos y el estado de tu cuota. Te esperamos en Team Fit!';
  const tel = (a.telefono || '').replace(/\D/g, '');
  return 'https://wa.me/' + (tel ? '54' + tel : '') + '?text=' + encodeURIComponent(msg);
}

export default function Alumnos() {
  const router = useRouter();
  const [estado, setEstado] = useState('cargando'); // cargando | sinpermiso | ok
  const [alumnos, setAlumnos] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(null); // { tipo: 'alta'|'editar'|'pago', alumno? }
  const [form, setForm] = useState(FORM_VACIO);
  const [pagoMonto, setPagoMonto] = useState('');
  const [pagoMetodo, setPagoMetodo] = useState('efectivo');
  const [trabajando, setTrabajando] = useState(false);

  async function cargar() {
    const { session, alumno: yo } = await usuarioActual();
    if (!session) { router.replace('/login'); return; }
    if (yo?.rol !== 'dueno') { setEstado('sinpermiso'); return; }

    const [rAl, rPl] = await Promise.all([
      supabase
        .from('alumnos')
        .select('id, nombre, apellido, dni, telefono, email, vencimiento, activo, rol, plan_id, auth_user_id, planes(nombre, precio)')
        .eq('gimnasio_id', GIMNASIO_ID)
        .eq('rol', 'alumno')
        .order('apellido'),
      supabase
        .from('planes')
        .select('id, nombre, precio')
        .eq('gimnasio_id', GIMNASIO_ID)
        .eq('activo', true)
        .order('dias_por_semana'),
    ]);
    setAlumnos(rAl.data || []);
    setPlanes(rPl.data || []);
    setEstado('ok');
  }

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  function abrirAlta() {
    setForm({ ...FORM_VACIO, plan_id: planes[0]?.id || '' });
    setModal({ tipo: 'alta' });
  }
  function abrirEditar(a) {
    setForm({
      nombre: a.nombre || '', apellido: a.apellido || '', dni: a.dni || '',
      telefono: a.telefono || '', email: a.email || '', plan_id: a.plan_id || '',
    });
    setModal({ tipo: 'editar', alumno: a });
  }
  function abrirPago(a) {
    const precio = planes.find((p) => p.id === a.plan_id)?.precio || a.planes?.precio || '';
    setPagoMonto(precio ? String(precio) : '');
    setPagoMetodo('efectivo');
    setModal({ tipo: 'pago', alumno: a });
  }

  async function guardarAlta() {
    if (!form.nombre.trim() || !form.apellido.trim()) { alert('Nombre y apellido son obligatorios.'); return; }
    setTrabajando(true);
    const { error } = await supabase.from('alumnos').insert({
      gimnasio_id: GIMNASIO_ID,
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      dni: form.dni.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      plan_id: form.plan_id || null,
      rol: 'alumno',
      activo: true,
    });
    setTrabajando(false);
    if (error) { alert('No se pudo dar de alta: ' + error.message); return; }
    setModal(null);
    await cargar();
  }

  async function guardarEdicion() {
    setTrabajando(true);
    const { error } = await supabase.from('alumnos').update({
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      dni: form.dni.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      plan_id: form.plan_id || null,
    }).eq('id', modal.alumno.id);
    setTrabajando(false);
    if (error) { alert('No se pudo guardar: ' + error.message); return; }
    setModal(null);
    await cargar();
  }

  async function registrarPago() {
    const monto = Number(pagoMonto);
    if (!monto || monto <= 0) { alert('Ingresá un monto válido.'); return; }
    setTrabajando(true);
    const a = modal.alumno;
    // nuevo vencimiento: 30 días desde hoy, o desde el vencimiento actual si todavía no venció
    const hoy = new Date(hoyISO());
    const venceActual = a.vencimiento ? new Date(a.vencimiento) : null;
    const base = venceActual && venceActual > hoy ? venceActual : hoy;
    const nuevo = new Date(base.getTime() + 30 * 86400000);
    const off = nuevo.getTimezoneOffset();
    const nuevoISO = new Date(nuevo.getTime() - off * 60000).toISOString().slice(0, 10);

    const rPago = await supabase.from('pagos').insert({
      gimnasio_id: GIMNASIO_ID,
      alumno_id: a.id,
      monto,
      fecha_pago: hoyISO(),
      vencimiento: nuevoISO,
      metodo: pagoMetodo,
    });
    if (rPago.error) { setTrabajando(false); alert('No se pudo registrar el pago: ' + rPago.error.message); return; }

    const rUpd = await supabase.from('alumnos').update({ vencimiento: nuevoISO }).eq('id', a.id);
    setTrabajando(false);
    if (rUpd.error) { alert('Pago registrado pero no se actualizó el vencimiento: ' + rUpd.error.message); }
    setModal(null);
    await cargar();
  }

  async function alternarActivo(a) {
    const accion = a.activo ? 'dar de baja' : 'reactivar';
    if (!confirm(`¿Querés ${accion} a ${a.nombre} ${a.apellido}?`)) return;
    const { error } = await supabase.from('alumnos').update({ activo: !a.activo }).eq('id', a.id);
    if (error) alert('No se pudo: ' + error.message);
    else await cargar();
  }

  // ---------- render ----------
  if (estado === 'cargando') {
    return (
      <div className="shell">
        <div className="topbar"><Link href="/" className="logo">TEAM<span>FIT</span></Link></div>
        <p className="subtitulo">Cargando alumnos...</p>
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
          <h1 className="titulo">Solo para el dueño 🔒</h1>
        </div>
      </div>
    );
  }

  const filtrados = alumnos.filter((a) => {
    const t = (a.nombre + ' ' + a.apellido + ' ' + (a.dni || '')).toLowerCase();
    return t.includes(busca.toLowerCase());
  });
  const activos = filtrados.filter((a) => a.activo);
  const inactivos = filtrados.filter((a) => !a.activo);

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="logo">TEAM<span>FIT</span></Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/admin" className="rol-chip" style={{ textDecoration: 'none' }}>← Panel</Link>
          <button className="btn-salir" onClick={async () => { await cerrarSesion(); router.push('/login'); }}>Salir</button>
        </div>
      </div>

      <div>
        <div className="eyebrow">Administración</div>
        <h1 className="titulo">Alumnos</h1>
        <p className="subtitulo">{activos.length} activos{inactivos.length ? ` · ${inactivos.length} dados de baja` : ''}</p>
      </div>

      <div className="seccion">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            className="input-login"
            style={{ flex: 1, minWidth: 180 }}
            type="text"
            placeholder="Buscar por nombre o DNI..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <button className="btn" onClick={abrirAlta}>+ Nuevo alumno</button>
        </div>
      </div>

      <div className="seccion">
        <div className="lista">
          {activos.map((a) => {
            const dias = diasHasta(a.vencimiento);
            const est = estadoTexto(dias);
            return (
              <div className="fila" key={a.id}>
                <div className="avatar">{iniciales(a.nombre, a.apellido)}</div>
                <div className="fila-info">
                  <div className="fila-nombre">{a.nombre} {a.apellido}</div>
                  <div className="fila-detalle">
                    {a.planes?.nombre || 'Sin plan'} · Vence {fechaLinda(a.vencimiento)} · DNI {a.dni || '—'} {a.auth_user_id && <span className="tiene-cuenta">✓ con cuenta</span>}
                  </div>
                </div>
                <span className={`estado ${est.clase}`}>{est.txt}</span>
                <div className="acciones-alumno">
                  {!a.auth_user_id && (
                    a.telefono ? (
                      <a className="btn-invitar" href={linkWspInvitacion(a)} target="_blank" rel="noreferrer" title="Invitar por WhatsApp">
                        ✉ Invitar
                      </a>
                    ) : (
                      <button
                        className="btn-invitar"
                        title="Copiar enlace de invitación"
                        onClick={() => {
                          navigator.clipboard?.writeText(linkInvitacion(a));
                          alert('Enlace de invitación copiado. Pegáselo al alumno por donde quieras.');
                        }}
                      >
                        🔗 Invitar
                      </button>
                    )
                  )}
                  <button className="btn-wsp" onClick={() => abrirPago(a)}>💲 Pago</button>
                  <button className="btn-mini" onClick={() => abrirEditar(a)}>✎</button>
                  <button className="btn-mini btn-mini-baja" onClick={() => alternarActivo(a)}>⏻</button>
                </div>
              </div>
            );
          })}
        </div>

        {inactivos.length > 0 && (
          <>
            <div className="seccion-titulo" style={{ marginTop: 24 }}>Dados de baja</div>
            <div className="lista">
              {inactivos.map((a) => (
                <div className="fila" key={a.id} style={{ opacity: 0.55 }}>
                  <div className="avatar">{iniciales(a.nombre, a.apellido)}</div>
                  <div className="fila-info">
                    <div className="fila-nombre">{a.nombre} {a.apellido}</div>
                    <div className="fila-detalle">DNI {a.dni || '—'}</div>
                  </div>
                  <button className="btn-mini" onClick={() => alternarActivo(a)}>Reactivar</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ---------- MODALES ---------- */}
      {modal && (
        <div className="modal-fondo" onClick={() => !trabajando && setModal(null)}>
          <div className="modal-ficha" onClick={(e) => e.stopPropagation()}>

            {(modal.tipo === 'alta' || modal.tipo === 'editar') && (
              <>
                <h2 className="ficha-titulo">{modal.tipo === 'alta' ? 'Nuevo alumno' : 'Editar alumno'}</h2>
                <div className="login-form" style={{ marginTop: 16 }}>
                  <div className="login-fila2">
                    <input className="input-login" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                    <input className="input-login" placeholder="Apellido" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
                  </div>
                  <div className="login-fila2">
                    <input className="input-login" placeholder="DNI" inputMode="numeric" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} />
                    <input className="input-login" placeholder="Teléfono" type="tel" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
                  </div>
                  <input className="input-login" placeholder="Email (opcional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <select className="input-login" value={form.plan_id} onChange={(e) => setForm({ ...form, plan_id: e.target.value })}>
                    <option value="">Sin plan</option>
                    {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre} — {pesos(p.precio)}</option>)}
                  </select>
                  <button className="btn" disabled={trabajando} onClick={modal.tipo === 'alta' ? guardarAlta : guardarEdicion}>
                    {trabajando ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button className="btn btn-secundario" onClick={() => setModal(null)}>Cancelar</button>
                </div>
              </>
            )}

            {modal.tipo === 'pago' && (
              <>
                <h2 className="ficha-titulo">Registrar pago</h2>
                <p className="ficha-musculos">{modal.alumno.nombre} {modal.alumno.apellido}</p>
                <p className="subtitulo" style={{ marginTop: 6 }}>
                  Vencimiento actual: {fechaLinda(modal.alumno.vencimiento)}
                </p>
                <div className="login-form" style={{ marginTop: 16 }}>
                  <label className="ficha-sub" style={{ marginTop: 0 }}>Monto</label>
                  <input className="input-login" type="number" inputMode="numeric" value={pagoMonto} onChange={(e) => setPagoMonto(e.target.value)} />
                  <label className="ficha-sub">Método</label>
                  <select className="input-login" value={pagoMetodo} onChange={(e) => setPagoMetodo(e.target.value)}>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                  <p className="nota-privacidad" style={{ textAlign: 'left' }}>
                    El nuevo vencimiento se calcula automáticamente: 30 días {modal.alumno.vencimiento && diasHasta(modal.alumno.vencimiento) > 0 ? 'desde el vencimiento actual' : 'desde hoy'}.
                  </p>
                  <button className="btn" disabled={trabajando} onClick={registrarPago}>
                    {trabajando ? 'Registrando...' : `Cobrar ${pagoMonto ? pesos(pagoMonto) : ''}`}
                  </button>
                  <button className="btn btn-secundario" onClick={() => setModal(null)}>Cancelar</button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
