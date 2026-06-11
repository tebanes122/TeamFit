import Link from 'next/link';

// ============================================================
// DATOS DE PRUEBA (después esto sale de Supabase)
// ============================================================

const CUOTA_MENSUAL = 35000;

const kpis = {
  alumnosActivos: 87,
  ingresosMes: 2870000,
  asistenciasHoy: 34,
  cuotasVencidas: 5,
};

const porVencer = [
  { nombre: 'Lucas Benítez', plan: '5 días', vence: 'Vence en 2 días', tel: '3764000001', estado: 'pronto' },
  { nombre: 'Carla Domínguez', plan: '3 días', vence: 'Vence en 3 días', tel: '3764000002', estado: 'pronto' },
  { nombre: 'Marcos Silvero', plan: '5 días', vence: 'Vence mañana', tel: '3764000003', estado: 'pronto' },
];

const vencidas = [
  { nombre: 'Rodrigo Acosta', plan: '5 días', vence: 'Venció hace 6 días', tel: '3764000004', deuda: 35000 },
  { nombre: 'Mariana López', plan: '3 días', vence: 'Venció hace 4 días', tel: '3764000005', deuda: 35000 },
  { nombre: 'Diego Ferreyra', plan: '3 días', vence: 'Venció hace 12 días', tel: '3764000006', deuda: 35000 },
  { nombre: 'Sofía Ramírez', plan: '5 días', vence: 'Venció hace 2 días', tel: '3764000007', deuda: 35000 },
  { nombre: 'Nahuel Ortiz', plan: '3 días', vence: 'Venció hace 9 días', tel: '3764000008', deuda: 35000 },
];

const riesgoAbandono = [
  { nombre: 'Florencia Vera', ultimaVez: 'Hace 11 días', tel: '3764000009' },
  { nombre: 'Julián Maidana', ultimaVez: 'Hace 14 días', tel: '3764000010' },
];

// asistencias por franja horaria (hoy)
const horasPico = [
  { hora: '7h', valor: 12 },
  { hora: '9h', valor: 8 },
  { hora: '11h', valor: 5 },
  { hora: '14h', valor: 4 },
  { hora: '16h', valor: 10 },
  { hora: '18h', valor: 22 },
  { hora: '20h', valor: 18 },
  { hora: '22h', valor: 6 },
];

const ultimosPagos = [
  { nombre: 'Agustina Núñez', fecha: '10/06', monto: 35000, plan: '5 días' },
  { nombre: 'Pablo Galarza', fecha: '10/06', monto: 35000, plan: '3 días' },
  { nombre: 'Brenda Ríos', fecha: '09/06', monto: 35000, plan: '5 días' },
  { nombre: 'Matías Cabrera', fecha: '09/06', monto: 35000, plan: '3 días' },
];

// ============================================================

function pesos(n) {
  return '$' + n.toLocaleString('es-AR');
}

