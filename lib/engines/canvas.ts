export function setupCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): { ctx: CanvasRenderingContext2D; dpr: number; fontFamily: string } {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D no disponible");
  const ctx = context;

  // Buffer a resolución física, dibujo en coordenadas lógicas de width×height.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const fontFamily =
    getComputedStyle(canvas).getPropertyValue("--mono").trim() || "monospace";

  return { ctx, dpr, fontFamily };
}
