import { Page, Locator } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  /**
   * Masks automation fingerprints before navigation
   */
  async applyStealth() {
    await this.page.addInitScript(() => {
      // Hide navigator.webdriver flag
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Provide mock chrome runtime object
      (window as any).chrome = {
        runtime: {},
        loadTimes: function () {},
        csi: function () {},
        app: {},
      };

      // Mock languages and plugins
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
    });
  }

  /**
   * Helper to close promotional popups/modals if they appear
   */
  async closeMarketingPopups() {
    const closeButtons = [
      this.page.locator('button[aria-label="Close"]'),
      this.page.locator('.modal-close, .popup-close, .close-icon'),
      this.page.getByRole('button', { name: /no thanks|close|✕/i }),
    ];

    for (const btn of closeButtons) {
      if (await btn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.first().click().catch(() => {});
      }
    }
  }
}