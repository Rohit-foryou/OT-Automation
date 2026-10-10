import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly flightsTab: Locator;
  readonly originInput: Locator;
  readonly destinationInput: Locator;
  readonly searchButton: Locator;
  readonly tripTypeLabel: Locator;
  readonly tripTypeDropdown: Locator;
  readonly departDateInput: Locator;

  constructor(page: Page) {
    super(page);
    this.flightsTab = page.getByRole('tab', { name: /flights/i });
    this.tripTypeLabel = page.locator('#flights_triptype_label, .flights_triptype').first();
    this.tripTypeDropdown = page.locator('#flights_triptype');
    this.originInput = page.locator('#fs_originCity_0, input[placeholder*="Where from"], input[name="from0"]').first();
    this.destinationInput = page.locator('#fs_destCity_0, input[placeholder*="Where to"], input[name="to0"]').first();
    this.departDateInput = page.locator('#fs_departDate_0, input[name="depDate"], input[placeholder*="Depart"]').first();
    this.searchButton = page.locator('#searchNow, button:has-text("Search"), input[value="Search"]').first();
  }

  async navigate() {
    await this.applyStealth();

    let attempts = 0;
    while (attempts < 3) {
      await this.page.goto('https://www.onetravel.com/', { waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
      await this.closeMarketingPopups();

      const title = await this.page.title();
      if (!title.toLowerCase().includes('access denied')) {
        break;
      }
      attempts++;
      console.log(`Access Denied detected, cooling down 10s before retry (${attempts}/3)...`);
      await this.page.waitForTimeout(10000);
    }

    // Ensure Flights tab is selected (default landing is Hotels)
    if (await this.flightsTab.isVisible().catch(() => false)) {
      await this.flightsTab.click();
      await this.page.waitForTimeout(1000);
    }
  }

  async selectOneWay() {
    try {
      if (await this.tripTypeLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
        await this.tripTypeLabel.click();
        const oneWayOption = this.tripTypeDropdown.locator('li, div, a').filter({ hasText: /One-way|One way/i }).first();
        if (await oneWayOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await oneWayOption.click();
          return;
        }
      }
    } catch {
      // Fallback
    }

    const oneWayRadio = this.page.getByRole('radio', { name: /one way/i }).or(this.page.locator('label:has-text("One Way")')).first();
    if (await oneWayRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
      await oneWayRadio.click();
    }
  }

  async enterOrigin(airportCode: string) {
    await this.originInput.click({ force: true });
    await this.originInput.fill('');
    await this.originInput.pressSequentially(airportCode, { delay: 100 });
    await this.page.waitForTimeout(1500);

    const suggestion = this.page.locator('ul.autoSuggest__list li, .suggestion-box li, li[role="option"]')
      .filter({ hasText: airportCode })
      .first();

    if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
      await suggestion.click();
    } else {
      await this.originInput.press('Enter');
    }
  }

  async enterDestination(airportCode: string) {
    await this.destinationInput.click({ force: true });
    await this.destinationInput.fill('');
    await this.destinationInput.pressSequentially(airportCode, { delay: 100 });
    await this.page.waitForTimeout(1500);

    const suggestion = this.page.locator('ul.autoSuggest__list li, .suggestion-box li, li[role="option"]')
      .filter({ hasText: airportCode })
      .first();

    if (await suggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
      await suggestion.click();
    } else {
      await this.destinationInput.press('Enter');
    }
  }

  async selectDepartureDateDaysFromNow(daysInFuture: number = 14) {
    await this.departDateInput.click({ force: true });
    await this.page.waitForTimeout(1000);

    const futureDateButtons = this.page.getByRole('dialog').getByRole('button', {
      name: /\d+ (January|February|March|April|May|June|July|August|September|October|November|December)/i
    });

    const count = await futureDateButtons.count();
    if (count > daysInFuture) {
      await futureDateButtons.nth(daysInFuture).click();
    } else if (count > 0) {
      await futureDateButtons.last().click();
    }

    const doneButton = this.page.getByRole('button', { name: /done|close calendar/i }).first();
    if (await doneButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await doneButton.click();
    }
  }

  async searchFlights() {
    await this.searchButton.click();
  }
}