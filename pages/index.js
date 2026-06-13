import Link from 'next/link';
import Pictograma from '../components/Pictogramas';

// ============================================================
// LANDING TEAM FIT — presentación del sistema
// ============================================================

export default function Home() {
  return (
    <div className="landing-page">
      {/* ---------- barra de navegación ---------- */}
      <nav className="nav-landing">
        <div className="logo logo-grande">
          TEAM<span>FIT</span>
        </div>
        <div className="nav-botones">
          <Link href="/alumno" className="btn btn-chico">Entrar como alumno</Link>
          <Link href="/admin" className="btn btn-secundario btn-chico">Panel del dueño</Link>
        </div>
      </nav>

      {/* ---------- hero ---------- */}
      <header className="hero">
        <div className="hero-texto">
          <div className="eyebrow">Sistema de gestión y entrenamiento</div>
          <h1 className="hero-titulo">
            FÍSICAMENTE FUERTE.
            <br />
            <span>MENTALMENTE</span>
            <br />
            <span>INDESTRUCTIBLE.</span>
          </h1>
          <p className="hero-sub">
            Tu rutina semanal, tus pesos, tus récords y tu cuota — todo en tu
            celular. Marcá tu presente al llegar y mirá cuánto avanzaste.
          </p>
          <div className="hero-cta">
            <Link href="/alumno" className="btn">Empezar a entrenar →</Link>
            <Link href="/admin" className="btn btn-secundario">Soy el dueño</Link>
          </div>
        </div>

        {/* maqueta de la app */}
        <div className="hero-mock">
          <div className="mock-card">
            <div className="mock-fila-top">
              <span className="mock-logo">TEAM<b>FIT</b></span>
              <span className="mock-chip">PLAN 5 DÍAS</span>
            </div>
            <div className="mock-banner">
              <div>
                <span className="estado estado-ok">Al día</span>
                <p className="mock-detalle">Tu cuota está activa</p>
              </div>
              <div className="mock-dias">
                <div className="mock-num">21</div>
                <div className="mock-detalle">días restantes</div>
              </div>
            </div>
            <div className="mock-racha">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
                <div key={i} className={'dia-racha' + (i < 4 ? ' fue' : '')}>{d}</div>
              ))}
            </div>
            <div className="mock-ejercicio">
              <span className="mock-pic"><Pictograma nombre="Press banca" /></span>
              <div>
                <div className="mock-ej-nombre">Press banca <span className="pr-badge">PR 🔥</span></div>
                <div className="mock-detalle">4 x 10 · 62 kg</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- franja de números ---------- */}
      <section className="franja">
        <div className="franja-item">
          <div className="franja-num">7</div>
          <div className="franja-label">días planificables</div>
        </div>
        <div className="franja-item">
          <div className="franja-num">14+</div>
          <div className="franja-label">ejercicios con ficha</div>
        </div>
        <div className="franja-item">
          <div className="franja-num">100%</div>
          <div className="franja-label">presente verificado</div>
        </div>
        <div className="franja-item">
          <div className="franja-num">24/7</div>
          <div className="franja-label">tu progreso a mano</div>
        </div>
      </section>

      {/* ---------- características para el alumno ---------- */}
      <section className="bloque">
        <div className="eyebrow">Para vos que entrenás</div>
        <h2 className="bloque-titulo">Todo tu entrenamiento en un solo lugar</h2>
        <div className="cards">
          <div className="card">
            <div className="card-pic"><Pictograma nombre="Sentadilla" /></div>
            <h3 className="card-titulo">Rutina semanal a tu medida</h3>
            <p className="card-texto">
              Armá tu semana día por día: elegí los ejercicios, las series y las
              repeticiones. Planificá el martes desde el lunes.
            </p>
          </div>
          <div className="card">
            <div className="card-pic"><Pictograma nombre="Peso muerto" /></div>
            <h3 className="card-titulo">Pesos y récords</h3>
            <p className="card-texto">
              Cargá cuánto levantaste hoy y mirá tu evolución. Cuando superás tu
              marca, el PR 🔥 aparece solo.
            </p>
          </div>
          <div className="card">
            <div className="card-pic"><Pictograma nombre="Jalón al pecho" /></div>
            <h3 className="card-titulo">Fichas de cada ejercicio</h3>
            <p className="card-texto">
              Tocá un ejercicio y mirá qué músculos trabaja, cómo se ejecuta y los
              consejos para hacerlo bien.
            </p>
          </div>
          <div className="card">
            <div className="card-pic"><Pictograma nombre="Press militar" /></div>
            <h3 className="card-titulo">Presente desde el gym</h3>
            <p className="card-texto">
              Marcá tu asistencia al llegar — el sistema verifica que estés en
              Team Fit. Tu constancia, registrada de verdad.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- sección dueño ---------- */}
      <section className="bloque bloque-dueno">
        <div className="dueno-grid">
          <div>
            <div className="eyebrow">Para el dueño</div>
            <h2 className="bloque-titulo">El gimnasio bajo control, de un vistazo</h2>
            <ul className="dueno-lista">
              <li>Cuotas vencidas y por vencer con recordatorio por WhatsApp en un toque.</li>
              <li>Ingresos del mes y pagos registrados, siempre al día.</li>
              <li>Alerta de alumnos que dejaron de venir, a tiempo para recuperarlos.</li>
              <li>Horas pico reales según los presentes del día.</li>
            </ul>
            <Link href="/admin" className="btn" style={{ marginTop: 20 }}>Ver el panel →</Link>
          </div>
          <div className="dueno-mock">
            <div className="kpi kpi-verde">
              <div className="kpi-label">Ingresos del mes</div>
              <div className="kpi-valor">$2.870.000</div>
              <div className="kpi-extra">82 cuotas cobradas</div>
            </div>
            <div className="kpi kpi-rojo">
              <div className="kpi-label">Sin cobrar</div>
              <div className="kpi-valor">$175.000</div>
              <div className="kpi-extra">5 cuotas vencidas</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- CTA final ---------- */}
      <section className="cta-final">
        <h2 className="cta-titulo">
          TU PRÓXIMO <span>PR</span> EMPIEZA HOY
        </h2>
        <Link href="/alumno" className="btn btn-grande">Entrar a mi entrenamiento</Link>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="footer">
        <div className="logo">TEAM<span>FIT</span></div>
        <p className="footer-texto">Garupá · Misiones</p>
        <a
          className="footer-ig"
          href="https://instagram.com/teamfit_gym"
          target="_blank"
          rel="noreferrer"
        >
          📷 @teamfit_gym
        </a>
        <p className="footer-demo">Versión demo · datos de prueba</p>
      </footer>
    </div>
  );
}
