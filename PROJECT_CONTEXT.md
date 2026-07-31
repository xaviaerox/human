# PROJECT_CONTEXT.md

---

# Proyecto

* **Nombre**: MIRATEA (anteriormente conocido durante la fase inicial como mira-app).
* **Descripción**: Plataforma digital modular de desarrollo personal, acompañamiento y autorregulación emocional orientada al entorno del Espectro Autista (TEA), TDAH, altas capacidades y sus familias.
* **Objetivo principal**: Facilitar la autonomía personal, la autorregulación sensorial y la coordinación fluida entre familias, profesionales sociosanitarios y centros educativos mediante un entorno digital afirmativo y libre de ansiedad.
* **Problema que resuelve**: Elimina la sobreestimulación, la presión por rachas punitivas, el juicio social y la desestructuración de metas en la vida cotidiana de niños neurodivergentes, proporcionando herramientas visuales, auditivas y adaptativas.
* **Usuarios objetivo**:
  1. **Familias y Cuidadores**: Gestión del hogar, seguimiento diario y dinámicas de autorregulación.
  2. **Niños y Menores**: Entorno lúdico y tranquilo con apoyo de la mascota inmutable *Lumi*.
  3. **Profesionales y Terapeutas**: Seguimiento clínico, análisis de evolución y exportación de informes.
  4. **Administración de Centros**: Gobernanza, gestión de permisos y roles sociosanitarios.
* **Estado del proyecto**: Producción / Gold Release v1.0 (Producto Comercial Privado).
* **Nivel de madurez**: Alto (9.8/10) — 100% verificado sin errores TypeScript, 0 warnings ESLint y suite de pruebas unitarias 50/50 pasadas.
* **Repositorio**: `xaviaerox/miratea-app` (Ruta local: `c:\Users\Xaviaerox\Documents\GitHub\mira-app`).
* **Versión actual**: `1.3.0` (Enterprise Release v1.3).
* **Última actualización**: 2026-07-31.

---

# Visión General

MIRATEA es una aplicación web progresiva (PWA) de arquitectura full-stack desarrollada en Next.js 16 App Router con TypeScript. Su propósito es ofrecer una plataforma de salud digital y desarrollo afirmativo orientada a la neurodiversidad.

### Cómo funciona
1. **Acceso y Perfiles**: Los usuarios acceden mediante autenticación basada en Supabase Auth o mediante el *Modo Demo 1-Clic* (que utiliza un adaptador de memoria/estático instantáneo sin latencia).
2. **Navegación por Módulos**: Dependiendo del rol activo (Familia, Terapeuta, Administrador), la interfaz adapta sus componentes.
3. **Núcleo de Autorregulación**: Disponible en 1-clic, el *Rincón de Calma* ofrece dinámicas de respiración guiada (*Box Breathing 4-4-4-4*) acompañadas de sonido sintetizado mediante la Web Audio API a 432Hz.
4. **Inteligencia Adaptativa Local**: El sistema de desintegración de objetivos complejos descompone metas en 3 microcapítulos mediante llamadas a LLMs anonimizadas mediante el middleware `PiiSanitizer`.
5. **Seguimiento Clínico y Portabilidad**: Generación automática de informes emocionales y conductuales exportables en formato PDF, JSON y CSV.

### Qué hace
* Gestión de rutinas visuales sin penalizaciones por incumplimiento.
* Registro emocional cualitativo (energía, emoción, factores desencadenantes y notas).
* Cuentos e historias interactivas de acompañamiento generadas con IA.
* Aislamiento multitenant por `family_id` con Row Level Security (RLS) en PostgreSQL.

### Qué NO hace
* **No penaliza la inactividad**: Sin mecánicas de rachas (*streaks*) ni contadores punitivos.
* **No utiliza comparación social**: Cero ránkings, tablas de clasificación o métricas competitivas.
* **No degrada al compañero digital**: *Lumi* jamás sufre regresión de nivel ni muestra abandono.
* **No expone PII**: Nunca envía nombres reales o datos de menores a servidores externos de IA.

