# OT-Automation ✈️

Automated flight booking and testing suite for OneTravel built with **Playwright** and **TypeScript**.

---

## 🚀 Features

- **End-to-End Flight Booking Funnel**:
  - Flight search (One-Way route, flexible future date picker).
  - Search results filtering and flight selection.
  - Passenger information submission (name, DOB, gender, phone, email).
  - Dummy credit card & billing details entry.
  - Automated booking submission.
  - **Order ID / Locator Key Capture**: Extracts generated confirmation IDs and persists them to `booking-result.json`.
- **Anti-Bot & WAF Resilience**: Custom stealth headers, humanized pacing, and marketing overlay dismissers.
- **GitHub Actions Parameterized Workflow**: Run tests on-demand with custom inputs directly from your browser without installing anything or touching code.

---

## 🌐 Running via GitHub Actions (Zero Setup)

Anyone with access to this repository can run the test on-demand:

1. Navigate to the **Actions** tab on GitHub.
2. Select **OneTravel Booking Automation** from the left sidebar.
3. Click **Run workflow**.
4. Fill in:
   - **Flight Origin** (e.g. `JFK`)
   - **Flight Destination** (e.g. `MIA`)
   - **Days Ahead** (e.g. `15`)
   - **Traveler Details** (Name, DOB, Email, Phone)
   - **Dummy Card Details**
5. Click **Run workflow**.

### Checking Results & Logs:
- **Order ID & Status**: Displayed in the GitHub Actions run summary dashboard.
- **Logs & Failures**: View live console output in the workflow steps.
- **HTML Report & Screenshots**: Download the `playwright-report` artifact at the bottom of the run page for full screenshots and video replays.

---

## 💻 Local Setup & Execution

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)

### Installation
```bash
npm install
npx playwright install chromium
```

### Running the Test
```bash
# Run in headed mode (watch browser live)
npm run test:headed

# Run in headless mode
npm run test
```
