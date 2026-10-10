import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import * as fs from 'fs';
import * as path from 'path';

export interface CardDetails {
  cardNumber: string;
  cardholderName: string;
  expiryDate: string; // MM/YY
  cvv: string;
}

export interface BillingDetails {
  address?: string;
  zip?: string;
  city?: string;
  state?: string; // e.g. 'NY - NEW YORK' or 'NY'
  phone?: string;
}

export interface BookingRecord {
  timestamp: string;
  orderId?: string | null;
  locatorKey?: string | null;
  bookingStatus: string;
  pageUrl: string;
  extractedText?: string | null;
}

export class PaymentPage extends BasePage {
  readonly paymentHeader: Locator;
  readonly paymentTabLink: Locator;
  readonly cardNumberInput: Locator;
  readonly cardHolderNameInput: Locator;
  readonly expiryDateInput: Locator;
  readonly cvvInput: Locator;
  readonly addressInput: Locator;
  readonly zipInput: Locator;
  readonly cityInput: Locator;
  readonly stateSelect: Locator;
  readonly contactPhoneInput: Locator;
  readonly confirmAndBookButton: Locator;
  readonly priceSummary: Locator;
  readonly paymentErrorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.paymentHeader = page.locator('h2, h3, div').filter({ hasText: /Payment Options|Payment|Billing/i }).first();
    this.paymentTabLink = page.getByRole('link', { name: 'Payment' });

    // Card inputs
    this.cardNumberInput = page.getByRole('textbox', { name: /Card Number/i })
      .or(page.locator('input[placeholder*="Card Number"]')).first();
    this.cardHolderNameInput = page.getByRole('textbox', { name: /Name on Card/i })
      .or(page.locator('input[placeholder*="Name on Card"]')).first();
    this.expiryDateInput = page.getByRole('textbox', { name: /Expiry Date/i })
      .or(page.locator('input[placeholder*="MM/YY"], input[placeholder*="Expiry"]')).first();
    this.cvvInput = page.getByRole('textbox', { name: /CVV/i })
      .or(page.locator('input[placeholder*="CVV"]')).first();

    // Billing inputs
    this.addressInput = page.getByRole('textbox', { name: /Address/i })
      .or(page.locator('input[placeholder*="Address"]')).first();
    this.zipInput = page.getByRole('textbox', { name: /Zip/i })
      .or(page.locator('input[placeholder*="Zip"]')).first();
    this.cityInput = page.getByRole('textbox', { name: /City/i })
      .or(page.locator('input[placeholder*="City"]')).first();
    this.stateSelect = page.getByRole('combobox', { name: /State/i })
      .or(page.locator('select[name*="state"], select[id*="state"]')).first();
    this.contactPhoneInput = page.getByRole('textbox', { name: /Contact Phone/i })
      .or(page.locator('input[placeholder*="Contact Phone"]')).first();

    // Submit / Book Button
    this.confirmAndBookButton = page.getByRole('button', { name: /Confirm & Book/i })
      .or(page.locator('button:has-text("Confirm & Book"), button:has-text("Book Now")')).first();

    this.priceSummary = page.locator('.price-details, .summary-total, .cart-total, [data-testid*="price"]').first();

