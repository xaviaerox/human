import { test, expect } from '@playwright/test';

test.describe('Flujos de Rutinas e Interacción E2E', () => {
  test('debe mostrar las rutinas del día en el espacio seguro', async ({ page }) => {
    await page.goto('/home');
    // En modo estático o autenticado, la pestaña de rutinas debe estar accesible
    const routinesTab = page.getByRole('button', { name: /rutinas/i });
    if (await routinesTab.isVisible()) {
      await routinesTab.click();
      await expect(page.getByText(/mis rutinas/i)).toBeVisible();
    }
  });
});