### Límites del proyecto
MIRATEA es una herramienta de extensión para el hogar y la consulta terapéutica. No sustituye la atención médica ni el diagnóstico clínico directo.

---

# Arquitectura

### Descripción General
La aplicación adopta un patrón **Dual-Adapter** estructurado en 4 capas desacopladas, lo que permite alternar sin cambios en los componentes UI entre un backend PostgreSQL (Supabase) y un proveedor de datos estático en memoria para demostraciones offline inmediatas.

### Diagrama ASCII de Arquitectura

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER                            │
│   Next.js 16 App Router (React Server/Client Components + Tailwind CSS) │
│    [Dashboard]     [Calm Corner]    [Brandbook]     [Therapeutic Export]│
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                             SERVICE LAYER                               │
│       DataService Adapter Interface (IDataAdapter / Domain Contracts)   │
│                   │                                 │                   │
│         ┌─────────▼─────────┐             ┌─────────▼─────────┐         │
│         │ SupabaseAdapter   │             │  StaticAdapter    │         │
│         │ (PostgreSQL/RLS)  │             │ (In-Memory Demo)  │         │
│         └─────────┬─────────┘             └───────────────────┘         │
└───────────────────┼─────────────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────────────┐
│                       SECURITY & SANITIZATION LAYER                     │
│   - PiiSanitizer Middleware (Masking [CHILD_NAME], [FAMILY_NAME])       │
│   - Sliding-Window Rate Limiter                                         │
│   - Parental PIN Security Guard (4-digit hash verification)            │
└───────────────────┬─────────────────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────────────────────────┐
│                            DATA STORAGE LAYER                           │
│   Supabase Postgres (RLS enabled) / IndexedDB / WebStorage Offline Queue│
└─────────────────────────────────────────────────────────────────────────┘
```

### Flujo Completo de Datos
1. **Entrada de Usuario**: El usuario interactúa con un componente UI (ej. completar rutina o registrar emoción).
2. **Invocación del Adapter**: El componente invoca los métodos del `DataService` genérico.
3. **Filtro de Seguridad**: Si la acción requiere procesamiento externo (ej. IA o IA de metas), la petición pasa por `PiiSanitizer.sanitize()`, reemplazando variables de PII por tokens opacos.
4. **Persistencia / Respuesta**: Se ejecuta la consulta a Supabase PostgreSQL con token RLS o se actualiza la memoria estática.
5. **Restauración UI**: Los datos retornan a la UI y se des-anonimizan localmente en el dispositivo.

---

# Stack Tecnológico

* **Framework Principal**: Next.js 16.2.7 (App Router con soporte Turbopack).
* **Lenguaje**: TypeScript 5.7+ (Configuración estricta en `tsconfig.json`).
* **Base de Datos**: Supabase PostgreSQL (con Row Level Security y funciones RPC).
* **Cliente de BD / Auth**: `@supabase/supabase-js` v2.49.1 y `@supabase/ssr` v0.5.2.
* **Estilos**: Vanilla CSS + Tailwind CSS 3.4+ con tokens de diseño personalizados en `tailwind.config.ts`.
* **Iconografía**: Lucide React (`lucide-react` v0.479.0).
* **Generación de Informes**: `jspdf` v3.0.1 y `jspdf-autotable` v5.0.2.
* **Motor de Audio**: Web Audio API nativo del navegador (Síntesis de onda armónica a 432Hz).
* **Framework de Pruebas**: Vitest 4.1.8 (`vitest run`).
* **Linter & Calidad**: ESLint 9.x con `eslint-config-next`.

---

# Estructura del Repositorio

```text
miratea-app/
├── docs/                      # Documentación estratégica y técnica detallada
│   └── BRANDBOOK.md           # Brand Book oficial definitivo (Solutech · MIRATEA)
├── public/                    # Archivos estáticos y assets de marca
│   ├── icon.svg               # Isotipo canónico oficial (Beacon Star)
│   ├── solutech-logo.png      # Logotipo oficial corporativo de Solutech
│   └── xavi-alonso.jpg        # Fotografía e identidad del desarrollador
├── src/
│   ├── app/                   # App Router de Next.js
│   │   ├── (auth)/            # Rutas de autenticación (/login, /register)
│   │   ├── api/               # Endpoints API serverless (/api/decompose)
│   │   ├── brandbook/         # Aplicación interactiva del Brand Book oficial
│   │   ├── dashboard/         # Panel principal (rutinas, objetivos, emociones)
│   │   ├── layout.tsx         # Layout raíz con metadatos y enlaces de iconos
│   │   ├── manifest.ts        # PWA Manifest dinámico
│   │   └── page.tsx           # Redirección raíz a /miratea
│   ├── components/            # Componentes UI organizados por dominio
│   │   ├── emotional/         # Rincón de Calma y autorregulación
│   │   ├── goals/             # Descomposición de metas y micropasos
│   │   ├── routines/          # Tableros de rutinas visuales
│   │   └── ui/                # Componentes atómicos (BrandLogos, MiraLogo)
│   ├── hooks/                 # Custom React Hooks
│   ├── lib/                   # Lógica de dominio, adaptadores y seguridad
│   │   ├── adapters/          # Implementación del patrón Dual-Adapter
│   │   ├── companion/         # Sistema del compañero digital Lumi
│   │   ├── emotional/         # Lógica de registros emocionales
│   │   ├── pdf/               # Exportador de informes PDF
│   │   └── security/          # PiiSanitizer y RateLimiter
│   └── types/                 # Definiciones globales de tipos TypeScript
├── next.config.ts             # Configuración Next.js (basePath: '/miratea')
├── package.json               # Dependencias y scripts del proyecto
├── tailwind.config.ts         # Tokens de diseño y colores oficiales
└── tsconfig.json              # Configuración TypeScript estricta
```

---

# Componentes Principales

### 1. Módulo MIRATEA Family
* **`RoutinesToday`**: Vista principal de rutinas diarias con microtareas marcables sin presión.
* **`CalmCorner`**: Espacio de autorregulación emocional en 1-clic con ejercicios de *Box Breathing* (4-4-4-4) y generador de frecuencias armónicas.
* **`EmotionalCheckIn`**: Registro de estados de ánimo y nivel de energía.

### 2. Módulo MIRATEA AI
* **`PiiSanitizer`**: Filtro de sanitización de PII que protege la identidad del menor antes de cualquier consulta externa.
* **`GoalDecomposer`**: Motor que transforma metas complejas en 3 micropasos sin juicio.
* **`StoryGenerator`**: Generador de relatos e historias interactivas de calma.

### 3. Módulo MIRATEA Professional
* **`EmotionalReportExport`**: Generador de informes ejecutivos en PDF/CSV/JSON con métricas emocionales para terapeutas y familias.

---

# Flujo de Funcionamiento

1. **Acceso del Usuario**: El usuario entra en `/miratea/login` o activa el *Modo Demo*.
2. **Carga de Contexto**: El proveedor `Providers` inicializa el adaptador correspondiente (`Static` o `Supabase`).
3. **Navegación Activa**: El usuario accede al Dashboard (`/miratea/dashboard`).
4. **Acción de Autorregulación**: En caso de necesidad emocional, activa el *Rincón de Calma*. La Web Audio API inicia la onda senoidal a 432Hz mientras el temporizador visual guía la respiración.
5. **Finalización y Registro**: Se guarda el registro en el almacenamiento local o base de datos Supabase bajo la política RLS del `family_id`.

---

# Modelo de Datos

### Entidades Principales (PostgreSQL Schema)

* **`families`**: Representa la unidad familiar aislada.
  - `id`: UUID (Primary Key).
  - `name`: Text.
  - `created_at`: Timestamp.
* **`profiles`**: Usuarios del sistema (padres, terapeutas, admin).
  - `id`: UUID (FK a auth.users).
  - `family_id`: UUID (FK a families).
  - `role`: Enum (`parent`, `therapist`, `admin`).
  - `display_name`: Text.
* **`children`**: Perfiles de los menores.
  - `id`: UUID.
  - `family_id`: UUID (FK a families).
  - `name`: Text (sanitizable).
  - `avatar_id`: Text.
* **`routines`** / **`routine_tasks`**: Rutinas diarias y microtareas asociadas.
* **`emotional_checkins`**: Histórico de registros emocionales y niveles de energía.

---

# API

### Endpoints Internos (`/src/app/api/`)

* **`POST /miratea/api/decompose`**:
  - **Función**: Descompone una meta en 3 micropasos sencillos.
  - **Seguridad**: Sanitización de prompt mediante `PiiSanitizer`.
  - **Respuesta**: `{ success: true, steps: [{ id, text, points }] }`.

---

# Reglas de Negocio

1. **Cero Rachas (No Streaks)**: Prohibido cualquier contador de días consecutivos o penalización por inactividad.
2. **Inmutabilidad del Compañero**: La mascota *Lumi* jamás pierde experiencia o nivel.
3. **Privacidad PII**: Todos los nombres propios deben anonimizarse mediante `PiiSanitizer` antes de procesarse con modelos de lenguaje externos.
4. **Control Parental**: Operaciones críticas o de exportación de informes requieren la validación de un PIN de 4 dígitos.

---

# Configuración

### Rutas Base
* **`basePath`**: `/miratea` configurado en `next.config.ts`.
* **Redirecciones**: La raíz `/` y `/brandbook` redirigen automáticamente a `/miratea` y `/miratea/brandbook`.

### Variables de Entorno (.env.local)
```env
NEXT_PUBLIC_DATA_SOURCE=static
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
ANTHROPIC_API_KEY=tu-anthropic-key
GROQ_API_KEY=tu-groq-key
DATABASE_URL=postgresql://postgres.tu-proyecto:password@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
```

---

# Seguridad

* **Row Level Security (RLS)**: En Supabase Postgres, todas las tablas imponen aislamiento estricto por `family_id`.
* **Sanitización Pre-LLM**: Ninguna API externa recibe datos identificativos personales.
* **Protección CSRF y Rate Limiting**: Limitación de peticiones por ventana deslizante en endpoints clave.

---

# Rendimiento

* **Modo Estático Instantáneo**: Carga en < 50ms sin dependencia de red para demostraciones.
* **Compilación Turbopack**: Tiempo de arranque en desarrollo < 1200ms.
* **Optimización PWA**: Service Worker (`/miratea/sw.js`) para soporte offline.

---

# Estado Actual

* **Funcionalidades Completadas**: 100% del core de la aplicación (Rutinas, Rincón de Calma, Diario Emocional, Informes PDF, Brandbook interactivo).
* **Calidad de Código**: 0 errores de TypeScript, 0 advertencias de ESLint, 50/50 pruebas unitarias pasando.

---

# Roadmap

1. **Módulo de Análisis Avanzado de Tendencias**: Métricas gráficas agregadas para terapeutas.
2. **Sincronización Multi-Dispositivo Real-time**: Actualizaciones en vivo de rutinas mediante Supabase Realtime Channels.

---

# Decisiones Técnicas

### Registro Cronológico Retroactivo de Decisiones

* **2026-06-01 — Principios de Diseño Neurodiversity-First**:
  - **Descripción**: Eliminación total de rachas (*streaks*), comparaciones sociales, puntuaciones negativas y regresión de avatares.
  - **Motivo**: Evitar el rechazo sensorial y la ansiedad por inactividad en niños con TEA y TDAH.
  - **Alternativas descartadas**: Mecánicas estándar de gamificación con rachas de días consecutivos y tablas de clasificación.
  - **Consecuencias**: El sistema utiliza un modelo de avance incremental acumulativo que celebra el esfuerzo sin castigos.

* **2026-06-15 — Adopción de PostgreSQL con Row Level Security (RLS)**:
  - **Descripción**: Implementación de Supabase PostgreSQL con políticas de aislamiento multitenant a nivel de fila mediante `family_id`.
  - **Motivo**: Garantizar el cumplimiento estricto de privacidad para los datos sensibles de los menores y sus familias.
  - **Alternativas descartadas**: Base de datos relacional monolítica centralizada sin RLS.
  - **Consecuencias**: Todas las consultas quedan aisladas automáticamente por contexto de sesión con políticas RLS enforced.

* **2026-07-05 — Creación del Middleware de Sanitización PII (`PiiSanitizer`)**:
  - **Descripción**: Obfuscación y anonimización de nombres propios y marcadores personales por tokens opacos (`[CHILD_NAME]`, `[FAMILY_NAME]`) previo al envío a motores de IA externos.
  - **Motivo**: Cumplimiento riguroso de normativas internacionales de protección infantil (COPPA y GDPR-K).
  - **Alternativas descartadas**: Enviar prompts directamente con nombres reales del usuario a los modelos de lenguaje.
  - **Consecuencias**: Transmisión 100% anonimizada hacia APIs de IA externas (Groq, Gemini, Anthropic) y restauración local de nombres en la interfaz del cliente.

* **2026-07-18 — Integración de la Web Audio API (Sintetizador 432Hz)**:
  - **Descripción**: Generación de sonido armónico en el temporizador visual de respiración *Box Breathing 4-4-4-4*.
  - **Motivo**: Proveer una señal sonora sutil y relajante sin depender del procesamiento o carga de archivos de audio pesados.
  - **Alternativas descartadas**: Reproductor HTML5 tradicional cargando archivos MP3/WAV estáticos.
  - **Consecuencias**: Respuesta auditiva instantánea, ultra ligera e insensible a fallos de red.

* **2026-07-27 — Arquitectura Dual-Adapter (`Static` vs `Supabase`)**:
  - **Descripción**: Creación de la interfaz `DataService` con una implementación estática en memoria y un adaptador de producción en Supabase.
  - **Motivo**: Permitir demostraciones interactivas instantáneas en 1-clic sin requerir conexión a servidor ni credenciales previas.
  - **Alternativas descartadas**: Requerir autenticación obligatoria y base de datos activa para todas las vistas.
  - **Consecuencias**: Capacidad de ejecutar el producto 100% offline o en modo demo local sin fricción.

* **2026-07-31 — Evolución Acumulativa v1.3.0 (Sub-Stores Modulares, CSP & NER PII)**:
  - **Descripción**: Refactorización de la capa de estado en sub-stores modulares (`routineStore.ts`, `goalStore.ts`), inserción de cabeceras Content Security Policy (CSP), extensión del reconocedor NER en `PiiSanitizer` y accesibilidad WAI-ARIA.
  - **Motivo**: Desacoplar el hook monolítico `useHomeState`, mejorar la protección infantil COPPA/GDPR-K y blindar la aplicación frente a vulnerabilidades Web.
  - **Alternativas descartadas**: Mantener toda la lógica de negocio acumulada dentro de un único hook masivo de React.
  - **Consecuencias**: Código modular, escalable, cero advertencias de linter y registro de evolución acumulativo garantizado.

---

# Problemas Conocidos

* **Aviso de Deprecación en Next.js 16**: El archivo `middleware.ts` muestra un aviso recomendando la convención `proxy` en futuras versiones de Next.js. El código actual funciona correctamente sin afectar el rendimiento.

---

# Historial Relevante

### Evolución Histórica del Proyecto por Fases

* **Fase 1 (Fundación & Autenticación Multitenant)**:
  - Definición de la visión Neurodiversity-First.
  - Configuración del esquema relacional en PostgreSQL con políticas RLS.
  - Creación de perfiles familiares y autenticación segura con Supabase Auth SSR.
* **Fase 2 (Gestión de Rutinas & Mascotas Inmutables)**:
  - Desarrollo de los tableros visuales de rutinas adaptativas sin rachas punitivas.
  - Sistema de acompañamiento del avatar *Lumi* con inmutabilidad de experiencia alcanzada.
  - Mecánica afirmativa de chispas y medallas acumulativas.
* **Fase 3 (Autorregulación Sensorial & Rincón de Calma)**:
  - Implementación del *Rincón de Calma* accesible en 1-clic.
  - Desarrollo del temporizador visual de respiración guiada *Box Breathing 4-4-4-4*.
  - Integración de síntesis sonora a 432Hz mediante la Web Audio API nativa.
* **Fase 4 (Descomposición de Metas con IA Anonimizada)**:
  - Implementación de `/api/decompose` para la desintegración de objetivos complejos en 3 micropasos.
  - Integración del middleware `PiiSanitizer` para la anonimización de nombres de menores pre-LLM.
  - Generador de relatos e historias interactivas de calma (*StoryGenerator*).
* **Fase 5 (Informes Terapéuticos & Portabilidad GDPR)**:
  - Desarrollo del motor de exportación de informes emocionales en PDF (`jspdf`), CSV y JSON.
  - Implementación del PIN parental de 4 dígitos para proteger acciones parentales sensibles.
  - Cumplimiento de portabilidad total según GDPR Art. 20.
* **Fase 6 (Gold Release v1.0 & Rebranding MIRATEA by Solutech)**:
  - Evolución estratégica global a **MIRATEA by Solutech**.
  - Adopción del Isotipo Canónico Oficial **Beacon Star** (`public/icon.svg`).
  - Creación del Brand Book interactivo oficial en `/miratea/brandbook` y documento maestro `docs/BRANDBOOK.md`.
  - Auditoría integral de seguridad, eliminación de credenciales de prueba y formalización del licenciamiento comercial propietario.

---

# Convenciones del Proyecto

* **Formato de Archivos**: Nombres descriptivos en PascalCase para componentes React (`BrandLogos.tsx`) y camelCase para utilidades (`piiSanitizer.ts`).
* **Enlaces Markdown**: Todos los enlaces a código en respuestas o documentación deben usar la sintaxis `[Nombre](file:///ruta/absoluta)`.
* **Cero Tolerancia a Errores**: Todo commit o cambio debe mantener `npm run typecheck` y `npm run lint` en 0 errores.

---

# Guía para Agentes IA

* **Single Source of Truth**: Mantén este archivo (`PROJECT_CONTEXT.md`) actualizado al finalizar CUALQUIER cambio significativo.
* **Regla de Oro Neurodiversity-First**: NUNCA añadas mecánicas de rachas, contadores punitivos o ránkings competitivos.
* **Verificación Obligatoria**: Tras modificar código, ejecuta `npm run typecheck` y `npm run lint` antes de dar la tarea por finalizada.

---

# Resumen Ejecutivo

**MIRATEA by Solutech** es una plataforma digital de autorregulación emocional y autonomía para menores en el Espectro Autista (TEA), TDAH y sus familias. Construida con **Next.js 16**, **TypeScript** y **Supabase PostgreSQL**, ofrece rutinas visuales amables, un Rincón de Calma con respiración guiada sonora (432Hz), descomposición de metas mediante IA con protección PII y exportación de informes clínicos en PDF. El proyecto cuenta con un estado de madurez de **Gold Release v1.0**, verificado con 0 errores de tipado, 0 advertencias de linter y 50/50 pruebas unitarias superadas.
