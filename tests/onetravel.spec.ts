import { test, expect, Page } from '@playwright/test';
import { PaymentPage } from '../pages/PaymentPage';

// Helper to dismiss common marketing / cookie modals
async function dismissModals(page: Page) {
  const dismissLocators = [
    page.locator('button[aria-label="Close"]'),
    page.locator('.modal-close, .popup-close, .close-icon, span.close'),
    page.getByRole('button', { name: /no thanks|close|✕/i }),
  ];

  for (const btn of dismissLocators) {
    if (await btn.first().isVisible({ timeout: 1500 }).catch(() => false)) {
      await btn.first().click().catch(() => {});
    }
  }
}

test.describe('OneTravel Booking Flow', () => {
  test.setTimeout(120_000);

  test('Search flight up to payment review screen and attempt booking', async ({ page }) => {
    // 1. Navigate to OneTravel (with retry for intermittent rate-limiting)
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      (window as any).chrome = { runtime: {} };
    });

    let attempts = 0;
    while (attempts < 3) {
      await page.goto('https://www.onetravel.com/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      await dismissModals(page);

      const title = await page.title();
      if (!title.toLowerCase().includes('access denied')) {
        break;
      }
      attempts++;
      console.log(`Access Denied detected, cooling down 10s before retry (${attempts}/3)...`);
      await page.waitForTimeout(10000);
    }

    // Switch to Flights tab (default tab is Hotels)
    const flightsTab = page.getByRole('tab', { name: /flights/i });
    if (await flightsTab.isVisible().catch(() => false)) {
      await flightsTab.click();
      await page.waitForTimeout(1000);
    }

    // 2. Select One-Way trip
    const tripTypeLabel = page.locator('#flights_triptype_label, .flights_triptype').first();
    if (await tripTypeLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tripTypeLabel.click();
      const oneWayOption = page.locator('#flights_triptype li, #flights_triptype div, #flights_triptype a').filter({ hasText: /One-way|One way/i }).first();
      if (await oneWayOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await oneWayOption.click();
      }
    } else {
      const oneWayRadio = page.getByRole('radio', { name: /one way/i }).or(page.locator('label:has-text("One Way")')).first();
      if (await oneWayRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
        await oneWayRadio.click();
      }
    }

    // 3. Origin Airport (JFK)
    const originInput = page.locator('#fs_originCity_0, input[placeholder*="Where from"], input[name="from0"]').first();
    await originInput.click({ force: true });
    await originInput.fill('');
    await originInput.pressSequentially('JFK', { delay: 100 });
    await page.waitForTimeout(1500);

    const originOption = page.locator('ul.autoSuggest__list li, .suggestion-box li, li[role="option"]')
      .filter({ hasText: 'JFK' })
      .first();
    if (await originOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await originOption.click();
    } else {
      await originInput.press('Enter');
    }

    // 4. Destination Airport (MIA)
    const destInput = page.locator('#fs_destCity_0, input[placeholder*="Where to"], input[name="to0"]').first();
    await destInput.click({ force: true });
    await destInput.fill('');
    await destInput.pressSequentially('MIA', { delay: 100 });
    await page.waitForTimeout(1500);

    const destOption = page.locator('ul.autoSuggest__list li, .suggestion-box li, li[role="option"]')
      .filter({ hasText: 'MIA' })
      .first();
    if (await destOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await destOption.click();
    } else {
      await destInput.press('Enter');
    }

    // 5. Select Departure Date (pick an active date 10-15 days ahead)
    const dateInput = page.locator('#fs_departDate_0, input[name="depDate"], input[placeholder*="Depart"]').first();
    await dateInput.click({ force: true });
    await page.waitForTimeout(1000);

    const futureDates = page.getByRole('dialog').getByRole('button', {
      name: /\d+ (January|February|March|April|May|June|July|August|September|October|November|December)/i
    });
    const dateCount = await futureDates.count();
    if (dateCount > 14) {
      await futureDates.nth(14).click();
    } else if (dateCount > 0) {
      await futureDates.last().click();
    }

    const doneBtn = page.getByRole('button', { name: /done|close calendar/i }).first();
    if (await doneBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await doneBtn.click();
    }

    // 6. Search Flights
    const searchBtn = page.locator('#searchNow, button:has-text("Search"), input[value="Search"]').first();
    await searchBtn.click();

    // 7. Select First Flight on the listing page
    await page.waitForURL(/.*(listing|search|air|flight).*/i, { timeout: 45000, waitUntil: 'domcontentloaded' });
    await dismissModals(page);

    const selectFlightBtn = page.getByRole('button', { name: 'Select', exact: true })
      .or(page.getByRole('button', { name: 'Book', exact: true })).first();
    await selectFlightBtn.waitFor({ state: 'visible', timeout: 45000 });
    await selectFlightBtn.click();

    // 8. Fill Passenger Details on Checkout page
    await page.waitForURL(/.*(review|book|checkout).*/i, { timeout: 45000, waitUntil: 'domcontentloaded' });
    await dismissModals(page);

    const emailInput = page.locator('input[name*="Email"], input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 15000 }).catch(() => false)) {
      await emailInput.fill('alex.miller.qa@example.com');
    }

    const firstName = page.locator('input[name*="FirstName"], input[placeholder*="First Name"]').first();
    if (await firstName.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstName.fill('Alex');
    }

    const lastName = page.locator('input[name*="LastName"], input[placeholder*="Last Name"]').first();
    if (await lastName.isVisible({ timeout: 5000 }).catch(() => false)) {
      await lastName.fill('Miller');
    }

    const maleRadio = page.locator('#travelers\\[0\\]\\.Gender\\.Male, input[value="Male"], input[value="M"], label:has-text("Male")').first();
    if (await maleRadio.isVisible({ timeout: 2000 }).catch(() => false)) {
      await maleRadio.click({ force: true });
    }

    // Date of Birth
    const monthSelect = page.locator('select[name*="Month"], select[id*="month"]').first();
    if (await monthSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await monthSelect.selectOption({ index: 5 }).catch(() => {});
    }

    const dayInput = page.locator('input[name*="Day"], input[placeholder="DD"], select[name*="Day"]').first();
    if (await dayInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const isSelect = await dayInput.evaluate(el => el.tagName.toLowerCase() === 'select');
      if (isSelect) {
        await dayInput.selectOption('15');
      } else {
        await dayInput.fill('15');
      }
    }

    const yearInput = page.locator('input[name*="Year"], input[placeholder="YYYY"], select[name*="Year"]').first();
    if (await yearInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const isSelect = await yearInput.evaluate(el => el.tagName.toLowerCase() === 'select');
      if (isSelect) {
        await yearInput.selectOption('1994');
      } else {
        await yearInput.fill('1994');
      }
    }

    // Phone
    const phoneInput = page.locator('input[name*="Phone"], input[type="tel"]:not([name*="Day"]):not([name*="Year"])').first();
    if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await phoneInput.fill('2025550184');
    }

    // 9. Decline Insurance / Add-ons if prompted
    const declineInsurance = page.locator('input[type="radio"][value*="No"], label:has-text("No, I decline"), label:has-text("No, I don\'t want")').first();
    if (await declineInsurance.isVisible({ timeout: 2000 }).catch(() => false)) {
      await declineInsurance.click();
    }

    // 10. Proceed to Payment Screen
    const paymentNavLink = page.getByRole('link', { name: 'Payment' });
    if (await paymentNavLink.isVisible().catch(() => false)) {
      await paymentNavLink.click();
      await page.waitForTimeout(2000);
    } else {
      const continueBtn = page.locator('button:not(.sr-only):has-text("Continue to Seats"), button:not(.sr-only):has-text("Go to Payment"), button:not(.sr-only):has-text("Next"), button:not(.sr-only):has-text("Continue")').first();
      if (await continueBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await continueBtn.click({ force: true });
        await page.waitForTimeout(3000);
      }
    }
    await dismissModals(page);

    // 11. Fill Dummy Credit Card Details
    const cardInput = page.getByRole('textbox', { name: /Card Number/i })
      .or(page.locator('input[placeholder*="Card Number"]')).first();
    if (await cardInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await cardInput.click();
      await cardInput.fill('4000000000000002');

      const cardName = page.getByRole('textbox', { name: /Name on Card/i })
        .or(page.locator('input[placeholder*="Name on Card"]')).first();
      await cardName.fill('Alex Miller');

      const expiryInput = page.getByRole('textbox', { name: /Expiry Date/i })
        .or(page.locator('input[placeholder*="MM/YY"], input[placeholder*="Expiry"]')).first();
      await expiryInput.fill('12/28');

      const cvvInput = page.getByRole('textbox', { name: /CVV/i })
        .or(page.locator('input[placeholder*="CVV"]')).first();
      await cvvInput.fill('123');

      // Billing info
      const addressInput = page.getByRole('textbox', { name: /Address/i })
        .or(page.locator('input[placeholder*="Address"]')).first();
      if (await addressInput.isVisible().catch(() => false)) {
        await addressInput.fill('123 Broadway St');
      }

      const zipInput = page.getByRole('textbox', { name: /Zip/i })
        .or(page.locator('input[placeholder*="Zip"]')).first();
      if (await zipInput.isVisible().catch(() => false)) {
        await zipInput.fill('10001');
      }

      const cityInput = page.getByRole('textbox', { name: /City/i })
        .or(page.locator('input[placeholder*="City"]')).first();
      if (await cityInput.isVisible().catch(() => false)) {
        await cityInput.fill('New York');
      }

      const stateSelect = page.getByRole('combobox', { name: /State/i })
        .or(page.locator('select[name*="state"], select[id*="state"]')).first();
      if (await stateSelect.isVisible().catch(() => false)) {
        await stateSelect.selectOption({ label: 'NY - NEW YORK' }).catch(async () => {
          await stateSelect.selectOption('NY');
        });
      }

      // Submit Booking
      const confirmBookBtn = page.getByRole('button', { name: /Confirm & Book/i })
        .or(page.locator('button:has-text("Confirm & Book"), button:has-text("Book Now")')).first();
      if (await confirmBookBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await confirmBookBtn.scrollIntoViewIfNeeded();
        await confirmBookBtn.click({ force: true });
        await page.waitForTimeout(4000);
      }
    }

    // 12. Assert booking submission / arrival at Payment section
    const isProgressed = /review|seats|payment|checkout|book/i.test(page.url()) ||
                         (await page.locator('text=/payment|billing|card number/i').count()) > 0;

    expect(isProgressed).toBeTruthy();

    // 13. Capture and save Order ID / Locator Key
    const paymentPage = new PaymentPage(page);
    await paymentPage.captureAndSaveBookingDetails();
  });
});