---
name: measurement-tricks
description: Trucos y limitaciones de Playwright para medir Arcade Vault en móvil (standalone, zoom por desborde, inyectar CSS, scripts largos)
metadata:
  type: reference
---

- `display-mode: standalone` NO se puede emular: CDP `Emulation.setEmulatedMedia({features:[{name:"display-mode",value:"standalone"}]})` no cambia `matchMedia` en Chromium 155 (sigue `browser`). La columna App = 390×844 táctil + auditoría estática.
- Con `isMobile: true`, si algo desborda, el viewport de layout crece hasta el contenido (a 844×390 con la cabecera de 919 px: `innerWidth` 919, `innerHeight` 425) y todas las medidas salen escaladas. Comprueba siempre `innerWidth === ancho del contexto`, no solo `scrollWidth ≤ innerWidth`.
- Para medir el "después" sin tocar código: `ctx.addInitScript` que añade un `<style>` en `DOMContentLoaded`. Para estilos en línea hace falta `!important` en la prueba (en el spec se proponen clases).
- `browser_run_code_unsafe` con `filename` solo acepta rutas dentro del repo: guarda los scripts en `.playwright-mcp/mobile-porter/<fecha>/` (ignorado por git). Devuelve `JSON.stringify(...)`; si pasa del límite, el resultado se guarda en `tool-results/…txt` y se parsea con python (`json.loads` dos veces).
- Crear contextos nuevos desde `page.context().browser().newContext(...)`; el navegador MCP tiene que estar abierto antes (`browser_navigate`).
- En zsh, `echo =====` falla (expansión `=`): entrecomilla los separadores.
- El build se puede reutilizar si `find app components lib next.config.ts -newer .next/BUILD_ID` está vacío.
