# Reference

# End-to-End Testing

> **Version applicability** — Panther section targets **symfony/panther v2.4.0** (2026-01,
> Symfony 7.x/8.x). Panther drives a **real browser** (W3C WebDriver: Chrome/Firefox) for
> E2E tests and scraping. The Playwright section is an alternative for richer JS scenarios.

## Symfony Panther

### Installation

```bash
composer require --dev symfony/panther
# bdi auto-downloads the matching ChromeDriver / geckodriver:
composer require --dev dbrekelmans/bdi
vendor/bin/bdi detect drivers
```

Register the `ServerExtension` (manages the test web server; improves perf + enables
`--debug`) in `phpunit.dist.xml`:

```xml
<extensions>
    <!-- PHPUnit 10+ -->
    <bootstrap class="Symfony\Component\Panther\ServerExtension"/>
    <!-- PHPUnit < 10 (legacy):
    <extension class="Symfony\Component\Panther\ServerExtension"/> -->
</extensions>
```

### Basic test

```php
<?php
// tests/E2E/HomePageTest.php

namespace App\Tests\E2E;

use Symfony\Component\Panther\PantherTestCase;

class HomePageTest extends PantherTestCase
{
    public function testHomePageLoads(): void
    {
        $client = static::createPantherClient();   // real browser + JS
        $client->request('GET', '/');

        $this->assertPageTitleContains('Home');
        $this->assertSelectorTextContains('h1', 'Welcome');
    }
}
```

### Client creation

```php
static::createPantherClient();                                 // real browser, JS (Chrome default)
static::createPantherClient(['browser' => static::FIREFOX]);   // Firefox
static::createClient();                                        // BrowserKit — fast, NO JS
static::createHttpBrowserClient();                             // real HTTP, no browser
static::createAdditionalPantherClient();                       // isolated 2nd browser (realtime/multi-user apps)
// Standalone: Client::createChromeClient(), Client::createFirefoxClient(),
//             Client::createSeleniumClient('http://127.0.0.1:4444/wd/hub')
```

### Form interaction

```php
public function testContactForm(): void
{
    $client = static::createPantherClient();
    $crawler = $client->request('GET', '/contact');

    $form = $crawler->selectButton('Send')->form([
        'contact[name]' => 'John Doe',
        'contact[email]' => 'john@example.com',
        'contact[message]' => 'Hello!',
    ]);
    $client->submit($form);

    $client->waitFor('.alert-success');
    $this->assertSelectorTextContains('.alert-success', 'Message sent');
}
```

### Waiting for elements

Panther exposes explicit waits — never rely on implicit timing.

```php
$client->waitFor('.product-list');                              // exists in DOM
$client->waitFor('.slow-content', 10);                          // custom timeout (s)
$client->waitForVisibility('#x');
$client->waitForInvisibility('.loading-spinner');
$client->waitForStaleness('.popin');
$client->waitForElementToContain('.total', '25 €');
$client->waitForElementToNotContain('.total', '0 €');
$client->waitForEnabled('[type=submit]');
$client->waitForDisabled('[type=submit]');
$client->waitForAttributeToContain('.price', 'data-old-price', '25 €');
```

### Assertions

```php
// Immediate state
$this->assertSelectorIsVisible('.dropdown-menu');
$this->assertSelectorIsNotVisible('.modal');
$this->assertSelectorIsEnabled('[type=submit]');
$this->assertSelectorIsDisabled('[type=submit]');
$this->assertSelectorAttributeContains('.price', 'data-currency', 'EUR');

// Future state — wait then assert (Panther-specific)
$this->assertSelectorWillExist('.product-card');
$this->assertSelectorWillNotExist('.loading');
$this->assertSelectorWillBeVisible('.toast');
$this->assertSelectorWillBeEnabled('[type=submit]');
$this->assertSelectorWillContain('.status', 'Complete');
$this->assertSelectorAttributeWillContain('.price', 'data-old-price', '25 €');
```

### Scripting & screenshots

```php
$title = $client->executeScript('return document.title;');
$client->takeScreenshot('var/screenshots/page.png');
$logs = $client->getWebDriver()->manage()->getLog('browser');   // JS console
```

> Screenshots are debris — delete any `*.png` produced by `takeScreenshot()` or by
> `PANTHER_ERROR_SCREENSHOT_DIR` at the end of the run. Never commit them.

### Config & environment

Client options: `hostname` (127.0.0.1), `port` (9080), `external_base_uri`, `browser`.

