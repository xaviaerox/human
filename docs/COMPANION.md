# Mira — Companion System

The companion is the emotional core of Mira. Every implementation decision affecting it requires extra scrutiny.

---

## Design constraints (non-negotiable)

1. **Faceless abstract blob** — no human features, no cultural signifiers, no gender. This eliminates cultural bias and the uncanny valley effect.
2. **Stage never regresses** — enforced at DB trigger level AND client-side in `CompanionEngine.advanceStage()`. A child returning after absence finds their companion exactly where they left it.
3. **Emotional responsiveness has a floor of 10** — the companion never becomes completely unresponsive. Framed as "still learning to understand you."
4. **Raw bonding_score is never shown to the child** — `toDisplayState()` omits it. The child sees stage and stageProgress (0–1), but never numbers.
5. **Companion does not appear during active tasks** — `shouldCompanionAppear('routine_active')` returns `false`. No distraction.
6. **Companion never uses urgency or guilt** — the dialogue bank contains zero lines like "I miss you" or "You haven't visited."
7. **Companion is not in the parent dashboard** — this is adult space.

---

## Lifecycle stages

| Stage | Bonding range | Character quality | Dialogue range |
|---|---|---|---|
| `egg` | 0–24 | Dormant, gentle pulse | Minimal symbols: `...`, `✦`, `~ ~` |
| `sprout` | 25–74 | Small curious movements | Simple words, short sentences |
| `bloom` | 75–174 | Fluid, expressive | Warm, complete thoughts |
| `glow` | 175–349 | Luminous, dynamic | Deep emotional range |
| `radiant` | 350+ | Full presence | Profound attunement |

Each stage has a distinct **animation vocabulary** in the dialogue bank (`animationCue` field):
- `pulse_dormant` (egg idle)
- `sway_small` (sprout idle)
- `breathe` (bloom idle)
- `glow_pulse` (glow idle)
- `radiate` (radiant idle)
- `pulse_gentle` (difficult emotion — any stage)
- `bloom_brief` (routine complete — any stage)
- `float_up` (celebration — any stage)

The UI layer maps these keys to CSS animations or SVG transitions.

---

## Bonding score deltas

| Interaction | Delta |
|---|---|
| `routine_complete` | +2 |
| `emotional_checkin` | +3 |
| `goal_step_complete` | +2 |
| `free_interaction` | +1 |
| `spark_received` | +1 |
| `name_given` (onboarding) | +5 (initial boost) |

These are defined in `BONDING_DELTAS` in `CompanionEngine.ts` and mirrored in the DB trigger.

---

## Emotional responsiveness

- Range: 10–100 (never zero)
- Increases: +5 per emotional check-in (capped at 100)
- Decays: −2 per nightly run of `decay_emotional_responsiveness()` for children with no check-in in 48h
- Floor: 10 — structural guarantee against abandonment anxiety

**Effect on dialogue:** High responsiveness unlocks richer, more attuned dialogue variants. The dialogue bank uses `responsivenessLevel()` to select between variant sets. Currently three tiers: `low`, `medium`, `high`.

This is not yet fully wired into the dialogue bank — the current bank selects by stage only. Future work: add responsiveness-tiered variants within each stage.

---

## Personality traits

Traits unlock based on interaction patterns, not achievements. They emerge naturally.

| Trait | Required stage | Unlock condition |
|---|---|---|
| `curious` | sprout | 5 routine completions |
| `gentle` | sprout | 3 emotional check-ins |
| `playful` | bloom | 5 free interactions |
| `brave` | bloom | 5 goal step completions |
| `warm` | glow | 15 check-ins AND 20 routine completions |

Traits are stored in `companions.personality_traits TEXT[]`.

**Traits are displayed to the child as descriptions of the companion**, not as achievements or badges. "Your companion is curious and gentle."

Future: use traits to influence dialogue selection (a `curious` companion uses more wondering/questioning language).

---

## Dialogue system

### Selection hierarchy

```
selectDialogue(ctx: DialogueContext) → DialogueLine

1. Is child emotion low valence (≤ 2)? → route to 'difficult_emotion' regardless of trigger
2. Look up BANK[stage][trigger]
3. Fallback to BANK[stage]['idle_presence']
4. Final fallback: "I'm here."
```

### Variation mechanism

Lines are selected by `(seed % lines.length)` where seed = current hour. This means:
- Different trigger at same hour = different line (different trigger array)
- Same trigger at same hour = same line (consistent within a session)
- Same trigger next hour = potentially different line (natural variation)

This prevents the jarring "same response every time" problem while avoiding pure randomness.

### Adding dialogue

When adding lines to `DialogueBank.ts`:

1. Choose the correct stage. Egg lines are minimal (< 10 chars). Radiant lines are deep and personal.
2. No urgency language.
3. No conditional affirmation ("good job IF you...").
4. Difficult emotion lines must hold the feeling, not dismiss or fix it.
5. No references to time elapsed or absence.
6. Test with `selectDialogue()` across all stages.

### Dialogue triggers

| Trigger | When fired |
|---|---|
| `greeting` | App open, home screen render |
| `routine_complete` | After marking routine done |
| `goal_step_complete` | After completing a microtask |
| `checkin_prompt` | When prompting child for check-in |
| `checkin_response` | After child submits check-in |
| `idle_presence` | Ambient, no specific event |
| `difficult_emotion` | Auto-routed when valence ≤ 2 |
| `celebration` | Goal completion, milestone |
| `name_chosen` | Onboarding — companion named |

---

## Onboarding flow

The companion starts as `stage: 'egg'`, `name: null`. The onboarding flow must:

1. Present the egg visually (pulsing blob)
2. Ask child to give it a name (free text input, no suggestions)
3. Call `companionAdapter.createCompanion(childId, name)` via `createCompanion()` in context
4. This calls `create_companion()` DB function which:
   - Inserts companion with `bonding_score: 5` (naming boost)
   - Logs `name_given` interaction
5. Show companion responding with `name_chosen` dialogue
6. Call `updateProfile({ onboarding_complete: true })`

Do not allow the child to proceed past onboarding without naming the companion. `profile.onboarding_complete = false` gates the main app.

---

## Appearance rules in practice

```tsx
// In a component
const { isVisible, getDialogue, setAppearanceContext } = useCompanion();

useEffect(() => {
  setAppearanceContext('routine_complete');
  return () => setAppearanceContext('home');
}, []);

// Companion only renders if isVisible is true
return isVisible ? <CompanionWidget dialogue={getDialogue('routine_complete')} /> : null;
```

Never render the companion without checking `isVisible`. The parent view must not show it.

---

## What the companion is NOT

- Not a reward mechanism ("collect the companion!")
- Not a notification hook ("your companion is waiting")
- Not a performance judge ("your companion is sad because you missed a routine")
- Not a social element ("your companion vs. friends' companions")
- Not a character with a fixed personality that the child must adapt to

The companion adapts to the child — not the reverse.
