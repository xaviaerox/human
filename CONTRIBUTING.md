# Guía de Contribución a MIRA

¡Gracias por tu interés en contribuir a MIRA! Esta plataforma está diseñada bajo principios de **diseño afirmativo y libre de ansiedad** para niños y familias neurodivergentes.

---

## 🔒 Principios No Negociables

Toda contribución debe respetar rigurosamente los 5 principios centrales de la aplicación:

1. **Sin rachas (streaks)**: No penalizamos el tiempo o días sin entrar.
2. **Sin comparación social**: No hay tablas de clasificación ni rankings.
3. **Sin regresión del companion**: El avatar nunca disminuye de etapa o pierde afinidad.
4. **Sin mecánicas de urgencia**: No utilizamos contadores regresivos punitivos.
5. **Sin puntuaciones negativas**: Las acciones solo suman progreso afirmativo.

---

## 🛠️ Entorno de Desarrollo

### Requisitos previos
- Node.js >= 20.x
- npm >= 10.x

### Instalación
```bash
git clone https.github.com/mira-app.git
cd mira-app
npm install
cp .env.local.example .env.local
npm run dev
```

---

## 🧪 Verificaciones Antes de Enviar PR

Antes de abrir una Pull Request, asegúrate de que todas las verificaciones pasen en local:

```bash
# 1. Comprobar tipos TypeScript
npx tsc --noEmit

# 2. Comprobar reglas de estilo y linter
npm run lint

# 3. Ejecutar suite de pruebas unitarias
npm test
```

---

## 📁 Estructura del Código

- `src/lib/`: Lógica de dominio y patrones Adapter (`Static*Adapter` vs `Supabase*Adapter`).
- `src/app/`: App Router de Next.js (Rutas públicas y autenticadas).
- `src/components/`: Componentes UI accesibles y afirmativos.
- `supabase/migrations/`: Migraciones SQL ordenadas secuencialmente.

---

## 🤝 Código de Conducta

Mantén una comunicación respetuosa, empática e inclusiva en todos los comentarios de código e Issues.
