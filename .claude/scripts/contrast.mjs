#!/usr/bin/env node
// Contraste WCAG 2.x de una paleta contra su fondo. Lo usa el agente skin-designer.
//
// Uso:
//   node .claude/scripts/contrast.mjs <bg> <nombre>=<color> [<nombre>=<color>…] [--min 3]
//
// Colores: #rgb, #rrggbb, rgb(r,g,b) o rgba(r,g,b,a). Con alfa se componen sobre el bg.
// Sale con código 1 si algún color queda por debajo de --min o si el bg no es oscuro.

const BG_MAX_LUMINANCE = 0.03;

function parseColor(input) {
  const s = input.trim().toLowerCase();
  let m = s.match(/^#([0-9a-f]{3})$/);
  if (m) {
    const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16));
    return { r, g, b, a: 1 };
  }
  m = s.match(/^#([0-9a-f]{6})$/);
  if (m) {
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  m = s.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/,
  );
  if (m) {
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  }
  throw new Error(`Color no válido: "${input}"`);
}

function over(fg, bg) {
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

function luminance({ r, g, b }) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function ratio(l1, l2) {
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function main(argv) {
  let min = 3;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--min") min = Number(argv[++i]);
    else rest.push(argv[i]);
  }
  if (rest.length < 2 || Number.isNaN(min)) {
    console.error(
      "Uso: node .claude/scripts/contrast.mjs <bg> <nombre>=<color> [...] [--min 3]",
    );
    return 2;
  }

  const bgRaw = rest[0];
  const bg = parseColor(bgRaw);
  if (bg.a !== 1) throw new Error("El bg tiene que ser opaco.");
  const bgLum = luminance(bg);
  let failed = false;

  const bgOk = bgLum <= BG_MAX_LUMINANCE;
  if (!bgOk) failed = true;
  console.log(
    `bg ${bgRaw}  luminancia ${bgLum.toFixed(4)}  ${bgOk ? "OK (oscuro)" : `FALLA (> ${BG_MAX_LUMINANCE})`}`,
  );
  console.log(`mínimo ${min}:1\n`);

  const rows = rest.slice(1).map((pair) => {
    const eq = pair.indexOf("=");
    if (eq < 1) throw new Error(`Esperaba <nombre>=<color>, recibí "${pair}"`);
    const name = pair.slice(0, eq);
    const raw = pair.slice(eq + 1);
    const r = ratio(luminance(over(parseColor(raw), bg)), bgLum);
    const ok = r >= min;
    if (!ok) failed = true;
    return { name, raw, r, ok };
  });

  const w1 = Math.max(6, ...rows.map((x) => x.name.length));
  const w2 = Math.max(5, ...rows.map((x) => x.raw.length));
  console.log(`${"nombre".padEnd(w1)}  ${"color".padEnd(w2)}  ratio    estado`);
  for (const { name, raw, r, ok } of rows) {
    console.log(
      `${name.padEnd(w1)}  ${raw.padEnd(w2)}  ${r.toFixed(2).padStart(5)}:1  ${ok ? "OK" : "FALLA"}`,
    );
  }
  return failed ? 1 : 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 2;
}
