-- ============================================================
-- MIRA — Migration: Seed Values and Companion Evolution Fields
-- ============================================================

-- Add home_visual_state to companions table
ALTER TABLE companions ADD COLUMN IF NOT EXISTS home_visual_state JSONB NOT NULL DEFAULT '{"decor": "basic", "unlocked_themes": ["calm"]}'::JSONB;

-- Upsert and update value dimensions to fit the 6 required emotional growth values
-- Keep same IDs to avoid breaking existing relational keys, but update labels and descriptions.
INSERT INTO value_dimensions (id, label, description, icon_key, color_token) VALUES
  ('autonomy', 'Autonomía', 'Habilidad de tomar decisiones por sí mismo y completar tareas cotidianas.', 'hand', '--color-autonomy'),
  ('regulation', 'Regulación Emocional', 'Habilidad de reconocer y modular el estado emocional propio.', 'wave', '--color-regulation'),
  ('empathy', 'Empatía', 'Habilidad de percibir y responder a las emociones de los demás.', 'heart', '--color-empathy'),
  ('connection', 'Constancia', 'Esfuerzo sostenido y perseverancia en las rutinas y retos.', 'link', '--color-connection'),
  ('courage', 'Valentía', 'Enfrentar miedos y probar cosas nuevas.', 'star', '--color-courage'),
  ('curiosity', 'Creatividad', 'Resolver retos diarios de forma imaginativa.', 'sparkle', '--color-curiosity')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;
