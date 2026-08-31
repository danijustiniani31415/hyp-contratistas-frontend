---
name: guardar-master
description: Guarda el trabajo en curso y lo sube directo a master, siguiendo la regla P5 (nunca --force). Usar cuando el usuario diga "guardar master" o quiera subir cambios hechos directamente en master a producción. Pide confirmación explícita antes del push por ser la rama de producción. Solo opera sobre el repo en el que Claude Code está parado (backend o frontend) — si el usuario quiere ambos, se corre por separado en cada terminal.
---

# Guardar master

Guarda el trabajo de la sesión y lo sube a `master`. Es la única skill que puede pushear a `master`, y lo hace con más cuidado que "guardar rama" porque va directo a producción.

## Pasos (en orden, detenerse si alguno falla)

### 1. Verificar rama actual

```
git branch --show-current
```

Si la rama NO es `master`, DETENERSE inmediatamente y responder:

```
Estás en <rama-actual>, no en master. Para usar "guardar master":

1. Si tienes cambios sin guardar en esta rama, corre "guardar rama" primero.
2. git checkout master
3. Corre "guardar master" de nuevo.
```

No continuar con ningún paso siguiente.

### 2. Commit de cambios pendientes (solo si hay algo que guardar)

```
git status --porcelain
```

Si no hay salida, no hay nada que commitear — saltar a paso 3.

Si hay cambios:
1. `git add -A`
2. Analizar el diff (`git diff --cached --stat` y revisión rápida de archivos) para generar un mensaje de commit en formato **Conventional Commits** en español. No preguntar al usuario el mensaje.
3. `git commit -m "<mensaje generado>"`

### 3. Build obligatorio

Detectar el tipo de repo:
- Si existe `angular.json` en la raíz → `ng build`
- Si existe un `.csproj` o `.sln` en la raíz → `dotnet build`

Ejecutar el build correspondiente. Si falla:
- DETENERSE. No continuar a los pasos 4-7.
- Mostrar el error de build tal cual, sin intentar arreglarlo solo salvo que el usuario lo pida.

### 4. Actualizar CONTEXT.md

Agregar al final de `CONTEXT.md` una sección con el resumen de la sesión, siguiendo el formato existente del archivo (`## Sesión YYYY-MM-DD` o `## §N — Título (YYYY-MM-DD)`). Cubrir: qué se hizo, archivos clave, pendientes. Escribir directo, sin pedir aprobación antes.

```
git add CONTEXT.md
git commit -m "docs: actualiza CONTEXT.md con resumen de sesión"
```

### 5. Traer cambios remotos

```
git fetch origin
git merge origin/master
```

Si hay conflictos:
- DETENERSE. No hacer push.
- Listar los archivos en conflicto y pedir al usuario cómo resolverlos.

### 6. Confirmación antes de push (obligatoria — master es producción)

Mostrar al usuario:
```
git log origin/master..HEAD --oneline
git diff origin/master..HEAD --stat
```

Y preguntar explícitamente: "¿Confirmas subir estos commits a master?" — esperar un sí claro antes de continuar. No asumir confirmación implícita.

### 7. Push

Solo tras confirmación explícita:
```
git push origin master
```

**Regla P5 — nunca usar `--force` bajo ninguna circunstancia**, ni aunque el usuario lo pida sin dar una razón explícita y consciente del riesgo (esto pisaría trabajo de otra PC o sesión sin aviso).
