-- ============================================================
-- MIRA — Migration: Seed Values and Companion Evolution Fields
-- ============================================================

-- Add home_visual_state to companions table
ALTER TABLE companions ADD COLUMN IF NOT EXISTS home_visual_state JSONB NOT NULL DEFAULT '{"decor": "basic", "unlocked_themes": ["calm"]}'::JSONB;

-- Upsert and update value dimensions to fit the 6 required emotional growth values
-- Keep same IDs to avoid breaking existing relational keys, but update labels and descriptions.
INSERT INTO value_dimensions (id, label, description) VALUES
  ('autonomy', 'Autonomía', 'Habilidad de tomar decisiones por sí mismo y completar tareas cotidianas.'),
  ('regulation', 'Regulación Emocional', 'Habilidad de reconocer y modular el estado emocional propio.'),
  ('empathy', 'Empatía', 'Habilidad de percibir y responder a las emociones de los demás.'),
  ('connection', 'Constancia', 'Esfuerzo sostenido y perseverancia en las rutinas y retos.'),
  ('courage', 'Valentía', 'Enfrentar miedos y probar cosas nuevas.'),
  ('curiosity', 'Creatividad', 'Resolver retos diarios de forma imaginativa.')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description;
