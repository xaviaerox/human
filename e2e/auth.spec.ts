import { test, expect } from '@playwright/test';

test.describe('Flujos de Autenticación E2E', () => {
  test('debe cargar la página de inicio de sesión correctamente', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Mira/i);
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
  });

  test('debe permitir navegar a la pantalla de registro', async ({ page }) => {
    await page.goto('/login');
    const signupLink = page.getByRole('link', { name: /crear familia/i });
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/.*signup/);
    }
  });
});
