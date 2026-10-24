// Browser-only helpers shared by the tools: open an image, draw it at a new size, encode it.
import type { placeImage } from './fit.js';

export type Source = { img: CanvasImageSource; w: number; h: number; close: () => void };
export type Placement = ReturnType<typeof placeImage>;

// Open a file as a drawable image, honouring EXIF rotation.
export async function decode(f: File): Promise<Source> {
  try {
    const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    return { img: bmp, w: bmp.width, h: bmp.height, close: () => bmp.close() };
  } catch {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch (e) {
      URL.revokeObjectURL(url);
      throw e;
    }
    return { img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  }
}

// Draw the source rect into the destination rect of a w x h canvas.
// Big reductions go in halving steps; one big jump looks jagged.
// `background` fills the canvas first (JPEG has no transparency); null keeps it transparent.
export function drawPlaced(src: CanvasImageSource, p: Placement, w: number, h: number, background: string | null = '#fff') {
  let cur: CanvasImageSource = src, cx = p.sx, cy = p.sy, cw = p.sw, ch = p.sh;
  while (cw / 2 > p.dw && ch / 2 > p.dh) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(cw / 2)); c.height = Math.max(1, Math.round(ch / 2));
    const x = c.getContext('2d')!;
    x.imageSmoothingQuality = 'high';
    x.drawImage(cur, cx, cy, cw, ch, 0, 0, c.width, c.height);
    cur = c; cx = 0; cy = 0; cw = c.width; ch = c.height;
  }
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d')!;
  if (background) { ctx.fillStyle = background; ctx.fillRect(0, 0, w, h); }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(cur, cx, cy, cw, ch, p.dx, p.dy, p.dw, p.dh);
  return out;
}

// Same placement at a fraction `s` of the full output size.
export function scalePlacement(p: Placement, s: number): Placement {
  const r = (v: number) => Math.round(v * s);
  return { ...p, dx: r(p.dx), dy: r(p.dy), dw: Math.max(1, r(p.dw)), dh: Math.max(1, r(p.dh)) };
}

export function toBlob(canvas: HTMLCanvasElement, type: string, q?: number): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), type, q));
}
