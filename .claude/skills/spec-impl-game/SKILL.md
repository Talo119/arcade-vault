---
name: spec-impl-game
description: Implementa un spec de juego aprobado (specs/NN-juego-<id>.md, o uno de specs/game-jam/<id>/ que antes promociona a specs/NN-juego-<id>.md) exactamente como /spec-impl y, al terminar, lanza en secuencia los agentes skin-designer y mobile-porter para auditar las skins y el móvil del juego nuevo.
disable-model-invocation: true
argument-hint: <NN-juego-id | specs/game-jam/<id>/<archivo>.md>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Agent, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(git ls-files:*), Bash(git mv:*), Bash(mv:*), Bash(cat:*), Bash(ls:*), Bash(npm run lint:*), Bash(npm run build:*)
---

# /spec-impl-game — `/spec-impl` para juegos + auditorías de skins y móvil

## Contexto de sesión

Estado del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles:
!`ls specs/ 2>/dev/null || echo "No existe la carpeta specs/"`

Specs del game jam:
!`ls specs/game-jam/*/*.md 2>/dev/null || echo "No hay specs en specs/game-jam/"`

Configuración de creación de ramas:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (por defecto, sin archivo de configuración)"`

Registro de motores:
!`cat lib/engines/registry.ts 2>/dev/null || echo "NO EXISTE lib/engines/registry.ts"`

---

Esta skill es `/spec-impl` aplicado a un spec de juego, más dos auditorías al final.
**No reescribe `/spec-impl`: lo sigue.** Así, si `spec-impl` se reinstala (`npx skills@latest add Klerith/fernando-skills`), esta skill hereda los cambios.

Responde en el idioma del usuario.

Sigue las fases en orden estricto. **No avances si la anterior no terminó bien.**

---

## Fase 0 — Comprobar que es un spec de juego

El argumento recibido es: `$ARGUMENTS`

1. Si `$ARGUMENTS` está vacío, lista los specs `NN-juego-*.md` y los del game jam del contexto de arriba, pide el nombre exacto y **para**.
2. Localiza el archivo (quita la `@` inicial si la trae):
   - Si es una ruta dentro de `specs/game-jam/`, usa ese archivo.
   - Si no, búscalo en `specs/` como lo hace `/spec-impl`: por nombre completo (`10-juego-snake`), solo el número (`10`) o solo el slug (`juego-snake`).
3. Si el archivo encontrado **no** sigue ninguno de los dos patrones, para y muestra:

   ```
   ❌ Este comando solo implementa specs de juego
      (specs/NN-juego-<id>.md o specs/game-jam/<id>/<archivo>.md).

   Spec encontrado: specs/[ARCHIVO]
   Para cualquier otro spec usa /spec-impl [ARCHIVO].
   ```

4. Extrae el `<id>` del juego y guárdalo para las fases siguientes:
   - `specs/NN-juego-<id>.md` → lo que va después de `juego-`. Salta a las Fases 1–4.
   - `specs/game-jam/<id>/…` → el nombre de la carpeta. Sigue con la Fase 0.5.

---

## Fase 0.5 — Promocionar un spec del game jam

Solo si el spec está en `specs/game-jam/<id>/`.
`/spec-impl` necesita un spec numerado en `specs/` para nombrar la rama, así que primero se mueve.
No toques nada hasta que el usuario confirme el paso 5.

1. **Estado.** Lee la línea de estado con la misma regla que la Fase 2 de `/spec-impl` (cualquier idioma).
   Si no significa "Approved" (incluido `Draft (esbozo)`), para con su mensaje estándar de error, sin mover nada.
2. **Ya promocionado.** Si existe algún `specs/NN-juego-<id>.md`, para y muestra:

   ```
   ❌ El juego <id> ya tiene spec: specs/NN-juego-<id>.md.
   Implementa ese con /spec-impl-game NN-juego-<id>, o borra/renombra uno de los dos.
   ```

3. **Juego libre.** Si `<id>` ya está en el registro de motores del contexto de arriba o existe `lib/<id>/`, para y avisa: el game jam siempre crea una fila nueva del catálogo.
4. **Número.** `NN` = el mayor número de `specs/NN-*.md` + 1, con dos dígitos.
5. **Confirmación.** Muestra el plan y espera respuesta:

   ```
   📦 Spec del game jam → spec numerado

   Origen:   specs/game-jam/<id>/<archivo>.md
   Destino:  specs/NN-juego-<id>.md
   Estado:   [valor encontrado]

   Cambios en la cabecera:
     - Título: "# SPEC GJ — …" o "# SPEC — …" → "# SPEC NN — …" (como specs/10-juego-snake.md)
     - Se quita la línea "> **Game jam:** …"

   Las otras variantes se quedan en specs/game-jam/<id>/.
   ¿Lo promociono y empiezo la implementación? [y/N]
   ```

   Muestra solo los cambios de cabecera que de verdad apliquen a ese archivo.
   Si la respuesta no es un sí, **para** sin mover nada.

