import { useId } from 'react';

/**
 * Ilustração de garrafa gerada a partir dos dados do produto (usada quando não há foto).
 * Formato, rótulo e tampa variam de forma estável por produto; a cor do líquido
 * escurece conforme a idade do whisky.
 */

// Hash simples e estável (mesmo produto → mesmo desenho)
function hash(text = '') {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const SHAPES = {
  classic: {
    cap: <rect x="47" y="8" width="26" height="28" rx="3" />,
    neck: 'M51 36h18v40H51z',
    body: 'M51 76c0 22-29 30-29 58v122a12 12 0 0 0 12 12h52a12 12 0 0 0 12-12V134c0-28-29-36-29-58z',
    fill: 118,
    label: { x: 30, y: 152, w: 60, h: 66, rx: 4 },
  },
  square: {
    cap: <rect x="45" y="18" width="30" height="24" rx="6" />,
    neck: 'M50 42h20v26H50z',
    body: 'M50 68c0 14-32 14-32 30v160a10 10 0 0 0 10 10h64a10 10 0 0 0 10-10V98c0-16-32-16-32-30z',
    fill: 96,
    label: { x: 28, y: 134, w: 64, h: 76, rx: 2 },
  },
  decanter: {
    cap: <circle cx="60" cy="22" r="14" />,
    neck: 'M52 36h16v48H52z',
    body: 'M52 84c0 16-38 36-38 96 0 56 22 88 46 88s46-32 46-88c0-60-38-80-38-96z',
    fill: 128,
    label: { x: 34, y: 166, w: 52, h: 50, rx: 25 },
  },
  slim: {
    cap: <rect x="49" y="4" width="22" height="32" rx="3" />,
    neck: 'M53 36h14v70H53z',
    body: 'M53 106c0 12-23 18-23 36v116a10 10 0 0 0 10 10h40a10 10 0 0 0 10-10V142c0-18-23-24-23-36z',
    fill: 134,
    label: { x: 36, y: 166, w: 48, h: 62, rx: 3 },
  },
};
const SHAPE_KEYS = Object.keys(SHAPES);

// Rótulos: fundo, texto, detalhe
const LABELS = [
  ['#efe4cc', '#2a1a0e', '#9a6b2a'], // papel creme
  ['#121212', '#d9b25f', '#d9b25f'], // preto e dourado
  ['#14213d', '#efe4cc', '#c9a45a'], // azul-marinho
  ['#5b1a1a', '#e8cf95', '#e8cf95'], // bordô
];
const CAPS = ['#1a1a1a', '#b8913f', '#6b2a1f', '#7a5230'];

// Cor do líquido pela idade: jovem = palha/dourado, velho = mogno
function liquidColors(age, h) {
  const tones = [
    ['#f0c060', '#d18f2c'], // dourado claro
    ['#e3a23f', '#b86a1c'], // âmbar
    ['#cf7f2a', '#8f4413'], // âmbar profundo
    ['#a8541c', '#5e260b'], // mogno
  ];
  let i;
  if (age == null) i = h % 2;
  else if (age < 12) i = 0;
  else if (age < 15) i = 1;
  else if (age < 18) i = 2;
  else i = 3;
  return tones[i];
}

export default function BottleArt({ product, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const h = hash(product?.id || product?.productId || product?.name || '');
  const shape = SHAPES[SHAPE_KEYS[h % SHAPE_KEYS.length]];
  const [labelBg, labelInk, labelLine] = LABELS[(h >>> 3) % LABELS.length];
  const cap = CAPS[(h >>> 6) % CAPS.length];
  const age = product?.ageYears === '' || product?.ageYears == null ? null : Number(product.ageYears);
  const [liqTop, liqBottom] = liquidColors(Number.isFinite(age) ? age : null, h);
  const L = shape.label;
  const cx = L.x + L.w / 2;

  return (
    <svg
      viewBox="0 0 120 280"
      className={`h-full w-full ${className}`}
      role="img"
      aria-label={product?.name ? `Ilustração da garrafa de ${product.name}` : 'Ilustração de garrafa'}
    >
      <defs>
        <linearGradient id={`liq-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={liqTop} />
          <stop offset="1" stopColor={liqBottom} />
        </linearGradient>
        <linearGradient id={`glass-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.10" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.02" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.25" />
        </linearGradient>
        <clipPath id={`clip-${uid}`}>
          <path d={shape.body} />
          <path d={shape.neck} />
        </clipPath>
      </defs>

      {/* sombra no balcão */}
      <ellipse cx="60" cy="272" rx="40" ry="5" fill="#000" opacity="0.35" />

      {/* vidro + líquido */}
      <g clipPath={`url(#clip-${uid})`}>
        <rect x="0" y="0" width="120" height="280" fill="#2a2018" opacity="0.55" />
        <rect x="0" y={shape.fill} width="120" height={280 - shape.fill} fill={`url(#liq-${uid})`} />
        <rect x="0" y={shape.fill} width="120" height="3" fill="#fff" opacity="0.18" />
        <rect x="0" y="0" width="120" height="280" fill={`url(#glass-${uid})`} />
        {/* reflexo */}
        <rect x="34" y={shape.fill - 30} width="6" height="130" rx="3" fill="#fff" opacity="0.22" />
      </g>
      <path d={shape.body} fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="1.2" />
      <path d={shape.neck} fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="1.2" />

      {/* tampa */}
      <g fill={cap}>{shape.cap}</g>

      {/* rótulo */}
      <rect x={L.x} y={L.y} width={L.w} height={L.h} rx={L.rx} fill={labelBg} />
      <rect
        x={L.x + 3}
        y={L.y + 3}
        width={L.w - 6}
        height={L.h - 6}
        rx={Math.max(L.rx - 3, 1)}
        fill="none"
        stroke={labelLine}
        strokeWidth="0.8"
      />
      {age ? (
        <>
          <text
            x={cx}
            y={L.y + L.h * 0.58}
            textAnchor="middle"
            fill={labelInk}
            fontFamily="'Cormorant Garamond', Georgia, serif"
            fontWeight="700"
            fontSize={L.h * 0.42}
          >
            {age}
          </text>
          <text
            x={cx}
            y={L.y + L.h * 0.8}
            textAnchor="middle"
            fill={labelInk}
            fontFamily="'DM Sans', system-ui, sans-serif"
            fontSize="6.5"
            letterSpacing="2"
          >
            ANOS
          </text>
        </>
      ) : (
        <>
          <path
            d={`M${cx} ${L.y + L.h * 0.28} l6 6 -6 6 -6 -6z`}
            fill={labelLine}
          />
          <text
            x={cx}
            y={L.y + L.h * 0.72}
            textAnchor="middle"
            fill={labelInk}
            fontFamily="'DM Sans', system-ui, sans-serif"
            fontSize={L.w < 56 ? 5.6 : 6.5}
            letterSpacing={L.w < 56 ? 0.8 : 1.6}
          >
            RESERVA
          </text>
        </>
      )}
    </svg>
  );
}
