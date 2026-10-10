import { PassengerInfo } from '../pages/PassengerDetailsPage';
import { CardDetails, BillingDetails } from '../pages/PaymentPage';

export interface BookingTestData {
  flight: {
    origin: string;
    destination: string;
    departureDaysFromNow: number;
  };
  traveler: PassengerInfo;
  payment: {
    card: CardDetails;
    billing: BillingDetails;
  };
}

export function getTestData(): BookingTestData {
  const env = process.env;

  const origin = env.FLIGHT_ORIGIN || 'JFK';
  const destination = env.FLIGHT_DESTINATION || 'MIA';
  const departureDays = parseInt(env.FLIGHT_DEPARTURE_DAYS || '15', 10);

  const firstName = env.TRAVELER_FIRST_NAME || 'Alex';
  const lastName = env.TRAVELER_LAST_NAME || 'Miller';
  const gender = (env.TRAVELER_GENDER || 'Male') as 'Male' | 'Female';
  const dobMonth = env.TRAVELER_DOB_MONTH || '05';
  const dobDay = env.TRAVELER_DOB_DAY || '15';
  const dobYear = env.TRAVELER_DOB_YEAR || '1990';
  const email = env.TRAVELER_EMAIL || 'alex.miller.qa@example.com';
  const phone = env.TRAVELER_PHONE || '2025550184';

  const cardNumber = env.PAYMENT_CARD_NUMBER || '4000000000000002';
  const cardholderName = env.PAYMENT_CARD_HOLDER || `${firstName} ${lastName}`;
  const expiryDate = env.PAYMENT_EXPIRY || '12/28';
  const cvv = env.PAYMENT_CVV || '123';

  const billingAddress = env.BILLING_ADDRESS || '123 Broadway St';
  const billingZip = env.BILLING_ZIP || '10001';
  const billingCity = env.BILLING_CITY || 'New York';
  const billingState = env.BILLING_STATE || 'NY - NEW YORK';

  return {
    flight: {
      origin,
      destination,
      departureDaysFromNow: isNaN(departureDays) ? 15 : departureDays,
    },
    traveler: {
      firstName,
      lastName,
      gender,
      dobMonth,
      dobDay,
      dobYear,
      email,
      phone,
    },
    payment: {
      card: {
        cardNumber,
        cardholderName,
        expiryDate,
        cvv,
      },
      billing: {
        address: billingAddress,
        zip: billingZip,
        city: billingCity,
        state: billingState,
        phone,
      },
    },
  };
}