function iniciales(nombre) {
  return nombre
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function linkWsp(tel, nombre, mensaje) {
  const texto = encodeURIComponent(mensaje);
  return `https://wa.me/54${tel}?text=${texto}`;
}

export default function Admin() {
  const maxHora = Math.max(...horasPico.map((h) => h.valor));
  const deudaTotal = vencidas.reduce((acc, v) => acc + v.deuda, 0);

  return (
    <div className="shell">
      <div className="topbar">
        <Link href="/" className="logo">
          TEAM<span>FIT</span>
        </Link>
        <span className="rol-chip">Panel del dueño</span>
      </div>

      <div>
        <div className="eyebrow">Resumen de hoy</div>
        <h1 className="titulo">Hola, Team Fit</h1>
        <p className="subtitulo">Jueves 11 de junio · Así está tu gimnasio ahora mismo</p>
      </div>

      {/* ---------- KPIs estilo marcador ---------- */}
      <div className="seccion">
        <div className="kpis">
          <div className="kpi">
            <div className="kpi-label">Alumnos activos</div>
            <div className="kpi-valor">{kpis.alumnosActivos}</div>
            <div className="kpi-extra">+4 este mes</div>
          </div>
          <div className="kpi kpi-verde">
            <div className="kpi-label">Ingresos de junio</div>
            <div className="kpi-valor">{pesos(kpis.ingresosMes)}</div>
            <div className="kpi-extra">82 cuotas cobradas</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Asistencias hoy</div>
            <div className="kpi-valor">{kpis.asistenciasHoy}</div>
            <div className="kpi-extra">Pico a las 18hs</div>
          </div>
          <div className="kpi kpi-rojo">
            <div className="kpi-label">Sin cobrar</div>
            <div className="kpi-valor">{pesos(deudaTotal)}</div>
            <div className="kpi-extra">{kpis.cuotasVencidas} cuotas vencidas</div>
          </div>
        </div>
      </div>

      {/* ---------- Cuotas vencidas ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">🔴 Cuotas vencidas</div>
        <div className="lista">
          {vencidas.map((a) => (
            <div className="fila" key={a.nombre}>
              <div className="avatar">{iniciales(a.nombre)}</div>
              <div className="fila-info">
                <div className="fila-nombre">{a.nombre}</div>
                <div className="fila-detalle">
                  Plan {a.plan} · {a.vence} · Debe {pesos(a.deuda)}
                </div>
              </div>
              <span className="estado estado-vencida">Vencida</span>
              <a
                className="btn-wsp"
                target="_blank"
                rel="noreferrer"
                href={linkWsp(
                  a.tel,
                  a.nombre,
                  `Hola ${a.nombre.split(' ')[0]}! Te escribimos de Team Fit 💪 Tu cuota está vencida, te esperamos para regularizarla y que sigas entrenando con nosotros.`
                )}
              >
                Recordar por WhatsApp
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Por vencer ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">🟡 Próximas a vencer</div>
        <div className="lista">
          {porVencer.map((a) => (
            <div className="fila" key={a.nombre}>
              <div className="avatar">{iniciales(a.nombre)}</div>
              <div className="fila-info">
                <div className="fila-nombre">{a.nombre}</div>
                <div className="fila-detalle">
                  Plan {a.plan} · {a.vence}
                </div>
              </div>
              <span className="estado estado-pronto">Por vencer</span>
              <a
                className="btn-wsp"
                target="_blank"
                rel="noreferrer"
                href={linkWsp(
                  a.tel,
                  a.nombre,
                  `Hola ${a.nombre.split(' ')[0]}! Te recordamos de Team Fit que tu cuota vence pronto 💪 ¡Te esperamos!`
                )}
              >
                Recordar por WhatsApp
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Riesgo de abandono ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">⚠️ Riesgo de abandono</div>
        <p className="subtitulo" style={{ marginBottom: 12 }}>
          Alumnos con cuota al día que dejaron de venir. Un mensaje a tiempo puede retener la cuota.
        </p>
        <div className="lista">
          {riesgoAbandono.map((a) => (
            <div className="fila" key={a.nombre}>
              <div className="avatar">{iniciales(a.nombre)}</div>
              <div className="fila-info">
                <div className="fila-nombre">{a.nombre}</div>
                <div className="fila-detalle">Última asistencia: {a.ultimaVez}</div>
              </div>
              <a
                className="btn-wsp"
                target="_blank"
                rel="noreferrer"
                href={linkWsp(
                  a.tel,
                  a.nombre,
                  `Hola ${a.nombre.split(' ')[0]}! Te extrañamos en Team Fit 💪 ¿Todo bien? Te esperamos para retomar el entrenamiento.`
                )}
              >
                Escribirle
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Horas pico ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">Horas pico de hoy</div>
        <div className="barras">
          {horasPico.map((h) => (
            <div
              key={h.hora}
              className={'barra' + (h.valor === maxHora ? ' activa' : '')}
              style={{ height: `${(h.valor / maxHora) * 100}%` }}
            >
              <span className="barra-label">{h.hora}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Últimos pagos ---------- */}
      <div className="seccion">
        <div className="seccion-titulo">Últimos pagos registrados</div>
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
              {ultimosPagos.map((p) => (
                <tr key={p.nombre}>
                  <td>{p.nombre}</td>
                  <td>{p.fecha}</td>
                  <td>{p.plan}</td>
                  <td style={{ fontWeight: 700 }}>{pesos(p.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
