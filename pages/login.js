import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase, usuarioActual } from '../lib/supabase';

// ============================================================
// LOGIN / REGISTRO — Team Fit
// ============================================================

export default function Login() {
  const router = useRouter();
  const [modo, setModo] = useState('login'); // login | registro | recuperar | nueva_clave
  const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', telefono: '', email: '', clave: '' });
  const [msg, setMsg] = useState(null);
  const [esError, setEsError] = useState(false);
  const [cargando, setCargando] = useState(false);

  // si llega desde el email de recuperación, Supabase dispara este evento
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === 'PASSWORD_RECOVERY') {
        setModo('nueva_clave');
        setMsg('Ingresá tu nueva contraseña.');
        setEsError(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  function campo(k) {
    return {
      value: form[k],
      onChange: (e) => setForm({ ...form, [k]: e.target.value }),
    };
  }

  async function entrarSegunRol() {
    const { alumno } = await usuarioActual();
    if (alumno?.rol === 'dueno') router.push('/admin');
    else router.push('/alumno');
  }

  async function manejarLogin(e) {
    e.preventDefault();
    setCargando(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.clave,
    });
    if (error) {
      setEsError(true);
      setMsg(
        error.message.includes('Invalid login')
          ? 'Email o contraseña incorrectos.'
          : error.message.includes('not confirmed')
          ? 'Tu email todavía no está confirmado. Revisá tu casilla (y el spam).'
          : 'No se pudo iniciar sesión: ' + error.message
      );
      setCargando(false);
    } else {
      await entrarSegunRol();
    }
  }

  async function manejarRegistro(e) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.apellido.trim() || !form.dni.trim()) {
      setEsError(true);
      setMsg('Completá nombre, apellido y DNI.');
      return;
    }
    if (form.clave.length < 8) {
      setEsError(true);
      setMsg('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setCargando(true);
    setMsg(null);
    const { error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.clave,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin + '/login' : undefined,
        data: {
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          dni: form.dni.trim(),
          telefono: form.telefono.trim(),
        },
      },
    });
    setCargando(false);
    if (error) {
      setEsError(true);
      setMsg('No se pudo crear la cuenta: ' + error.message);
    } else {
      setEsError(false);
      setMsg('¡Cuenta creada! 📩 Te enviamos un correo para confirmarla. Después, el gimnasio va a aprobar tu acceso.');
      setModo('login');
    }
  }

  async function manejarRecuperar(e) {
    e.preventDefault();
    if (!form.email.trim()) {
      setEsError(true);
      setMsg('Escribí tu email.');
      return;
    }
    setCargando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
      redirectTo: window.location.origin + '/login',
    });
    setCargando(false);
    setEsError(!!error);
    setMsg(
      error
        ? 'No se pudo enviar el correo: ' + error.message
        : 'Si el email existe, te enviamos un enlace para crear una contraseña nueva. Revisá tu casilla.'
    );
  }

  async function manejarNuevaClave(e) {
    e.preventDefault();
    if (form.clave.length < 8) {
      setEsError(true);
      setMsg('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setCargando(true);
    const { error } = await supabase.auth.updateUser({ password: form.clave });
    setCargando(false);
    if (error) {
      setEsError(true);
      setMsg('No se pudo actualizar: ' + error.message);
    } else {
      setEsError(false);
      setMsg('¡Contraseña actualizada! Entrando...');
      await entrarSegunRol();
    }
  }

  return (
    <div className="login-fondo">
      <div className="login-card">
        <Link href="/" className="logo logo-grande" style={{ display: 'block', textAlign: 'center' }}>
          TEAM<span>FIT</span>
        </Link>

        {modo !== 'nueva_clave' && (
          <div className="login-tabs">
            <button
              className={'login-tab' + (modo === 'login' ? ' activo' : '')}
              onClick={() => { setModo('login'); setMsg(null); }}
            >
              Ingresar
            </button>
            <button
              className={'login-tab' + (modo === 'registro' ? ' activo' : '')}
              onClick={() => { setModo('registro'); setMsg(null); }}
            >
              Crear cuenta
            </button>
          </div>
        )}

        {msg && <p className={'login-msg' + (esError ? ' error' : '')}>{msg}</p>}

        {/* ---------- INGRESAR ---------- */}
        {modo === 'login' && (
          <form onSubmit={manejarLogin} className="login-form">
            <input className="input-login" type="email" placeholder="Email" autoComplete="email" required {...campo('email')} />
            <input className="input-login" type="password" placeholder="Contraseña" autoComplete="current-password" required {...campo('clave')} />
            <button className="btn" type="submit" disabled={cargando}>
              {cargando ? 'Ingresando...' : 'Ingresar →'}
            </button>
            <button type="button" className="login-link" onClick={() => { setModo('recuperar'); setMsg(null); }}>
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {/* ---------- CREAR CUENTA ---------- */}
        {modo === 'registro' && (
          <form onSubmit={manejarRegistro} className="login-form">
            <div className="login-fila2">
              <input className="input-login" type="text" placeholder="Nombre" required {...campo('nombre')} />
              <input className="input-login" type="text" placeholder="Apellido" required {...campo('apellido')} />
            </div>
            <div className="login-fila2">
              <input className="input-login" type="text" inputMode="numeric" placeholder="DNI" required {...campo('dni')} />
              <input className="input-login" type="tel" placeholder="Teléfono" {...campo('telefono')} />
            </div>
            <input className="input-login" type="email" placeholder="Email" autoComplete="email" required {...campo('email')} />
            <input className="input-login" type="password" placeholder="Contraseña (mínimo 8 caracteres)" autoComplete="new-password" required {...campo('clave')} />
            <button className="btn" type="submit" disabled={cargando}>
              {cargando ? 'Creando...' : 'Crear mi cuenta'}
            </button>
            <p className="nota-privacidad">
              Después de confirmar tu email, el gimnasio aprueba tu cuenta y ya podés entrenar con la app.
            </p>
          </form>
        )}

        {/* ---------- RECUPERAR ---------- */}
        {modo === 'recuperar' && (
          <form onSubmit={manejarRecuperar} className="login-form">
            <p className="subtitulo">Te enviamos un enlace a tu email para crear una contraseña nueva.</p>
            <input className="input-login" type="email" placeholder="Tu email" required {...campo('email')} />
            <button className="btn" type="submit" disabled={cargando}>
              {cargando ? 'Enviando...' : 'Enviar enlace'}
            </button>
            <button type="button" className="login-link" onClick={() => { setModo('login'); setMsg(null); }}>
              ← Volver a ingresar
            </button>
          </form>
        )}

        {/* ---------- NUEVA CONTRASEÑA ---------- */}
        {modo === 'nueva_clave' && (
          <form onSubmit={manejarNuevaClave} className="login-form">
            <input className="input-login" type="password" placeholder="Nueva contraseña (mínimo 8)" autoComplete="new-password" required {...campo('clave')} />
            <button className="btn" type="submit" disabled={cargando}>
              {cargando ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
