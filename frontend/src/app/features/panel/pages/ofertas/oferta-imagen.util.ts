import { Oferta } from '../../../../core/models/oferta.model';

/** Paleta de marca (coincide con las variables --sticky-* del tema). */
const COLOR = {
  bg1: '#1a0d0b',
  bg2: '#0b0a09',
  red: '#e11b22',
  yellow: '#f5c518',
  cream: '#f5efe6',
  muted: '#b8ada0',
};

const W = 1080;
const H = 1920; // relación 9:16 para estados de WhatsApp

function money(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR');
}

/** Relleno dorado metálico vertical, centrado en `cy` con alto `h` (imita la guía). */
function oroMetalico(ctx: CanvasRenderingContext2D, cy: number, h: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
  g.addColorStop(0, '#f9e79a');
  g.addColorStop(0.45, '#e6b53a');
  g.addColorStop(0.55, '#c8901d');
  g.addColorStop(1, '#f6d879');
  return g;
}

function cargarLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = 'logo.png';
  });
}

/** Dibuja texto centrado con salto de línea automático. Devuelve la Y final. */
function textoMultilinea(
  ctx: CanvasRenderingContext2D,
  texto: string,
  y: number,
  maxAncho: number,
  lineHeight: number,
): number {
  const palabras = texto.split(/\s+/);
  let linea = '';
  let cursorY = y;
  for (const palabra of palabras) {
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > maxAncho && linea) {
      ctx.fillText(linea, W / 2, cursorY);
      linea = palabra;
      cursorY += lineHeight;
    } else {
      linea = prueba;
    }
  }
  if (linea) {
    ctx.fillText(linea, W / 2, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}

/** Genera una imagen 9:16 (1080×1920) de la oferta para difundir por estados de WhatsApp. */
export async function generarImagenOferta(oferta: Oferta): Promise<Blob> {
  // Asegura que las fuentes del documento (Anton) estén listas antes de medir/pintar.
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* seguimos con la fuente de respaldo */
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo crear el lienzo de la imagen');
  }

  // Fondo base
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, COLOR.bg1);
  grad.addColorStop(1, COLOR.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Brillo cálido (glow) desplazado hacia el centro-derecha, como en la guía
  const glow = ctx.createRadialGradient(W * 0.72, H * 0.42, 40, W * 0.72, H * 0.42, W * 0.95);
  glow.addColorStop(0, 'rgba(190, 78, 30, 0.5)');
  glow.addColorStop(1, 'rgba(190, 78, 30, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Viñeta: oscurece los bordes para dar profundidad
  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.28, W / 2, H / 2, H * 0.62);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // Marco rojo tipo neón (doble trazo con glow)
  ctx.save();
  ctx.shadowColor = COLOR.red;
  ctx.shadowBlur = 45;
  ctx.strokeStyle = COLOR.red;
  ctx.lineWidth = 7;
  ctx.strokeRect(38, 38, W - 76, H - 76);
  ctx.strokeRect(38, 38, W - 76, H - 76);
  ctx.restore();

  ctx.textAlign = 'center';
  const display = 'Anton, Impact, "Arial Narrow", sans-serif';
  const serif = 'Georgia, "Times New Roman", serif';

  // Logo
  const logo = await cargarLogo();
  if (logo) {
    const size = 300;
    ctx.drawImage(logo, (W - size) / 2, 150, size, size);
  }

  // Etiqueta OFERTA — dorado metálico serif con sombra
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  ctx.font = `bold 165px ${serif}`;
  ctx.fillStyle = oroMetalico(ctx, 760, 165);
  ctx.fillText('OFERTA', W / 2, 800);
  ctx.restore();

  // Título de la oferta
  ctx.fillStyle = COLOR.cream;
  ctx.font = `92px ${display}`;
  let y = textoMultilinea(ctx, oferta.titulo.toUpperCase(), 940, W - 200, 104);

  // Descripción
  if (oferta.descripcion) {
    ctx.fillStyle = COLOR.muted;
    ctx.font = '44px Arial, sans-serif';
    y = textoMultilinea(ctx, oferta.descripcion, y + 40, W - 240, 58);
  }

  // Precio — dorado metálico con sombra
  const precioY = Math.max(y + 220, 1470);
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 6;
  ctx.font = `180px ${display}`;
  ctx.fillStyle = oroMetalico(ctx, precioY - 55, 180);
  ctx.fillText(money(oferta.precio), W / 2, precioY);
  ctx.restore();

  // Vigencia
  if (oferta.vigencia) {
    ctx.fillStyle = COLOR.red;
    ctx.font = `54px ${display}`;
    ctx.letterSpacing = '4px';
    ctx.fillText(oferta.vigencia.toUpperCase(), W / 2, 1660);
    ctx.letterSpacing = '0px';
  }

  // Pie
  ctx.fillStyle = COLOR.muted;
  ctx.font = '38px Arial, sans-serif';
  ctx.fillText('Pedí por WhatsApp', W / 2, 1810);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen'))),
      'image/png',
    );
  });
}

/** Genera y descarga la imagen de la oferta como PNG. */
export async function descargarImagenOferta(oferta: Oferta): Promise<void> {
  const blob = await generarImagenOferta(oferta);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `oferta-${oferta.titulo.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
