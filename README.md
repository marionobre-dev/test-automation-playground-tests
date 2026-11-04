# Test Automation Playground: Playwright Suite

[![Playwright tests](https://github.com/marionobre-dev/test-automation-playground-tests/actions/workflows/tests.yml/badge.svg)](https://github.com/marionobre-dev/test-automation-playground-tests/actions/workflows/tests.yml)

End-to-end UI and API tests for [Mario's Test Automation Playground](https://testautomation.marionobre.com/), written in TypeScript with [Playwright](https://playwright.dev/).

The app lives in its own repository ([test-automation-playground](https://github.com/marionobre-dev/test-automation-playground)). This suite tests it from the outside, the way a QA team tests a deployed environment.

## Setup

Requires Node.js 20+.

```bash
npm install
npx playwright install chromium
```

## Running

| Command | What it does |
| --- | --- |
| `npm test` | All tests (UI + API) against the live site |
| `npm run test:ui` | Browser tests only |
| `npm run test:api` | API tests only |
| `npm run test:headed` | Browser tests with a visible browser |
| `npm run test:debug` | Step through tests in the Playwright Inspector |
| `npm run report` | Open the last HTML report |

### Choosing the environment

Tests target the live site by default. Set `BASE_URL` to point them elsewhere:

```powershell
$env:BASE_URL = "http://localhost:8080"; npm run test:ui
```

(Locally the app is served by `scripts/serve.ps1` in the app repo. The PHP API only runs on the deployed site, so run API tests against it.)

### API sandboxes

Every run sends an `X-Sandbox-Id` header (`pw-<run id>`), so it gets a private copy of the API data, and the tests reset it before starting. Set `SANDBOX_ID` to reuse a specific sandbox.

## Continuous integration

[`.github/workflows/tests.yml`](.github/workflows/tests.yml) runs the whole suite against the live site:

- every day at 06:00 UTC, to catch regressions in the deployed app;
- on every push to `main` and on pull requests;
- when the app repo sends an `app-deployed` repository dispatch after a deploy;
- by hand from the Actions tab (*Run workflow*), optionally against another `base_url`.

On CI, failed tests are retried twice and the HTML report is uploaded as the `playwright-report` artifact (kept 14 days). GitHub turns off scheduled workflows in public repos after 60 days without a commit, so each scheduled run also re-enables the workflow to keep the daily run alive.

## Structure

```
playwright.config.ts   Environments, projects (ui / api), reporters
fixtures/
  index.ts             Custom `test` that injects page objects
  test-data.ts         Credentials and data helpers
pages/                 Page objects (one per page of the app)
tests/
  ui/                  Browser tests
  api/                 REST API tests
.github/workflows/     CI: on push, PRs, daily schedule and after app deploys
```

## Conventions

- Locate elements by `data-testid` (`page.getByTestId(...)`), which the app provides on every interactive element.
- Never use fixed sleeps. Rely on Playwright's auto-waiting assertions, or `page.clock` for time-based behaviour.
- Tests own their data: unique emails, a per-run sandbox, no reliance on test order across files.
