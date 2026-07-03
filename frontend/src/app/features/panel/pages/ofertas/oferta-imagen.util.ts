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

  // Fondo
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, COLOR.bg1);
  grad.addColorStop(1, COLOR.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Marco
  ctx.strokeStyle = COLOR.red;
  ctx.lineWidth = 10;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  ctx.textAlign = 'center';
  const display = 'Anton, Impact, "Arial Narrow", sans-serif';

  // Logo
  const logo = await cargarLogo();
  if (logo) {
    const size = 300;
    ctx.drawImage(logo, (W - size) / 2, 180, size, size);
  }

  // Nombre del local
  ctx.fillStyle = COLOR.cream;
  ctx.font = `48px ${display}`;
  ctx.fillText('STICKY BURGERS', W / 2, 560);

  // Etiqueta OFERTA
  ctx.fillStyle = COLOR.yellow;
  ctx.font = `130px ${display}`;
  ctx.fillText('🔥 OFERTA', W / 2, 760);

  // Título
  ctx.fillStyle = COLOR.cream;
  ctx.font = `92px ${display}`;
  let y = textoMultilinea(ctx, oferta.titulo.toUpperCase(), 940, W - 200, 104);

  // Descripción
  if (oferta.descripcion) {
    ctx.fillStyle = COLOR.muted;
    ctx.font = '44px Arial, sans-serif';
    y = textoMultilinea(ctx, oferta.descripcion, y + 40, W - 240, 58);
  }

  // Precio
  ctx.fillStyle = COLOR.yellow;
  ctx.font = `180px ${display}`;
  ctx.fillText(money(oferta.precio), W / 2, Math.max(y + 200, 1480));

  // Vigencia
  if (oferta.vigencia) {
    ctx.fillStyle = COLOR.red;
    ctx.font = `52px ${display}`;
    ctx.fillText(oferta.vigencia.toUpperCase(), W / 2, 1650);
  }

  // Pie
  ctx.fillStyle = COLOR.muted;
  ctx.font = '38px Arial, sans-serif';
  ctx.fillText('Pedí por WhatsApp', W / 2, 1800);

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
