import Link from 'next/link';

export default function Home() {
  return (
    <div className="landing">
      <div className="landing-logo">
        TEAM<span>FIT</span>
      </div>
      <p className="landing-sub">
        Tu rutina, tu progreso y tu cuota en un solo lugar.
        Marcá tu presente, cargá tus pesos y mirá cuánto avanzaste.
      </p>

      <div className="landing-botones">
        <Link href="/alumno" className="btn">
          Entrar como alumno
        </Link>
        <Link href="/admin" className="btn btn-secundario">
          Panel del dueño
        </Link>
      </div>

      <p className="landing-demo">Versión demo · datos de prueba</p>
    </div>
  );
}
