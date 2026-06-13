import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase, GIMNASIO_ID, hoyISO, diasHasta, usuarioActual, cerrarSesion } from '../lib/supabase';

// ============================================================
// PANEL DEL DUEÑO — conectado a Supabase
// ============================================================

function pesos(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR');
}

function iniciales(nombre, apellido) {
  return ((nombre?.[0] || '') + (apellido?.[0] || '')).toUpperCase();
}

function linkWsp(tel, mensaje) {
  return `https://wa.me/54${tel}?text=${encodeURIComponent(mensaje)}`;
}

function textoVencimiento(dias) {
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vence mañana';
  if (dias > 1) return `Vence en ${dias} días`;
  if (dias === -1) return 'Venció ayer';
  return `Venció hace ${Math.abs(dias)} días`;
}

export default function Admin() {
  const router = useRouter();
  const [sinPermiso, setSinPermiso] = useState(false);
  const [solicitudes, setSolicitudes] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [procesando, setProcesando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [ingresosMes, setIngresosMes] = useState(0);
  const [cantPagosMes, setCantPagosMes] = useState(0);
  const [asistenciasHoy, setAsistenciasHoy] = useState([]);
  const [ultimasAsistencias, setUltimasAsistencias] = useState([]);
  const [ultimosPagos, setUltimosPagos] = useState([]);

  useEffect(() => {
    async function cargar() {
      try {
        const { session, alumno: yo } = await usuarioActual();
        if (!session) {
          router.replace('/login');
          return;
        }
        if (yo?.rol !== 'dueno') {
          setSinPermiso(true);
          setCargando(false);
          return;
        }

        const hoy = hoyISO();
        const inicioMes = hoy.slice(0, 8) + '01';
        const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

        const [rAlumnos, rPagosMes, rAsisHoy, rAsis30, rPagosUlt, rSol, rPlanes] = await Promise.all([
          supabase
            .from('alumnos')
            .select('id, nombre, apellido, telefono, vencimiento, planes(nombre, precio)')
            .eq('gimnasio_id', GIMNASIO_ID)
            .eq('activo', true)
            .eq('rol', 'alumno'),
          supabase
            .from('pagos')
            .select('monto')
            .eq('gimnasio_id', GIMNASIO_ID)
            .gte('fecha_pago', inicioMes),
          supabase
            .from('asistencias')
            .select('alumno_id, hora')
            .eq('gimnasio_id', GIMNASIO_ID)
            .eq('fecha', hoy),
          supabase
            .from('asistencias')
            .select('alumno_id, fecha')
            .eq('gimnasio_id', GIMNASIO_ID)
            .gte('fecha', hace30),
          supabase
            .from('pagos')
            .select('monto, fecha_pago, alumnos(nombre, apellido, planes(nombre))')
            .eq('gimnasio_id', GIMNASIO_ID)
            .order('fecha_pago', { ascending: false })
            .limit(5),
          supabase
            .from('solicitudes_registro')
            .select('*')
            .eq('estado', 'pendiente')
            .order('creado_en', { ascending: true }),
          supabase
            .from('planes')
            .select('id, nombre')
            .eq('gimnasio_id', GIMNASIO_ID)
            .eq('activo', true)
            .order('dias_por_semana'),
        ]);

        const errores = [rAlumnos, rPagosMes, rAsisHoy, rAsis30, rPagosUlt, rSol, rPlanes].find((r) => r.error);
        if (errores) throw errores.error;

        setAlumnos(rAlumnos.data || []);
        setIngresosMes((rPagosMes.data || []).reduce((acc, p) => acc + Number(p.monto), 0));
        setCantPagosMes((rPagosMes.data || []).length);
        setAsistenciasHoy(rAsisHoy.data || []);
        setUltimasAsistencias(rAsis30.data || []);
        setUltimosPagos(rPagosUlt.data || []);
        setSolicitudes(rSol.data || []);
        setPlanes(rPlanes.data || []);
      } catch (e) {
        setError(e.message || 'Error al cargar los datos');
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  // ---------- aprobación de cuentas ----------
  async function aprobarSolicitud(sol) {
    setProcesando(sol.id);
    try {
      // si ya existe un alumno con ese DNI sin cuenta, se vincula; si no, se crea
      let vinculado = false;
      if (sol.dni) {
        const rExiste = await supabase
          .from('alumnos')
          .select('id')
          .eq('gimnasio_id', GIMNASIO_ID)
          .eq('dni', sol.dni)
          .is('auth_user_id', null)
          .maybeSingle();
        if (rExiste.data) {
          const rUpd = await supabase
            .from('alumnos')
            .update({ auth_user_id: sol.auth_user_id, email: sol.email })
            .eq('id', rExiste.data.id);
          if (rUpd.error) throw rUpd.error;
          vinculado = true;
        }
      }
      if (!vinculado) {
        const rIns = await supabase.from('alumnos').insert({
          gimnasio_id: GIMNASIO_ID,
          nombre: sol.nombre || 'Alumno',
          apellido: sol.apellido || '',
          dni: sol.dni || null,
          telefono: sol.telefono || null,
          email: sol.email,
          auth_user_id: sol.auth_user_id,
          plan_id: planes[0]?.id || null,
          rol: 'alumno',
          activo: true,
        });
        if (rIns.error) throw rIns.error;
      }
      const rSol = await supabase
        .from('solicitudes_registro')
        .update({ estado: 'aprobada' })
        .eq('id', sol.id);
      if (rSol.error) throw rSol.error;
      setSolicitudes(solicitudes.filter((s) => s.id !== sol.id));
    } catch (e) {
      alert('No se pudo aprobar: ' + e.message);
    } finally {
      setProcesando(null);
    }
  }

  async function rechazarSolicitud(sol) {
    if (!confirm(`¿Rechazar la solicitud de ${sol.nombre} ${sol.apellido}?`)) return;
    setProcesando(sol.id);
    const r = await supabase
      .from('solicitudes_registro')
      .update({ estado: 'rechazada' })
      .eq('id', sol.id);
    if (r.error) alert('No se pudo rechazar: ' + r.error.message);
    else setSolicitudes(solicitudes.filter((s) => s.id !== sol.id));
    setProcesando(null);
  }

  // ---------- cálculos derivados ----------
  const conDias = alumnos.map((a) => ({ ...a, dias: diasHasta(a.vencimiento) }));
  const vencidas = conDias.filter((a) => a.dias !== null && a.dias < 0).sort((x, y) => x.dias - y.dias);
  const porVencer = conDias.filter((a) => a.dias !== null && a.dias >= 0 && a.dias <= 5).sort((x, y) => x.dias - y.dias);
  const deudaTotal = vencidas.reduce((acc, a) => acc + Number(a.planes?.precio || 0), 0);

  // riesgo de abandono: cuota al día pero sin venir hace 10+ días
  const ultimaVisita = {};
  ultimasAsistencias.forEach((as) => {
    if (!ultimaVisita[as.alumno_id] || as.fecha > ultimaVisita[as.alumno_id]) {
      ultimaVisita[as.alumno_id] = as.fecha;
    }
  });
  const riesgoAbandono = conDias
    .filter((a) => a.dias !== null && a.dias > 5)
    .map((a) => {
      const ult = ultimaVisita[a.id];
      const diasSinVenir = ult ? Math.abs(diasHasta(ult)) : null;
      return { ...a, diasSinVenir };
    })
    .filter((a) => a.diasSinVenir === null || a.diasSinVenir >= 10)
    .slice(0, 5);

  // horas pico de hoy
  const franjas = [7, 8, 9, 10, 11, 14, 16, 17, 18, 19, 20, 21];
  const horasPico = franjas.map((h) => ({
    hora: h + 'h',
    valor: asistenciasHoy.filter((a) => parseInt(a.hora?.slice(0, 2), 10) === h).length,
  }));
  const maxHora = Math.max(1, ...horasPico.map((h) => h.valor));

  const fechaLinda = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (sinPermiso) {
    return (
      <div className="shell">
        <div className="topbar">
          <Link href="/" className="logo">TEAM<span>FIT</span></Link>
          <button className="btn-salir" onClick={async () => { await cerrarSesion(); router.push('/login'); }}>Salir</button>
        </div>
        <div className="seccion" style={{ textAlign: 'center', paddingTop: 40 }}>
          <div className="eyebrow">Acceso restringido</div>
          <h1 className="titulo">Solo para el dueño 🔒</h1>
          <p className="subtitulo" style={{ maxWidth: 420, margin: '14px auto 0' }}>
            Este panel es exclusivo de la administración de Team Fit.
            Si sos alumno, tu espacio está en la sección de entrenamiento.
          </p>
          <Link href="/alumno" className="btn" style={{ marginTop: 20, display: 'inline-flex' }}>
            Ir a mi entrenamiento →
          </Link>
        </div>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="shell">
        <div className="topbar">
          <Link href="/" className="logo">TEAM<span>FIT</span></Link>
          <span className="rol-chip">Panel del dueño</span>
        </div>
        <p className="subtitulo">Cargando datos del gimnasio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shell">
        <div className="topbar">
          <Link href="/" className="logo">TEAM<span>FIT</span></Link>
          <span className="rol-chip">Panel del dueño</span>
        </div>
        <p className="subtitulo">No se pudieron cargar los datos: {error}</p>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="logo">TEAM<span>FIT</span></Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="rol-chip">Panel del dueño</span>
          <button className="btn-salir" onClick={async () => { await cerrarSesion(); router.push('/login'); }}>Salir</button>
        </div>
      </div>

      <div>
        <div className="eyebrow">Resumen de hoy</div>
        <h1 className="titulo">Hola, Team Fit</h1>
        <p className="subtitulo" style={{ textTransform: 'capitalize' }}>{fechaLinda}</p>
      </div>

      <div className="seccion" style={{ marginTop: 18 }}>
        <Link href="/alumnos" className="btn" style={{ width: '100%' }}>
          👥 Gestionar alumnos y pagos
        </Link>
      </div>

      {/* ---------- Solicitudes pendientes ---------- */}
      {solicitudes.length > 0 && (
        <div className="seccion">
          <div className="seccion-titulo">🔔 Cuentas por aprobar ({solicitudes.length})</div>
          <div className="lista">
            {solicitudes.map((s) => (
              <div className="fila" key={s.id}>
                <div className="avatar">{iniciales(s.nombre || '?', s.apellido || '?')}</div>
                <div className="fila-info">
                  <div className="fila-nombre">{s.nombre} {s.apellido}</div>
                  <div className="fila-detalle">
                    DNI {s.dni || '—'} · {s.email}{s.telefono ? ` · ${s.telefono}` : ''}
                  </div>
                </div>
                <button
                  className="btn-wsp"
                  disabled={procesando === s.id}
                  onClick={() => aprobarSolicitud(s)}
                >
                  {procesando === s.id ? '...' : '✓ Aprobar'}
                </button>
                <button
                  className="btn-quitar"
                  disabled={procesando === s.id}
                  onClick={() => rechazarSolicitud(s)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- KPIs ---------- */}
      <div className="seccion">
        <div className="kpis">
          <div className="kpi">
            <div className="kpi-label">Alumnos activos</div>
            <div className="kpi-valor">{alumnos.length}</div>
          </div>
          <div className="kpi kpi-verde">
            <div className="kpi-label">Ingresos del mes</div>
            <div className="kpi-valor">{pesos(ingresosMes)}</div>
            <div className="kpi-extra">{cantPagosMes} cuotas cobradas</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Asistencias hoy</div>
            <div className="kpi-valor">{asistenciasHoy.length}</div>
          </div>
          <div className="kpi kpi-rojo">
            <div className="kpi-label">Sin cobrar</div>
            <div className="kpi-valor">{pesos(deudaTotal)}</div>
            <div className="kpi-extra">{vencidas.length} cuotas vencidas</div>
          </div>
        </div>
      </div>

      {/* ---------- Cuotas vencidas ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">🔴 Cuotas vencidas</div>
        {vencidas.length === 0 ? (
          <p className="subtitulo">No hay cuotas vencidas. ¡Excelente!</p>
        ) : (
          <div className="lista">
            {vencidas.map((a) => (
              <div className="fila" key={a.id}>
                <div className="avatar">{iniciales(a.nombre, a.apellido)}</div>
                <div className="fila-info">
                  <div className="fila-nombre">{a.nombre} {a.apellido}</div>
                  <div className="fila-detalle">
                    Plan {a.planes?.nombre} · {textoVencimiento(a.dias)} · Debe {pesos(a.planes?.precio)}
                  </div>
                </div>
                <span className="estado estado-vencida">Vencida</span>
                {a.telefono && (
                  <a
                    className="btn-wsp"
                    target="_blank"
                    rel="noreferrer"
                    href={linkWsp(a.telefono, `Hola ${a.nombre}! Te escribimos de Team Fit 💪 Tu cuota está vencida, te esperamos para regularizarla y que sigas entrenando con nosotros.`)}
                  >
                    Recordar por WhatsApp
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Por vencer ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">🟡 Próximas a vencer</div>
        {porVencer.length === 0 ? (
          <p className="subtitulo">Ninguna cuota vence en los próximos 5 días.</p>
        ) : (
          <div className="lista">
            {porVencer.map((a) => (
              <div className="fila" key={a.id}>
                <div className="avatar">{iniciales(a.nombre, a.apellido)}</div>
                <div className="fila-info">
                  <div className="fila-nombre">{a.nombre} {a.apellido}</div>
                  <div className="fila-detalle">Plan {a.planes?.nombre} · {textoVencimiento(a.dias)}</div>
                </div>
                <span className="estado estado-pronto">Por vencer</span>
                {a.telefono && (
                  <a
                    className="btn-wsp"
                    target="_blank"
                    rel="noreferrer"
                    href={linkWsp(a.telefono, `Hola ${a.nombre}! Te recordamos de Team Fit que tu cuota vence pronto 💪 ¡Te esperamos!`)}
                  >
                    Recordar por WhatsApp
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Riesgo de abandono ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">⚠️ Riesgo de abandono</div>
        <p className="subtitulo" style={{ marginBottom: 12 }}>
          Alumnos con cuota al día que dejaron de venir. Un mensaje a tiempo puede retener la cuota.
        </p>
        {riesgoAbandono.length === 0 ? (
          <p className="subtitulo">Todos los alumnos al día vinieron recientemente.</p>
        ) : (
          <div className="lista">
            {riesgoAbandono.map((a) => (
              <div className="fila" key={a.id}>
                <div className="avatar">{iniciales(a.nombre, a.apellido)}</div>
                <div className="fila-info">
                  <div className="fila-nombre">{a.nombre} {a.apellido}</div>
                  <div className="fila-detalle">
                    {a.diasSinVenir === null ? 'Sin asistencias registradas' : `Última asistencia: hace ${a.diasSinVenir} días`}
                  </div>
                </div>
                {a.telefono && (
                  <a
                    className="btn-wsp"
                    target="_blank"
                    rel="noreferrer"
                    href={linkWsp(a.telefono, `Hola ${a.nombre}! Te extrañamos en Team Fit 💪 ¿Todo bien? Te esperamos para retomar el entrenamiento.`)}
                  >
                    Escribirle
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Horas pico ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">Horas pico de hoy</div>
        <div className="barras">
          {horasPico.map((h) => (
            <div
              key={h.hora}
              className={'barra' + (h.valor === maxHora && h.valor > 0 ? ' activa' : '')}
              style={{ height: `${Math.max(4, (h.valor / maxHora) * 100)}%` }}
            >
              <span className="barra-label">{h.hora}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Últimos pagos ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">Últimos pagos registrados</div>
        {ultimosPagos.length === 0 ? (
          <p className="subtitulo">Todavía no hay pagos registrados.</p>
        ) : (
          <div className="panel-tabla">
            <table className="mini-tabla">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Fecha</th>
                  <th>Plan</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {ultimosPagos.map((p, i) => (
                  <tr key={i}>
                    <td>{p.alumnos?.nombre} {p.alumnos?.apellido}</td>
                    <td>{new Date(p.fecha_pago + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</td>
                    <td>{p.alumnos?.planes?.nombre}</td>
                    <td style={{ fontWeight: 700 }}>{pesos(p.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
