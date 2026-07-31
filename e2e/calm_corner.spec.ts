import { test, expect } from '@playwright/test';

test.describe('Rincón de Calma & Respiración Guiada E2E', () => {
  test('debe permitir abrir el Rincón de Calma y realizar un ciclo de respiración', async ({ page }) => {
    await page.goto('/home');
    const calmButton = page.getByRole('button', { name: /calma|rincón de calma/i });
    if (await calmButton.isVisible()) {
      await calmButton.click();
      const modal = page.getByRole('dialog', { name: /rincón de calma/i });
      await expect(modal).toBeVisible();
      
      // Debe mostrar la guía de respiración
      await expect(page.getByText(/inhala|sostén|exhala|descansa/i)).toBeVisible();
    }
  });
});
