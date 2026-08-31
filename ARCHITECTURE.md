# Lineamientos generales — Frontend

## Información del proyecto general

Este proyecto busca acelerar los procesos internos que se dan dentro de la empresa Abril Grupo Inmobiliario, como automatizar la generación de contratos, acelerar el registro de trabajadores mediante el uso de consultas a APIs tercerizadas de RENIEC, acelerar el registro de subcontratistas mediante el uso de consultas a APIs tercerizadas de SUNAT, entre otras cosas
El proyecto cuenta con un frontend en Angular 21, un backend .NET 10, una base de datos PostgreSQL 17, entre otros servicios como el uso de https://cron-job.org/ para recordatorios automatizados.
Tanto el frontend, backend y base de datos están hosteados en una VPS y se cuenta con un deploy.yml para subir los cambios.

## Estructura general

El proyecto usa **arquitectura por features**. Cada funcionalidad es
independiente y vive en su propia carpeta. Existen servicios y componentes
bajo la antigua estructura por capas que están **deprecados** y necesitan
refactorizarse — no seguir esa estructura para código nuevo.

## Organización de carpetas

```
src/app/
├── features/
│ ├── costs/
│ │ ├── features/
│ │ │ ├── adjudicaciones/
│ │ │ └── correos-por-proyecto/
│ │ └── shared/ ← archivos compartidos solo dentro del módulo
│ ├── contractors/
│ └── microsoft-auth/
├── shared/ ← componentes reutilizables globales
│ └── components/
│ ├── base-modal/
│ ├── search-select/
│ ├── file-selector/
│ ├── file-preview/
│ ├── view-toggle/
│ └── paginator/
└── core/ ← servicios y DTOs reutilizables globales
├── services/
│ ├── auth.service.ts
│ ├── loader.service.ts
│ └── error.service.ts
├── navigation/
└── dtos/

## ¿Qué es una feature?
Una feature es una funcionalidad específica que aparece como ítem en el
sidebar lateral (o en el sidebar del header en algunos casos) de la aplicación frontend. Cada entrada del sidebar
corresponde exactamente a una feature y tiene su propia carpeta dentro del
módulo al que pertenece.
Ejemplos:
- "Adjudicaciones" → `costs/features/adjudicaciones/`
- "Homologación de Contratistas" → `contractors/features/contractor-registration/`
- "Gestión de Contratistas" → `contractors/features/contractor-management/`
No se considera feature a un subcomponente interno de una funcionalidad
(como un modal de creación o un componente de tabla): esos viven dentro
de la carpeta de su feature como parte de su estructura interna libre.

## Reglas

### ✅ Código nuevo
- Cada feature va dentro de `features/{modulo}/features/{nombre-feature}/`
- Dentro de cada feature hay **estructura libre**: se pueden crear las
  subcarpetas que la funcionalidad requiera. Casi siempre irán las carpetas `components/`, `services/` y
  `dtos/` en una funcionalidad del frontend.
- Cada módulo registra sus rutas en `{modulo}.routes.ts` con Angular moderno y ya no se debe de usar NgModule para poder exponer las rutas.
- Los componentes deben ser **standalone** (`standalone: true`)

### ❌ No hacer
- No crear componentes, servicios ni DTOs directamente bajo `src/app/` o
  en carpetas raíz genéricas fuera de `features/`, `shared/` o `core/`
- No compartir archivos entre features salvo que 2 o más los usen.
  En ese caso: si los usan features del mismo módulo → mover a
  `features/{modulo}/shared/`. Si los usan módulos distintos → mover a
  `shared/` o `core/` según corresponda
- No poner lógica de negocio en los componentes de página — delegarla
  al servicio de la feature

## `shared/` — Componentes reutilizables globales
Contiene componentes Angular standalone reutilizables por cualquier feature:
| Componente | Selector | Descripción |
|---|---|---|
| `base-modal` | `app-base-modal` | Contenedor de modal con título y botón de cierre |
| `search-select` | `app-search-select` | Select con búsqueda, acepta cualquier lista de objetos |
| `file-selector` | `app-file-selector` | Input de archivo estilizado con hint y evento de selección; color de acento y fondo configurables (default verde `--color-abril-lime`) |
| `file-preview` | `app-file-preview` | Lista de archivos seleccionados con botón de eliminar; color de borde, fondo e ícono configurables (default verde `--color-abril-lime`) |
| `view-toggle` | `app-view-toggle` | Toggle de modos de vista (tabla/tarjetas) con íconos SVG |
| `paginator` | `app-paginator` | Paginador genérico con eventos de cambio de página |
| `date-picker` | `app-date-picker` | Selector de fecha con calendario desplegable; valor `YYYY-MM-DD` como el input nativo y color de acento configurable (default `--color-abril-lime`) |
| `time-picker` | `app-time-picker` | Selector de hora con desplegable estilizado (columnas de hora/minuto); valor `HH:mm` 24h como el input nativo y color de acento configurable (default `--color-abril-standard`) |
entre muchos otros más.
Para agregar un componente compartido, crear la carpeta en
`shared/components/{nombre}/` con sus archivos `.ts`, `.html` y `.css`.

## `core/` — Servicios reutilizables globales
Contiene servicios y DTOs usados solo por múltiples módulos:
| Carpeta | Descripción |
|---|---|
| `core/services/auth.service.ts` | Lectura del token y roles del usuario |
| `core/services/loader.service.ts` | Control del spinner global | Es importantísimo utilizar este servicio cuando se hace una llamada HTTP.
| `core/services/error.service.ts` | Manejo centralizado de errores HTTP |
| `core/navigation/` | Configuración del menú lateral por roles |
| `core/dtos/` | Interfaces compartidas (paginación, respuestas API, etc, solo se colocan aquí archivos cuando son usados por múltiples módulos. Actualmente puede tener archivos que no deberían ir ahí por la anterior arquitectura deprecada.) |

> ⚠️ **Aviso — carpetas deprecadas en `core/`**
>
> Las carpetas `src/app/core/dtos/`, `src/app/core/services/` y
> `src/app/core/models/` contienen archivos que fueron creados bajo la
> **antigua arquitectura por capas** y están **deprecados** pero que no se quitan todavía porque todavía hay funcionalidades que usan esa arquitectura deprecada.
>
> - No agregar nuevos archivos en estas carpetas.
> - Los servicios nuevos reutilizables deben crearse dentro del servicio
>   de su feature. Si realmente son globales y los usan 2 o más módulos,
>   crear una carpeta propia en `core/` con nombre descriptivo
>   (ej. `core/auth/`, `core/error/`) en lugar de seguir acumulando en
>   `core/services/` o `core/dtos/`.
> - Los modelos e interfaces nuevos compartidos entre módulos van en
>   `shared/` o dentro del `shared/` del módulo correspondiente, no en
>   `core/models/`.

## Consideraciones sobre la base de datos
Puedes conectarte a la base de datos de desarrollo siempre que quieras y ejecutar las sentencias que quieras libremente.
Para el caso de la base de datos de producción solo deberás ejecutar sentencias select y no otro tipo de sentencia sql y siempre después de terminar una funcionalidad deberás de escribirme las sentencias sql necesarias para yo ejecutarlas en producción. Para saber las credenciales puedes revisar sin problema en los archivos del backend appsettings.Development.json (que contiene las credenciales de dev), appsettings.Local.json (que contiene las credenciales de producción, no asumas que porque se llama Local tendrá las credenciales de dev) y appsettings.Production.json (que también contiene las credenciales de producción).

## Registro de rutas
Cada módulo expone su array de rutas en `{modulo}.routes.ts` y se importa
en `app.routes.ts`:
En caso se tenga que agregar una funcionalidad, dicha funcionalidad debe de tener un featureKey el cual deberá ser insertado en la tabla feature en el campo feature_key y asignarle también un module_id que apunta a la tabla module. Tener en cuenta lo que puse en 'Consideraciones sobre la base de datos'.

## Roles
Normalmente si se quiere restringir el acceso a una funcionalidad en base a roles es en la base de datos en la tabla role_feature que se indica que roles pueden acceder a x funcionalidades y luego es en user_role que se asigna uno o varios roles a un usuario del sistema.
Pero hay casos que en una funcionalidad interactúan dos o más roles y cada rol solo tiene acceso a x cosa. Es por ello que existe un archivo src\app\core\constants\roles.ts que simula los roles que hay actualmente en la base de datos en forma de constantes globales para toda la aplicación y no tener que poner 'strings mágicos'.
Para saber los roles del usuario puedes usar getRoles ubicado en src\app\core\services\auth.service.ts

## Consideraciones sobre la creación de peticiones HTTP a el backend.
Se debe de priorizar el uso óptimo de conexiones que brinda la base de datos. Por tal motivo en el caso del frontend, se deberán hacer la menor cantidad posible de peticiones HTTP al backend. Si por ejemplo al entrar a una funcionalidad se tienen que cargar los datos de los filtros y los datos de una tabla, pues se deberá hacer una sola petición HTTP que traiga esos datos. Al entrar a ver un detalle de algo se deberá hacer otra petición HTTP que traiga de una vez todos los detalles y no hacer peticiones HTTP innecesarias. Al entrar a un dashboard se deberán traer todos los datos de todos los gráficos en una sola petición HTTP. Solo se pueden hacer excepciones si es que la funcionalidad lo requiere o en funcionalidades muy especiales/específicas.
Cada acción de la página que traiga datos debe de traer los datos justos y necesarios. Por ejemplo al cargar un componente/página se deben de traer en una sola petición HTTP todos los datos (como los datos de filtros y los datos de una tabla), pero si el usuario va a usar los filtros pues se debe de llamar a otro endpoint que solo llame los datos de la tabla filtrados (puesto que ya no es necesario traer los datos de los filtros de nuevo).

## Consideraciones para pruebas
Cuando termines de hacer/escribir código buildea el proyecto para buscar posibles errores y corrígelos. No hagas previews, ni insertes datos/registros de prueba, ni trates de testear, yo testearé para verificar si está bien o no.
```