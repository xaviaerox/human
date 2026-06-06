# Mira

Plataforma de crecimiento emocional para niños y familias neurodivergentes.

## Inicio rápido

```bash
npm install
cp .env.local.example .env.local  # editar con tus credenciales
npm run dev
```

## Variables de entorno

```env
NEXT_PUBLIC_DATA_SOURCE=static        # static | supabase
NEXT_PUBLIC_SUPABASE_URL=...          # solo en modo supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=...     # solo en modo supabase
ANTHROPIC_API_KEY=...                 # para descomposición IA de objetivos
```

Con `DATA_SOURCE=static` la app funciona completamente sin base de datos.

## Rutas

| Ruta | Quién | Descripción |
|---|---|---|
| `/` | todos | Redirect inteligente según rol y onboarding |
| `/login` | todos | Email + contraseña |
| `/signup` | padre | Crear familia |
| `/join` | hijo/padre | Unirse con código de invitación |
| `/onboarding/companion` | hijo | Nombrar el companion (obligatorio) |
| `/home` | hijo | Pantalla principal: companion + rutinas + objetivo |
| `/routines` | hijo | Lista de rutinas con pasos |
| `/goals` | hijo | Objetivo activo con microtareas |
| `/checkin` | hijo | Check-in emocional completo |
| `/dashboard` | padre | Resumen familiar |
| `/dashboard/routines` | padre | Gestión de rutinas |
| `/dashboard/routines/new` | padre | Crear rutina |
| `/dashboard/goals` | padre | Gestión de objetivos |
| `/dashboard/goals/new` | padre | Crear objetivo (con IA) |
| `/dashboard/child` | padre | Detalle emocional por hijo |
| `/api/decompose` | server | Llama a Claude para descomponer objetivos |

## Activar Supabase

1. Crear proyecto en supabase.com
2. Aplicar migraciones en orden: `supabase/migrations/001` → `006`
3. Cambiar `.env.local`: `NEXT_PUBLIC_DATA_SOURCE=supabase`

## Principios no negociables

- Sin rachas (streaks)
- Sin comparación social
- Sin regresión del companion
- Sin mecánicas de urgencia
- Sin puntuaciones negativas

Ver `docs/AGENT_CONTEXT.md` para el contexto completo del proyecto.
