// ============================================================
// TEAM FIT — Pictogramas de ejercicios
// Ilustraciones lineales simples de la ejecución de cada
// ejercicio. Provisorias hasta tener fotos propias del gym
// (campo imagen_url de la tabla ejercicios).
// ============================================================

const ESTILO = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function Svg({ children }) {
  return (
    <svg viewBox="0 0 48 48" {...ESTILO} aria-hidden="true">
      {children}
    </svg>
  );
}

const PICTOGRAMAS = {
  'Press banca': (
    <Svg>
      {/* banco */}
      <line x1="8" y1="35" x2="40" y2="35" />
      <line x1="12" y1="35" x2="12" y2="41" />
      <line x1="34" y1="35" x2="34" y2="41" />
      {/* figura acostada */}
      <circle cx="13" cy="30" r="3" />
      <line x1="16" y1="31" x2="29" y2="31" />
      <line x1="29" y1="31" x2="33" y2="35" />
      {/* brazo y barra con discos */}
      <line x1="23" y1="30" x2="23" y2="19" />
      <line x1="13" y1="19" x2="35" y2="19" />
      <line x1="15" y1="15" x2="15" y2="23" />
      <line x1="33" y1="15" x2="33" y2="23" />
    </Svg>
  ),

  'Press inclinado': (
    <Svg>
      {/* banco inclinado */}
      <line x1="10" y1="40" x2="28" y2="25" />
      <line x1="16" y1="40" x2="16" y2="44" />
      {/* figura */}
      <circle cx="30" cy="21" r="3" />
      <line x1="14" y1="38" x2="27" y2="26" />
      {/* brazo y barra */}
      <line x1="27" y1="25" x2="33" y2="13" />
      <line x1="24" y1="11" x2="44" y2="11" />
      <line x1="26" y1="7" x2="26" y2="15" />
      <line x1="42" y1="7" x2="42" y2="15" />
    </Svg>
  ),

  'Jalón al pecho': (
    <Svg>
      {/* barra alta */}
      <path d="M 10 9 Q 24 13 38 9" />
      {/* figura sentada */}
      <circle cx="24" cy="18" r="3" />
      <line x1="24" y1="21" x2="24" y2="31" />
      <line x1="24" y1="31" x2="17" y2="40" />
      <line x1="24" y1="31" x2="31" y2="40" />
      {/* brazos hacia la barra */}
      <line x1="24" y1="23" x2="13" y2="11" />
      <line x1="24" y1="23" x2="35" y2="11" />
      {/* asiento */}
      <line x1="14" y1="40" x2="34" y2="40" />
    </Svg>
  ),

  'Remo con barra': (
    <Svg>
      {/* figura inclinada */}
      <circle cx="33" cy="15" r="3" />
      <line x1="17" y1="23" x2="30" y2="16" />
      <line x1="17" y1="23" x2="17" y2="39" />
      {/* brazo hacia la barra */}
      <line x1="26" y1="18" x2="27" y2="30" />
      {/* barra con discos */}
      <line x1="17" y1="31" x2="37" y2="31" />
      <line x1="19" y1="27" x2="19" y2="35" />
      <line x1="35" y1="27" x2="35" y2="35" />
    </Svg>
  ),

  'Remo en máquina': (
    <Svg>
      {/* apoyo de pecho */}
      <line x1="31" y1="13" x2="31" y2="29" />
      {/* figura sentada */}
      <circle cx="20" cy="13" r="3" />
      <line x1="20" y1="16" x2="20" y2="29" />
      <line x1="20" y1="29" x2="28" y2="37" />
      {/* brazos tirando de la manija */}
      <line x1="20" y1="19" x2="28" y2="21" />
      <line x1="28" y1="18" x2="28" y2="24" />
      {/* asiento */}
      <line x1="14" y1="37" x2="32" y2="37" />
    </Svg>
  ),

  'Sentadilla': (
    <Svg>
      {/* barra en hombros con discos */}
      <line x1="11" y1="15" x2="35" y2="15" />
      <line x1="13" y1="11" x2="13" y2="19" />
      <line x1="33" y1="11" x2="33" y2="19" />
      {/* figura en sentadilla */}
      <circle cx="23" cy="10" r="3" />
      <line x1="23" y1="15" x2="23" y2="26" />
      <line x1="23" y1="26" x2="16" y2="31" />
      <line x1="16" y1="31" x2="17" y2="40" />
      <line x1="23" y1="26" x2="29" y2="32" />
      <line x1="29" y1="32" x2="29" y2="40" />
    </Svg>
  ),

  'Prensa': (
    <Svg>
      {/* respaldo reclinado */}
      <line x1="8" y1="38" x2="18" y2="26" />
      {/* figura */}
      <circle cx="16" cy="22" r="3" />
      <line x1="13" y1="35" x2="20" y2="27" />
      {/* piernas empujando la plataforma */}
      <line x1="20" y1="29" x2="30" y2="22" />
      <line x1="30" y1="22" x2="36" y2="16" />
      {/* plataforma */}
      <line x1="32" y1="8" x2="42" y2="22" />
      {/* base */}
      <line x1="8" y1="42" x2="30" y2="42" />
    </Svg>
  ),

  'Peso muerto': (
    <Svg>
      {/* figura flexionada */}
      <circle cx="31" cy="13" r="3" />
      <line x1="19" y1="22" x2="28" y2="15" />
      <line x1="19" y1="22" x2="20" y2="36" />
      {/* brazos a la barra */}
      <line x1="25" y1="17" x2="27" y2="34" />
      {/* barra en el piso con discos */}
      <line x1="14" y1="34" x2="38" y2="34" />
      <circle cx="17" cy="34" r="4" />
      <circle cx="35" cy="34" r="4" />
    </Svg>
  ),

  'Press militar': (
    <Svg>
      {/* barra arriba con discos */}
      <line x1="10" y1="9" x2="38" y2="9" />
      <line x1="12" y1="5" x2="12" y2="13" />
      <line x1="36" y1="5" x2="36" y2="13" />
      {/* figura de pie */}
      <circle cx="24" cy="17" r="3" />
      <line x1="24" y1="20" x2="24" y2="31" />
      <line x1="24" y1="31" x2="18" y2="41" />
      <line x1="24" y1="31" x2="30" y2="41" />
      {/* brazos extendidos */}
      <line x1="24" y1="21" x2="16" y2="10" />
      <line x1="24" y1="21" x2="32" y2="10" />
    </Svg>
  ),

  'Vuelos laterales': (
    <Svg>
      {/* figura de pie */}
      <circle cx="24" cy="11" r="3" />
      <line x1="24" y1="14" x2="24" y2="28" />
      <line x1="24" y1="28" x2="18" y2="40" />
      <line x1="24" y1="28" x2="30" y2="40" />
      {/* brazos elevados a los costados */}
      <line x1="24" y1="18" x2="10" y2="15" />
      <line x1="24" y1="18" x2="38" y2="15" />
      {/* mancuernas */}
      <line x1="9" y1="11" x2="9" y2="19" />
      <line x1="39" y1="11" x2="39" y2="19" />
    </Svg>
  ),

  'Curl con barra': (
    <Svg>
      {/* figura de pie */}
      <circle cx="24" cy="10" r="3" />
      <line x1="24" y1="13" x2="24" y2="28" />
      <line x1="24" y1="28" x2="18" y2="40" />
      <line x1="24" y1="28" x2="30" y2="40" />
      {/* brazos: codos fijos, antebrazos subiendo */}
      <line x1="24" y1="16" x2="18" y2="24" />
      <line x1="18" y1="24" x2="16" y2="18" />
      <line x1="24" y1="16" x2="30" y2="24" />
      <line x1="30" y1="24" x2="32" y2="18" />
      {/* barra */}
      <line x1="12" y1="17" x2="36" y2="17" />
    </Svg>
  ),

  'Curl martillo': (
    <Svg>
      {/* figura de pie */}
      <circle cx="24" cy="10" r="3" />
      <line x1="24" y1="13" x2="24" y2="28" />
      <line x1="24" y1="28" x2="18" y2="40" />
      <line x1="24" y1="28" x2="30" y2="40" />
      {/* brazos con mancuernas en agarre martillo */}
      <line x1="24" y1="16" x2="17" y2="23" />
      <line x1="17" y1="23" x2="14" y2="17" />
      <line x1="24" y1="16" x2="31" y2="23" />
      <line x1="31" y1="23" x2="34" y2="17" />
      {/* mancuernas verticales */}
      <line x1="11" y1="16" x2="17" y2="14" />
      <line x1="31" y1="14" x2="37" y2="16" />
    </Svg>
  ),

  'Tríceps en polea': (
    <Svg>
      {/* torre y polea */}
      <line x1="34" y1="6" x2="34" y2="42" />
      <circle cx="30" cy="8" r="2.4" />
      {/* cable */}
      <line x1="29" y1="10" x2="27" y2="20" />
      {/* manija */}
      <line x1="22" y1="21" x2="32" y2="21" />
      {/* figura: codos fijos, extensión hacia abajo */}
      <circle cx="20" cy="11" r="3" />
      <line x1="20" y1="14" x2="20" y2="29" />
      <line x1="20" y1="29" x2="15" y2="41" />
      <line x1="20" y1="29" x2="25" y2="41" />
      <line x1="20" y1="17" x2="26" y2="21" />
      <line x1="26" y1="21" x2="27" y2="28" />
    </Svg>
  ),

  'Fondos': (
    <Svg>
      {/* barras paralelas */}
      <line x1="8" y1="20" x2="17" y2="20" />
      <line x1="31" y1="20" x2="40" y2="20" />
      <line x1="12" y1="20" x2="12" y2="42" />
      <line x1="36" y1="20" x2="36" y2="42" />
      {/* figura suspendida */}
      <circle cx="24" cy="10" r="3" />
      <line x1="24" y1="13" x2="24" y2="27" />
      <line x1="24" y1="27" x2="20" y2="35" />
      <line x1="20" y1="35" x2="24" y2="39" />
      {/* brazos a las barras */}
      <line x1="24" y1="16" x2="15" y2="20" />
      <line x1="24" y1="16" x2="33" y2="20" />
    </Svg>
  ),
};

// Pictograma genérico (mancuerna) para ejercicios sin dibujo propio
const GENERICO = (
  <Svg>
    <line x1="14" y1="24" x2="34" y2="24" />
    <line x1="12" y1="17" x2="12" y2="31" />
    <line x1="17" y1="14" x2="17" y2="34" />
    <line x1="31" y1="14" x2="31" y2="34" />
    <line x1="36" y1="17" x2="36" y2="31" />
  </Svg>
);

export default function Pictograma({ nombre }) {
  return PICTOGRAMAS[nombre] || GENERICO;
}
