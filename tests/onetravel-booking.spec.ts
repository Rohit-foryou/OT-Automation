import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { PassengerDetailsPage } from '../pages/PassengerDetailsPage';
import { PaymentPage } from '../pages/PaymentPage';
import { getTestData } from '../config/testData';

test.describe('OneTravel - Flight Booking Funnel', () => {
  // OTAs have network heavy pages and multiple redirect steps
  test.setTimeout(120_000);

  test('E2E: Search flight and proceed through dummy payment booking', async ({ page }) => {
    const testData = getTestData();
    const homePage = new HomePage(page);
    const searchResultsPage = new SearchResultsPage(page);
    const passengerPage = new PassengerDetailsPage(page);
    const paymentPage = new PaymentPage(page);

    await test.step('1. Navigate and search for One-Way flight', async () => {
      await homePage.navigate();
      await homePage.selectOneWay();
      await homePage.enterOrigin(testData.flight.origin);
      await homePage.enterDestination(testData.flight.destination);
      await homePage.selectDepartureDateDaysFromNow(testData.flight.departureDaysFromNow);
      await homePage.searchFlights();
    });

    await test.step('2. Select flight from search results', async () => {
      await searchResultsPage.waitForResults();
      await searchResultsPage.selectFirstAvailableFlight();
    });

    await test.step('3. Fill passenger and contact information', async () => {
      await passengerPage.fillTravelerDetails(testData.traveler);
      await passengerPage.proceedToPayment();
    });

    await test.step('4. Verify arrival at Payment Review screen', async () => {
      await paymentPage.verifyPaymentReviewReached();
      await paymentPage.navigateToPaymentSection();
    });

    await test.step('5. Fill dummy credit card and billing details', async () => {
      await paymentPage.fillPaymentDetails(testData.payment.card, testData.payment.billing);
    });

    await test.step('6. Submit booking and verify response', async () => {
      await paymentPage.submitBooking();
      await paymentPage.verifyBookingAttempt();
      await paymentPage.captureAndSaveBookingDetails();
    });
  });
});