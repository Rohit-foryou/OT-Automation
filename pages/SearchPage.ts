import { Locator, Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class SearchResultsPage extends BasePage {
  readonly flightCards: Locator;
  readonly selectFlightButtons: Locator;

  constructor(page: Page) {
    super(page);
    this.flightCards = page.locator('.listing26-card, .contract-card, .listing-card, [data-testid="flight-card"]');
    // Using exact: true prevents matching sidebar buttons like "Select All"
    this.selectFlightButtons = page.getByRole('button', { name: 'Select', exact: true })
      .or(page.getByRole('button', { name: 'Book', exact: true }));
  }

  async waitForResults() {
    await this.closeMarketingPopups();
    // Wait for URL transition to air listing using domcontentloaded
    await this.page.waitForURL(/.*(listing|search|air|flight).*/i, { timeout: 45000, waitUntil: 'domcontentloaded' });
    // Wait for flight options to render
    await this.selectFlightButtons.first().waitFor({ state: 'visible', timeout: 45000 });
  }

  async selectFirstAvailableFlight() {
    await this.selectFlightButtons.first().click();
    await this.closeMarketingPopups();
    // Wait for transition to booking review / checkout screen
    await this.page.waitForURL(/.*(review|book|checkout).*/i, { timeout: 45000, waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(3000);
  }
}