6. **Mover.** Si el archivo está versionado (`git ls-files --error-unmatch <ruta>` no falla), usa `git mv`; si no, `mv`.
   Después aplica los cambios de cabecera del paso 5 con `Edit`.
   No cambies nada más del spec: ni el estado, ni las dependencias, ni el contenido.
7. Desde aquí, el spec es `specs/NN-juego-<id>.md` y el argumento de las Fases 1–4 es `NN-juego-<id>`.

Al llegar al aviso de cambios sin commitear de `/spec-impl` (Fase 3, paso 0), la promoción recién hecha **no** cuenta como cambio pendiente: viaja a la rama nueva con el resto del trabajo.
Avisa solo de los cambios que ya estaban en el `git status` del contexto de arriba, sin contar la carpeta `specs/game-jam/<id>/` (o su archivo).

---

## Fases 1–4 — Implementación (igual que `/spec-impl`)

Lee `.claude/skills/spec-impl/SKILL.md` entero y sigue sus **Fases 1, 2, 3 y 4 tal cual**, con `specs/NN-juego-<id>.md` como argumento (el de `$ARGUMENTS` o el promocionado en la Fase 0.5) y usando el contexto de sesión de arriba en lugar del suyo (sus comandos `!` no se ejecutan desde aquí).

Eso incluye, sin excepción: validar que el estado signifique "Approved", el aviso de cambios sin commitear, la rama `spec-NN-juego-<id>`, el resumen del spec, esperar confirmación antes del Paso 1, una pausa por paso, no improvisar ante ambigüedades y **no hacer commit nunca** salvo que el usuario lo pida.

Única diferencia: cuando termines el último paso del plan y el usuario lo haya revisado, **no cierres con el mensaje final de `/spec-impl`**. Continúa con la Fase 5.

---

## Fase 5 — Auditorías en secuencia

### 5.1 — Lint y build

Ejecuta `npm run lint` y luego `npm run build`.
`mobile-porter` audita contra `next start`, así que el build tiene que pasar.
Si alguno falla, muestra el error, arréglalo dentro del alcance del spec (o pregunta si no está claro) y vuelve a ejecutarlos. No lances ningún agente hasta que los dos pasen.

### 5.2 — `skin-designer`

Avisa al usuario de que empiezan las auditorías y lanza **solo** `skin-designer` con la herramienta `Agent` (`subagent_type: "skin-designer"`). En el prompt indica:

- El juego recién implementado: id `<id>`, spec `specs/NN-juego-<id>.md`, rama actual.
- Que audite sus skins (`clasico`, `neon`, `retro`) y, si faltan o no son legibles, escriba el spec en Draft como hace siempre.

**Espera a que termine.** Resume al usuario su resultado: la ruta del spec Draft que escribió o que el juego ya cumple.

### 5.3 — `mobile-porter`

Solo cuando `skin-designer` haya terminado, lanza `mobile-porter` con la herramienta `Agent` (`subagent_type: "mobile-porter"`). En el prompt indica:

- El juego recién implementado: id `<id>`, spec `specs/NN-juego-<id>.md`, rama actual.
- Que preste atención especial a su Detalle (`#/juego/<id>`) y a su player (`#/jugar/<id>`, con los botones `touch` de su `definition.ts` según el SPEC 14), sin saltarse su regresión general.
- Si `skin-designer` escribió un spec en Draft, su número, para que `mobile-porter` tome el siguiente libre.

**Espera a que termine** y resume su resultado.

### Reglas de la fase

- **Nunca lances los dos agentes en el mismo mensaje.** Van uno detrás de otro: los dos escriben un spec con el siguiente número libre y en paralelo podrían elegir el mismo.
- Los agentes no escriben código. Sus specs quedan en Draft en la rama actual, sin commit. No los implementes aquí: están fuera del alcance de este spec.
- Si un agente falla o no puede completar su auditoría (p. ej. Playwright no disponible), dilo tal cual y sigue con el cierre.

---

## Cierre

```
✅ Spec implementado y auditado.

Spec:   specs/NN-juego-<id>.md
Rama:   spec-NN-juego-<id>

Auditorías:
  skin-designer  → [specs/NN-....md (Draft) | sin cambios necesarios]
  mobile-porter  → [specs/NN-....md (Draft) | sin cambios necesarios]

Siguiente paso: verifica uno a uno los criterios de aceptación del spec.
Si todos pasan, cambia su estado a "Implemented" y haz el commit final
antes de mergear la rama. Los specs Draft de las auditorías se revisan,
aprueban e implementan aparte con /spec-impl.
```
