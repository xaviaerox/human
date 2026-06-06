-- Migration: Avatar and Companion Customization
-- Agregar columnas para guardar accesorios desbloqueados, activos y esquemas de color para avatares y compañeros.

-- 1. Modificar la tabla profiles (avatares del niño)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS unlocked_accessories TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS avatar_accessory TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS avatar_base_emoji TEXT NOT NULL DEFAULT '🦊';

-- 2. Modificar la tabla companions (personalización del compañero)
ALTER TABLE public.companions
ADD COLUMN IF NOT EXISTS equipped_accessory TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS equipped_color_theme TEXT DEFAULT NULL;
