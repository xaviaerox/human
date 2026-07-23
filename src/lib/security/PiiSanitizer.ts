/**
 * PII Sanitizer for MIRA AI Operations (COPPA / GDPR Compliance).
 * Obfuscates sensitive child and family details before sending prompts to third-party LLMs,
 * and restores them upon receiving the generated response.
 */

export interface SanitizationResult {
  sanitizedText: string;
  replacements: Record<string, string>;
}

export function sanitizePii(
  text: string,
  childName?: string,
  familyName?: string
): SanitizationResult {
  if (!text) {
    return { sanitizedText: '', replacements: {} };
  }

  let sanitized = text;
  const replacements: Record<string, string> = {};

  // 1. Obfuscate Child Name if provided
  if (childName && childName.trim().length > 0) {
    const childRegex = new RegExp(`\\b${escapeRegExp(childName.trim())}\\b`, 'gi');
    if (childRegex.test(sanitized)) {
      replacements['[CHILD_NAME]'] = childName.trim();
      sanitized = sanitized.replace(childRegex, '[CHILD_NAME]');
    }
  }

  // 2. Obfuscate Family Name if provided
  if (familyName && familyName.trim().length > 0) {
    const familyRegex = new RegExp(`\\b${escapeRegExp(familyName.trim())}\\b`, 'gi');
    if (familyRegex.test(sanitized)) {
      replacements['[FAMILY_NAME]'] = familyName.trim();
      sanitized = sanitized.replace(familyRegex, '[FAMILY_NAME]');
    }
  }

  // 3. Obfuscate Email Addresses
  sanitized = sanitized.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[EMAIL]'
  );

  // 4. Obfuscate Phone Numbers
  sanitized = sanitized.replace(
    /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    '[PHONE]'
  );

  return {
    sanitizedText: sanitized,
    replacements,
  };
}

export function restorePii(
  text: string,
  replacements: Record<string, string>
): string {
  if (!text) return '';

  let restored = text;
  for (const [placeholder, original] of Object.entries(replacements)) {
    restored = restored.replaceAll(placeholder, original);
  }

  return restored;
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