Env vars: `PANTHER_NO_HEADLESS`, `PANTHER_WEB_SERVER_DIR` (`./public/`),
`PANTHER_WEB_SERVER_PORT` (9080), `PANTHER_EXTERNAL_BASE_URI`, `PANTHER_APP_ENV`,
`PANTHER_ERROR_SCREENSHOT_DIR`, `PANTHER_NO_SANDBOX`, `PANTHER_CHROME_ARGUMENTS`,
`PANTHER_CHROME_BINARY`, `PANTHER_FIREFOX_ARGUMENTS`, `PANTHER_NO_REDUCED_MOTION`.

```php
// Custom Chrome args:
Client::createChromeClient(null, ['--window-size=1500,4000']);
```

### Debug

```bash
# Pauses the browser on failure for visual inspection (needs ServerExtension)
PANTHER_NO_HEADLESS=1 bin/phpunit --debug
```

### Limitations

HTML only (no XML crawling); no DOM updating from the crawler; no multidimensional array
form values; returns `WebDriverElement`, not `\DOMElement`; Bootstrap 5 smooth-scroll can
interfere (`$enable-smooth-scroll: false`).

## Playwright (alternative)

For richer cross-browser JS scenarios (WebKit, tracing, video), run Playwright separately
against a running app. Use this when Panther's WebDriver model is too limiting.

### JavaScript Playwright tests

```javascript
// tests/e2e/login.spec.js
const { test, expect } = require('@playwright/test');

test('user can login', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});

test('login validation', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', 'invalid');
  await page.click('button[type="submit"]');

  await expect(page.locator('.error-message')).toBeVisible();
});
```

### Playwright configuration

```javascript
// playwright.config.js
module.exports = {
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
};
```

## Testing user flows

### Panther: complete checkout flow

```php
public function testCheckoutFlow(): void
{
    $client = static::createPantherClient();

    // 1. Login
    $client->request('GET', '/login');
    $client->submitForm('Login', [
        'email' => 'test@example.com',
        'password' => 'password',
    ]);
    $client->waitFor('.dashboard');

    // 2. Browse products
    $client->clickLink('Products');
    $client->waitFor('.product-list');

    // 3. Add to cart
    $client->click('.product-card:first-child .add-to-cart');
    $client->waitForElementToContain('.cart-count', '1');

    // 4. Cart
    $client->clickLink('Cart');
    $client->waitFor('.cart-items');

    // 5. Checkout
    $client->clickLink('Checkout');
    $client->waitFor('.checkout-form');

    // 6. Shipping
    $client->submitForm('Continue', [
        'shipping[address]' => '123 Main St',
        'shipping[city]' => 'Paris',
        'shipping[zip]' => '75001',
    ]);

    // 7. Confirm
    $client->waitFor('.order-summary');
    $client->click('.confirm-order');

    // 8. Verify
    $this->assertSelectorWillContain('.order-confirmation', 'Thank you');
}
```

## CI configuration

### GitHub Actions with Panther

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      database:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v6

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.4'
          extensions: pdo_pgsql

      - name: Install Chrome
        uses: browser-actions/setup-chrome@latest

      - name: Install dependencies
        run: composer install --no-interaction --prefer-dist --no-progress

      - name: Detect WebDriver
        run: vendor/bin/bdi detect drivers

      - name: Setup database
        run: |
          bin/console doctrine:database:create --env=test
          bin/console doctrine:migrations:migrate --no-interaction --env=test
          bin/console doctrine:fixtures:load --no-interaction --env=test

      - name: Run E2E tests
        run: ./vendor/bin/phpunit tests/E2E
        env:
          PANTHER_NO_SANDBOX: 1
```

## Best practices

1. **Test critical paths**: login, checkout, signup.
2. **Explicit waits**: prefer `waitFor*` / `assertSelectorWill*` over implicit timing.
3. **Stable selectors**: target `data-testid` attributes, not styling classes.
4. **Separate from unit tests**: E2E is slow — keep it in its own suite/dir.
5. **Reset state**: clean the database between tests (DAMADoctrineTestBundle / Foundry reset).
6. **Clean up screenshots**: delete any PNGs produced; never commit them.


## Skill Operating Checklist

### Design checklist
- Confirm operation boundaries and invariants first.
- Minimize scope while preserving contract correctness.
- Test both happy path and negative path behavior.

### Validation commands
- vendor/bin/bdi detect drivers
- ./vendor/bin/phpunit tests/E2E
- PANTHER_NO_HEADLESS=1 bin/phpunit --debug

### Failure modes to test
- Invalid payload or forbidden actor.
- Boundary values / not-found cases.
- Retry or partial-failure behavior for async flows.
