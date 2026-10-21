---
name: project-audits
description: Historial de auditorías móviles de Arcade Vault (fechas, qué falló, specs escritos y su estado)
metadata:
  type: project
---

## 2026-10-20 — primera auditoría (tras FROGGER, SPEC 15, rama spec-15-juego-frogger)

Specs escritos (los dos en Draft al terminar):

- `specs/17-adaptacion-movil.md` — cabecera (menú lateral hasta 1180, sin CRÉDITOS 1181–1319, sin "Iniciar Sesión" ≤560), cabecera no sticky en player horizontal táctil (`#root:has(.av-player)`), objetivos ≥44, mono ≥12 en táctil, inputs 16 px, TETRIS sin solape ≤400, HUD compacto + CRT padding 12 en vertical ≤600, `100svh` en `.home-hero`.
- `specs/18-movil-app-instalable.md` — manifest.ts, iconos PNG estáticos, viewport (themeColor #0a0a0f, colorScheme dark, viewportFit cover), appleWebApp black-translucent, safe-area env() en nav/panel/main/footer.

Hallazgos clave (antes):

- TETRIS: → y ROTAR se solapan 42 px a 360 y 12 px a 390 (regresión no detectada por SPEC 14).
- Cabecera: contenido de 919 px entre 841 y 918 → la página entera se aleja en móvil horizontal; entre 841 y 1319 los enlaces saltan de línea (85–90 px).
- Horizontal 844×390: la cabecera fija tapa 37 px del CRT.
- FROGGER 360×740: canvas 224×210 (celda 14 px), HUD 197 px, cruceta hasta y=816 (>740). Con SPEC 17: 250×234, cruceta hasta 703.
- Sin manifest, iconos, theme-color, viewport-fit ni safe-area.
- Todas las rutas: 0 errores de consola; :hover solo decorativo.

Preguntas abiertas al usuario (en Decisiones del SPEC 17): proporción de `.crt-screen` por motor; ocultar tira `<kbd>` en táctil.
Prueba en dispositivo real (SPEC 14 paso 8): sigue pendiente; ahora también pasos 10 (SPEC 17) y 7 (SPEC 18).

**How to apply:** en la próxima invocación, mira el estado de 17 y 18 antes de auditar; si están Implemented, la auditoría es de regresión y no se reescriben.