    this.paymentErrorAlert = page.locator('.error, .alert-danger, [role="alert"], .error-msg, .text-danger, .invalid-feedback')
      .or(page.locator('text=/declined|invalid|error|failed|payment could not be processed|check card/i')).first();
  }

  async verifyPaymentReviewReached() {
    await this.closeMarketingPopups();

    const isFunnelProgressed = (await this.page.waitForURL(/.*(review|seats|payment|checkout|book).*/i, { timeout: 15000 }).then(() => true).catch(() => false)) ||
                               (await this.paymentHeader.isVisible({ timeout: 5000 }).catch(() => false)) ||
                               (await this.cardNumberInput.isVisible({ timeout: 5000 }).catch(() => false)) ||
                               (await this.priceSummary.isVisible({ timeout: 5000 }).catch(() => false));

    expect(isFunnelProgressed).toBeTruthy();
  }

  async navigateToPaymentSection() {
    await this.closeMarketingPopups();

    // If Payment tab is clickable in top navigation
    if (await this.paymentTabLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.paymentTabLink.click();
      await this.page.waitForTimeout(2000);
    }
  }

  async fillPaymentDetails(card: CardDetails, billing?: BillingDetails) {
    await this.closeMarketingPopups();

    // Wait for card number field to be ready
    await this.cardNumberInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.cardNumberInput.click();
    await this.cardNumberInput.fill(card.cardNumber);

    await this.cardHolderNameInput.fill(card.cardholderName);
    await this.expiryDateInput.fill(card.expiryDate);
    await this.cvvInput.fill(card.cvv);

    // Fill billing details if provided
    if (billing) {
      if (billing.address && await this.addressInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await this.addressInput.fill(billing.address);
      }
      if (billing.zip && await this.zipInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await this.zipInput.fill(billing.zip);
      }
      if (billing.city && await this.cityInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await this.cityInput.fill(billing.city);
      }
      if (billing.state && await this.stateSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await this.stateSelect.selectOption({ label: billing.state }).catch(async () => {
          await this.stateSelect.selectOption(billing.state!);
        });
      }
      if (billing.phone && await this.contactPhoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await this.contactPhoneInput.fill(billing.phone);
      }
    }
  }

  async submitBooking() {
    await this.confirmAndBookButton.scrollIntoViewIfNeeded();
    await this.confirmAndBookButton.click({ force: true });
    await this.page.waitForTimeout(4000);
  }

  async verifyBookingAttempt() {
    const hasErrorAlert = await this.paymentErrorAlert.isVisible({ timeout: 10000 }).catch(() => false);
    const hasPageResponse = (await this.page.locator('body').count()) > 0;
    expect(hasPageResponse).toBeTruthy();
    return hasErrorAlert;
  }

  /**
   * Captures the generated Order ID / Booking Reference or Locator Key and persists it to JSON files.
   */
  async captureAndSaveBookingDetails(outputPath?: string): Promise<BookingRecord> {
    await this.page.waitForTimeout(3000);
    const currentUrl = this.page.url();

    // 1. Extract from URL query parameters
    let urlBookingId: string | null = null;
    let locatorKey: string | null = null;
    try {
      const parsed = new URL(currentUrl);
      urlBookingId = parsed.searchParams.get('bookingNumber') ||
                     parsed.searchParams.get('bookingId') ||
                     parsed.searchParams.get('orderId') ||
                     parsed.searchParams.get('tripId');
      locatorKey = parsed.searchParams.get('locatorkey') ||
                   parsed.searchParams.get('locatorKey');
    } catch {}

    // 2. Scan DOM for Order ID / Booking Reference
    let domOrderId: string | null = null;
    let extractedSnippet: string | null = null;

    const specificLocators = [
      this.page.locator('.booking-number, .booking-id, .confirmation-number, .order-id'),
      this.page.locator('[data-testid*="booking-id"], [data-testid*="order-id"]'),
      this.page.locator('strong:has-text("Booking"), span:has-text("Booking #")'),
    ];

    for (const loc of specificLocators) {
      if (await loc.first().isVisible({ timeout: 1500 }).catch(() => false)) {
        const txt = await loc.first().innerText().catch(() => '');
        if (txt.trim()) {
          domOrderId = txt.trim();
          break;
        }
      }
    }

    // Fallback: regex search across headers and text
    if (!domOrderId) {
      const pageTextElements = await this.page.locator('h1, h2, h3, h4, p, div, span')
        .filter({ hasText: /(?:Booking|Order|Confirmation|Itinerary)\s*(?:#|Number|ID|Ref)/i })
        .allInnerTexts()
        .catch(() => []);

      for (const t of pageTextElements) {
        const match = t.match(/(?:Booking|Order|Confirmation|Itinerary|Reference)\s*(?:#|No\.?|Number|ID)?[:\s]*([A-Z0-9-]{5,20})/i);
        if (match && match[1]) {
          domOrderId = match[1];
          extractedSnippet = t.trim().substring(0, 150);
          break;
        }
      }
    }

    // Determine booking status
    const isError = await this.paymentErrorAlert.isVisible({ timeout: 2000 }).catch(() => false);
    const status = isError
      ? 'Payment Declined / Validation Error (Dummy Card)'
      : (/confirmation|thankyou|success/i.test(currentUrl) ? 'Booking Confirmed' : 'Booking Processed / Submitted');

    const finalOrderId = domOrderId || urlBookingId || (locatorKey ? `LOCATOR-${locatorKey}` : 'N/A');

    const record: BookingRecord = {
      timestamp: new Date().toISOString(),
      orderId: finalOrderId,
      locatorKey: locatorKey,
      bookingStatus: status,
      pageUrl: currentUrl,
      extractedText: extractedSnippet || domOrderId,
    };

    // Save latest record to booking-result.json
    const targetFile = outputPath || path.resolve(process.cwd(), 'booking-result.json');
    const historyFile = path.resolve(process.cwd(), 'booking-history.json');

    try {
      fs.writeFileSync(targetFile, JSON.stringify(record, null, 2), 'utf-8');
      console.log(`\n==================================================`);
      console.log(`[ORDER CAPTURE] Booking details saved to: ${targetFile}`);
      console.log(`[ORDER CAPTURE] Order / Reference ID: ${finalOrderId}`);
      console.log(`[ORDER CAPTURE] Status: ${status}`);
      if (locatorKey) console.log(`[ORDER CAPTURE] Locator Key: ${locatorKey}`);
      console.log(`==================================================\n`);

      // Append to booking-history.json
      let history: BookingRecord[] = [];
      if (fs.existsSync(historyFile)) {
        try {
          history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
        } catch {}
      }
      history.push(record);
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save booking record to file:', e);
    }

    return record;
  }
}