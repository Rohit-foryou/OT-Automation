import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export interface PassengerInfo {
  firstName: string;
  middleName?: string;
  lastName: string;
  gender: 'Male' | 'Female';
  dobMonth: string; // e.g., '05' or 'May'
  dobDay: string;   // e.g., '15'
  dobYear: string;  // e.g., '1992'
  email: string;
  phone: string;
}

export class PassengerDetailsPage extends BasePage {
  readonly emailInput: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly genderMaleRadio: Locator;
  readonly genderFemaleRadio: Locator;
  readonly dobMonthSelect: Locator;
  readonly dobDayInput: Locator;
  readonly dobYearInput: Locator;
  readonly phoneInput: Locator;
  readonly declineInsuranceRadio: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('input[name*="Email"], input[type="email"]').first();
    this.firstNameInput = page.locator('input[name*="FirstName"], input[placeholder*="First Name"]').first();
    this.lastNameInput = page.locator('input[name*="LastName"], input[placeholder*="Last Name"]').first();

    this.genderMaleRadio = page.locator('#travelers\\[0\\]\\.Gender\\.Male, input[value="Male"], input[value="M"], label:has-text("Male")').first();
    this.genderFemaleRadio = page.locator('#travelers\\[0\\]\\.Gender\\.Female, input[value="Female"], input[value="F"], label:has-text("Female")').first();

    this.dobMonthSelect = page.locator('select[name*="Month"], select[id*="month"]').first();
    this.dobDayInput = page.locator('input[name*="Day"], input[placeholder="DD"], select[name*="Day"]').first();
    this.dobYearInput = page.locator('input[name*="Year"], input[placeholder="YYYY"], select[name*="Year"]').first();

    this.phoneInput = page.locator('input[name*="Phone"], input[type="tel"]:not([name*="Day"]):not([name*="Year"])').first();
    this.declineInsuranceRadio = page.locator('input[type="radio"][value*="No"], label:has-text("No, I don\'t want"), label:has-text("No, I decline")').first();
  }

  async fillTravelerDetails(info: PassengerInfo) {
    await this.closeMarketingPopups();

    // 1. Contact Email
    if (await this.emailInput.isVisible({ timeout: 15000 }).catch(() => false)) {
      await this.emailInput.fill(info.email);
    }

    // 2. Names
    if (await this.firstNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.firstNameInput.fill(info.firstName);
    }
    if (await this.lastNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.lastNameInput.fill(info.lastName);
    }

    // 3. Gender
    if (info.gender === 'Male' && await this.genderMaleRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.genderMaleRadio.click({ force: true });
    } else if (info.gender === 'Female' && await this.genderFemaleRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.genderFemaleRadio.click({ force: true });
    }

    // 4. Date of Birth
    if (await this.dobMonthSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.dobMonthSelect.selectOption({ index: 5 }).catch(async () => {
        await this.dobMonthSelect.selectOption(info.dobMonth);
      });
    }

    if (await this.dobDayInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const isSelect = await this.dobDayInput.evaluate(el => el.tagName.toLowerCase() === 'select');
      if (isSelect) {
        await this.dobDayInput.selectOption(info.dobDay);
      } else {
        await this.dobDayInput.fill(info.dobDay);
      }
    }

    if (await this.dobYearInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const isSelect = await this.dobYearInput.evaluate(el => el.tagName.toLowerCase() === 'select');
      if (isSelect) {
        await this.dobYearInput.selectOption(info.dobYear);
      } else {
        await this.dobYearInput.fill(info.dobYear);
      }
    }

    // 5. Phone if present
    if (await this.phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.phoneInput.fill(info.phone);
    }

    // 6. Insurance opt-out if present
    if (await this.declineInsuranceRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.declineInsuranceRadio.click();
    }
  }

  async proceedToPayment() {
    await this.closeMarketingPopups();

    const proceedBtn = this.page.locator('button:not(.sr-only):has-text("Continue to Seats"), button:not(.sr-only):has-text("Go to Payment"), button:not(.sr-only):has-text("Next"), button:not(.sr-only):has-text("Continue")').first();
    if (await proceedBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await proceedBtn.click({ force: true });
      await this.page.waitForTimeout(3000);
    }

    // Handle any secondary intermediate step (e.g. Seats selection screen, upsell Next button)
    const intermediateButton = this.page.locator('button:not(.sr-only):has-text("Next"), button:not(.sr-only):has-text("Continue to Payment"), button:not(.sr-only):has-text("Skip")').first();
    if (await intermediateButton.isVisible({ timeout: 4000 }).catch(() => false)) {
      await intermediateButton.click({ force: true });
      await this.page.waitForTimeout(3000);
    }

    await this.closeMarketingPopups();
  }
}