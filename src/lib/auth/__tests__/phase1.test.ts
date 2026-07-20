import { describe, it, expect, beforeEach } from 'vitest';
import { StaticAuthAdapter } from '../StaticAuthAdapter';

describe('StaticAuthAdapter (Phase 1)', () => {
  let adapter: StaticAuthAdapter;

  beforeEach(() => {
    adapter = new StaticAuthAdapter();
  });

  describe('signUpParent', () => {
    it('creates a new parent profile and family', async () => {
      const res = await adapter.signUpParent({
        email: 'test@mira.app',
        password: 'password123',
        display_name: 'Parent Demo',
        family_name: 'Mira Family',
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.profile.role).toBe('parent');
        expect(res.data.profile.display_name).toBe('Parent Demo');
        expect(res.data.family.name).toBe('Mira Family');
      }
    });
  });

  describe('signIn', () => {
    it('authenticates demo parent user', async () => {
      const res = await adapter.signIn({ email: 'parent@mira.app', password: 'demo1234' });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.profile.role).toBe('parent');
      }
    });
  });

  describe('signOut', () => {
    it('clears active session', async () => {
      await adapter.signIn({ email: 'parent@mira.app', password: 'demo1234' });
      const res = await adapter.signOut();
      expect(res.ok).toBe(true);
      const sessionRes = await adapter.getSession();
      expect(sessionRes).toBeNull();
    });
  });
});
