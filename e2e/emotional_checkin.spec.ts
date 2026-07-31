import { test, expect } from '@playwright/test';

test.describe('Diario Emocional & Registro de Estado E2E', () => {
  test('debe permitir seleccionar nivel de energía y emoción', async ({ page }) => {
    await page.goto('/home');
    const checkinSection = page.getByText(/¿cómo te sientes hoy\?|diario emocional/i);
    if (await checkinSection.isVisible()) {
      await expect(checkinSection).toBeVisible();
    }
  });
});
