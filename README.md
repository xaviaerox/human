# Mira 🌟

> **Plataforma de crecimiento emocional y autonomía para niños y familias neurodivergentes.**

[![CI Verification](https://github.com/xaviaerox/mira-app/actions/workflows/ci.yml/badge.svg)](https://github.com/xaviaerox/mira-app/actions/workflows/ci.yml)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black.svg)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20RLS-emerald.svg)](https://supabase.com/)

---

## 📖 Visión del Proyecto

**Mira** es un espacio digital diseñado bajo principios éticos no punitivos para apoyar a niños neurodivergentes (TEA, TDAH, altas capacidades) y a sus familias en el desarrollo de la autorregulación emocional, hábitos de autonomía y la gestión compartida de metas familiares.

---

## 💎 Principios No Negociables de Diseño (Neurodiversity-First)

1. **Sin Rachas (No Streaks)**: No existen contadores de días consecutivos que generen ansiedad o culpa por interrupciones.
2. **Sin Comparación Social**: Cada niño avanza a su propio ritmo. No existen tablas de clasificación ni rankings familiares.
3. **Sin Regresión del Companion**: El compañero mágico (*Lumi*) evoluciona con las interacciones positivas pero **nunca pierde su etapa alcanzada**.
4. **Sin Mecánicas de Urgencia**: Sin temporizadores estresantes ni notificaciones intrusivas.
5. **Sin Puntuaciones Negativas**: Todas las evaluaciones de valores y chispas son acumulativas e incrementales.

---

## 🏗️ Arquitectura del Sistema

El proyecto sigue una arquitectura desacoplada mediante el **Adapter Pattern**:

```
┌─────────────────────────────────────────────────────────────────┐
│                        MIRA PLATFORM                            │
│                                                                  │
│   Vista Infantil                    Panel Parental (Dashboard)   │
│   ──────────────────                ──────────────────────────   │
│   • Companion Lumi (ambient)        • Gestión de miembros        │
│   • Rutinas de hoy                  • Resumen emocional semanal  │
│   • Metas y microtareas             • Asignación de objetivos    │
│   • Check-in emocional              • Recompensas e insignias    │
│                                                                  │
│                   │                           │                  │
│                   └───────────┬───────────────┘                  │
│                               │                                  │
│                    ┌──────────▼──────────────┐                   │
│                    │   Next.js App Layer      │                   │
│                    │   React Context Tree     │                   │
│                    │   Adapter Pattern        │                   │
│                    └──────────┬──────────────┘                   │
│                               │                                  │
│              ┌────────────────▼────────────────┐                 │
│              │           Supabase               │                 │
│              │  PostgreSQL + Auth + Realtime    │                 │
│              │  Row Level Security (RLS)        │                 │
│              │  Vector Memory (pgvector RAG)    │                 │
│              └─────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Inicio Rápido

### Requisitos previos
- Node.js 20+
- npm 10+
- Docker (opcional para ejecución containerizada o Supabase local)

### Instalación local

```bash
# 1. Clonar el repositorio
git clone https://github.com/xaviaerox/mira-app.git
cd mira-app

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.local.example .env.local

# 4. Iniciar servidor de desarrollo (Modo estático in-memory por defecto)
npm run dev
```

Navega a [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## ⚙️ Variables de Entorno

| Variable | Tipo | Descripción |
|---|---|---|
| `NEXT_PUBLIC_DATA_SOURCE` | Obligatorio | `'static'` (demostración en memoria) o `'supabase'` (producción). |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | URL del proyecto de Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Clave pública anónima de Supabase. |
| `GROQ_API_KEY` | Servidor | Clave de API de Groq para desintegración IA y Companion chat. |
| `GEMINI_API_KEY` | Servidor | Clave de API de Google Gemini (fallback de IA). |
| `ANTHROPIC_API_KEY` | Servidor | Clave de API de Anthropic Claude (fallback de IA). |

---

## 🧪 Testing y Verificación

```bash
# Comprobación de tipos TypeScript en modo estricto
npm run typecheck

# Análisis estático de código con ESLint
npm run lint

# Pruebas unitarias con Vitest
npm run test

# Pruebas E2E con Playwright
npm run test:e2e

# Cobertura de código
npm run test:coverage
```

---

## 🐳 Despliegue con Docker

Para construir y levantar el contenedor de producción localmente:

```bash
docker-compose up --build
```

El servicio estará disponible en `http://localhost:3000`.

---

## 🔒 Seguridad y Privacidad

- **Row Level Security (RLS)**: Enforzado en todas las tablas de PostgreSQL.
- **Triggers Servidor**: El cálculo del saldo de chispas (`spark_ledger`) y la evolución del Companion están protegidos en el servidor mediante funciones `SECURITY DEFINER`.
- **Sanitización de PII**: Las notas libres se desinfectan mediante `PiiSanitizer` antes de procesarse en modelos de lenguaje.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Ver [LICENSE](file:///c:/Users/Xaviaerox/Documents/GitHub/mira-app/LICENSE) para más información.
