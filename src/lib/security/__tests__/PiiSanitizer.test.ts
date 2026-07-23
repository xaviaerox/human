import { describe, it, expect } from 'vitest';
import { sanitizePii, restorePii } from '../PiiSanitizer';

describe('PiiSanitizer', () => {
  it('should obfuscate child name and family name in prompt text', () => {
    const prompt = 'Hola Alex, tu familia Garcia está muy orgullosa de ti.';
    const result = sanitizePii(prompt, 'Alex', 'Garcia');

    expect(result.sanitizedText).not.toContain('Alex');
    expect(result.sanitizedText).not.toContain('Garcia');
    expect(result.sanitizedText).toContain('[CHILD_NAME]');
    expect(result.sanitizedText).toContain('[FAMILY_NAME]');
  });

  it('should obfuscate emails and phone numbers', () => {
    const prompt = 'Contacto: padre@mira.app o llama al 600123456';
    const result = sanitizePii(prompt);

    expect(result.sanitizedText).not.toContain('padre@mira.app');
    expect(result.sanitizedText).toContain('[EMAIL]');
  });

  it('should restore original PII back into response text', () => {
    const response = '¡Buen trabajo, [CHILD_NAME]!';
    const replacements = { '[CHILD_NAME]': 'Alex' };
    const restored = restorePii(response, replacements);

    expect(restored).toBe('¡Buen trabajo, Alex!');
  });
});
