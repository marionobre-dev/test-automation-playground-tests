import { test, expect } from '../../fixtures';
import { PRODUCTS, TOTAL_PRODUCTS, euros, validShipping } from '../../pages/ShopPage';

const { keyboard, mouse, monitor, hub, cleanCode, hoodie, tshirt } = PRODUCTS;

// Every test gets a fresh browser context, so the cart saved in localStorage starts empty.
test.beforeEach(async ({ shopPage }) => {
  await shopPage.goto();
});

test.describe('Shop: catalogue', () => {
  test('lists every product, sorted by name', async ({ shopPage }) => {
    await expect(shopPage.products).toHaveCount(TOTAL_PRODUCTS);

    const names = await shopPage.productNames();
    // Names start with quotes and digits, so compare with a real collator.
    expect(names).toEqual([...names].sort(new Intl.Collator('en-US').compare));
  });

  test('searches by name, ignoring case and spaces', async ({ shopPage }) => {
    await shopPage.search.fill('  KEYBOARD ');

    await expect(shopPage.products).toHaveCount(1);
    await expect(shopPage.products.getByTestId('product-name')).toHaveText(keyboard.name);
  });

  test('filters by category', async ({ shopPage }) => {
    const expected = { Books: 2, Apparel: 2, Hardware: 4 };
    for (const [category, count] of Object.entries(expected)) {
      await shopPage.category.selectOption(category);
      await expect(shopPage.products, category).toHaveCount(count);
    }

    // '' is the value of "All categories".
    await shopPage.category.selectOption('');
    await expect(shopPage.products).toHaveCount(TOTAL_PRODUCTS);
  });

  test('combines search and category', async ({ shopPage }) => {
    await shopPage.category.selectOption('Hardware');
    await shopPage.search.fill('o');

    await expect(shopPage.products).toHaveCount(3);
    expect(new Set(await shopPage.productNames())).toEqual(new Set([keyboard.name, mouse.name, monitor.name]));
  });

  test('sorts by price, both ways', async ({ shopPage }) => {
    await shopPage.sort.selectOption('price-asc');
    await expect(shopPage.products.first().getByTestId('product-price')).toHaveText(euros(tshirt.price));
    let prices = await shopPage.productPrices();
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    await shopPage.sort.selectOption('price-desc');
    await expect(shopPage.products.first().getByTestId('product-name')).toHaveText(monitor.name);
    prices = await shopPage.productPrices();
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
  });

  test('shows a message when nothing matches', async ({ shopPage }) => {
    await expect(shopPage.noProducts).toBeHidden();

    await shopPage.search.fill('unicorn');

    await expect(shopPage.products).toHaveCount(0);
    await expect(shopPage.noProducts).toHaveText('No products match your search.');

    await shopPage.search.clear();
    await expect(shopPage.noProducts).toBeHidden();
  });

  test('the sold-out hub cannot be added', async ({ shopPage }) => {
    await expect(shopPage.product(hub.id).getByTestId('product-stock')).toHaveText('Out of stock');
    await expect(shopPage.addToCartButton(hub.id)).toBeDisabled();
    await expect(shopPage.addToCartButton(hub.id)).toHaveText('Sold out');
  });

  test('shows how many of each product are in stock', async ({ shopPage }) => {
    await expect(shopPage.product(monitor.id).getByTestId('product-stock')).toHaveText('2 in stock');
    await expect(shopPage.product(tshirt.id).getByTestId('product-stock')).toHaveText('12 in stock');
  });
});

test.describe('Shop: cart', () => {
  test('starts empty, with checkout disabled', async ({ shopPage }) => {
    await expect(shopPage.cartCount).toHaveText('0');
    await expect(shopPage.cartEmpty).toHaveText('Your cart is empty.');
    await expect(shopPage.total).toHaveText('€0.00');
    await expect(shopPage.checkoutButton).toBeDisabled();
  });

  test('calculates totals with SAVE10', async ({ shopPage }) => {
    await shopPage.addToCart(keyboard.id);
    await shopPage.addToCart(cleanCode.id, 2);

    await expect(shopPage.cartCount).toHaveText('3');
    await expect(shopPage.cartLines).toHaveCount(2);
    await expect(shopPage.lineTotal(cleanCode.id)).toHaveText('€69.90');
    await expect(shopPage.subtotal).toHaveText('€159.80');
    await expect(shopPage.checkoutButton).toBeEnabled();

    await shopPage.applyPromo('save10'); // codes are case-insensitive

    await expect(shopPage.promoMessage).toHaveText('Code SAVE10 applied (10% off).');
    await expect(shopPage.discount).toHaveText('-€15.98');
    await expect(shopPage.total).toHaveText('€143.82');
  });

  test('HALFPRICE takes 50% off', async ({ shopPage }) => {
    await shopPage.addToCart(keyboard.id);
    await shopPage.applyPromo('HALFPRICE');

    await expect(shopPage.promoMessage).toHaveText('Code HALFPRICE applied (50% off).');
    await expect(shopPage.discount).toHaveText('-€44.95');
    await expect(shopPage.total).toHaveText('€44.95');
  });

  test('rejects unknown and empty promo codes', async ({ shopPage }) => {
    await shopPage.addToCart(keyboard.id);

    await shopPage.applyPromo('FREEBIE');
    await expect(shopPage.promoMessage).toHaveText('"FREEBIE" is not a valid code.');
    await expect(shopPage.discount).toHaveText('-€0.00');

    await shopPage.applyPromo('');
    await expect(shopPage.promoMessage).toHaveText('Enter a code.');
  });

  test('an invalid code replaces a valid one', async ({ shopPage }) => {
    await shopPage.addToCart(keyboard.id);
    await shopPage.applyPromo('SAVE10');
    await expect(shopPage.discount).toHaveText('-€8.99');

    await shopPage.applyPromo('FREEBIE');

    await expect(shopPage.discount).toHaveText('-€0.00');
    await expect(shopPage.total).toHaveText(euros(keyboard.price));
  });

  test('changing a quantity updates the line and the totals', async ({ shopPage }) => {
    await shopPage.addToCart(mouse.id);
    await shopPage.setQuantity(mouse.id, '3');

    await expect(shopPage.cartCount).toHaveText('3');
    await expect(shopPage.lineTotal(mouse.id)).toHaveText('€73.50');
    await expect(shopPage.total).toHaveText('€73.50');

    // Fractions are rounded down.
    await shopPage.setQuantity(mouse.id, '2.7');
    await expect(shopPage.quantity(mouse.id)).toHaveValue('2');
    await expect(shopPage.lineTotal(mouse.id)).toHaveText('€49.00');
  });

  test('respects stock limits', async ({ shopPage }) => {
    await shopPage.addToCart(monitor.id);

    await shopPage.setQuantity(monitor.id, '5');

    await expect(shopPage.quantity(monitor.id)).toHaveValue('2');
    await expect(shopPage.lineTotal(monitor.id)).toHaveText('€458.00');
    await expect(shopPage.addToCartButton(monitor.id)).toBeDisabled();
  });

  test('Add to cart stops at the stock limit', async ({ shopPage }) => {
    await shopPage.addToCart(monitor.id, 2);

    await expect(shopPage.addToCartButton(monitor.id)).toBeDisabled();
    await expect(shopPage.addToCartButton(monitor.id)).toHaveText('Add to cart');
    await expect(shopPage.quantity(monitor.id)).toHaveValue('2');
  });

  test('a quantity of 0 removes the line', async ({ shopPage }) => {
    await shopPage.addToCart(monitor.id);
    await shopPage.setQuantity(monitor.id, '0');

    await expect(shopPage.cartLine(monitor.id)).toHaveCount(0);
    await expect(shopPage.cartEmpty).toBeVisible();
    await expect(shopPage.checkoutButton).toBeDisabled();
  });

  test('the remove button deletes only its line', async ({ shopPage }) => {
    await shopPage.addToCart(keyboard.id);
    await shopPage.addToCart(hoodie.id, 2);

    await shopPage.removeButton(hoodie.id).click();

    await expect(shopPage.cartLine(hoodie.id)).toHaveCount(0);
    await expect(shopPage.cartLine(keyboard.id)).toBeVisible();
    await expect(shopPage.cartCount).toHaveText('1');
    await expect(shopPage.total).toHaveText(euros(keyboard.price));
  });

  test('the cart and promo code survive a reload', async ({ page, shopPage }) => {
    await shopPage.addToCart(cleanCode.id, 2);
    await shopPage.applyPromo('SAVE10');
    await expect(shopPage.total).toHaveText('€62.91');

    await page.reload();

    await expect(shopPage.cartCount).toHaveText('2');
    await expect(shopPage.quantity(cleanCode.id)).toHaveValue('2');
    await expect(shopPage.promoMessage).toHaveText('Code SAVE10 applied (10% off).');
    await expect(shopPage.total).toHaveText('€62.91');
  });

  test('search and filters do not change the cart', async ({ shopPage }) => {
    await shopPage.addToCart(keyboard.id);
    await shopPage.search.fill('unicorn');

    await expect(shopPage.cartLine(keyboard.id)).toBeVisible();
    await expect(shopPage.cartCount).toHaveText('1');
  });
});

test.describe('Shop: checkout', () => {
  test('buys a hoodie with express shipping', async ({ page, shopPage }) => {
    await shopPage.addToCart(hoodie.id);
    await shopPage.checkoutButton.click();

    await expect(shopPage.checkoutView).toBeVisible();
    await expect(shopPage.catalogView).toBeHidden();
    await expect(shopPage.checkoutTotal).toHaveText('€49.00');

    await shopPage.fillShipping(validShipping);
    await shopPage.shipExpress.check();
    await expect(shopPage.checkoutTotal).toHaveText('€58.99');

    await shopPage.placeOrder();

    await expect(shopPage.doneView).toBeVisible();
    await expect(shopPage.orderNumber).toHaveText(/^ORD-\d{8}$/);
    await expect(shopPage.orderAmount).toHaveText('€58.99');

    await shopPage.continueShopping.click();
    await expect(shopPage.catalogView).toBeVisible();
    await expect(shopPage.cartCount).toHaveText('0');

    await page.reload();
    await expect(shopPage.cartCount).toHaveText('0');
  });

  test('switching back to standard shipping removes the fee', async ({ shopPage }) => {
    await shopPage.addToCart(hoodie.id);
    await shopPage.checkoutButton.click();

    await shopPage.shipExpress.check();
    await expect(shopPage.checkoutTotal).toHaveText('€58.99');
    await shopPage.shipStandard.check();
    await expect(shopPage.checkoutTotal).toHaveText('€49.00');
  });

  test('charges the discounted total plus shipping', async ({ shopPage }) => {
    await shopPage.addToCart(hoodie.id);
    await shopPage.applyPromo('SAVE10');
    await shopPage.checkoutButton.click();

    await shopPage.fillShipping(validShipping);
    await shopPage.shipExpress.check();
    // €49.00 - €4.90 + €9.99
    await expect(shopPage.checkoutTotal).toHaveText('€54.09');

    await shopPage.placeOrder();
    await expect(shopPage.orderAmount).toHaveText('€54.09');
  });

  test('Back to cart keeps the cart', async ({ shopPage }) => {
    await shopPage.addToCart(keyboard.id);
    await shopPage.checkoutButton.click();
    await expect(shopPage.checkoutView).toBeVisible();

    await shopPage.backToCart.click();

    await expect(shopPage.catalogView).toBeVisible();
    await expect(shopPage.checkoutView).toBeHidden();
    await expect(shopPage.cartLine(keyboard.id)).toBeVisible();
  });

  test('requires every shipping field and marks the empty ones', async ({ shopPage }) => {
    await shopPage.addToCart(mouse.id);
    await shopPage.checkoutButton.click();

    await shopPage.placeOrder();
    await expect(shopPage.checkoutError).toHaveText('Please fill in all shipping fields.');
    for (const field of [shopPage.shipName, shopPage.shipAddress, shopPage.shipCity, shopPage.shipZip]) {
      await expect(field).toHaveAttribute('aria-invalid', 'true');
    }

    // Fill two fields: only the other two stay marked.
    await shopPage.fillShipping({ name: validShipping.name, city: validShipping.city });
    await shopPage.placeOrder();
    await expect(shopPage.shipName).not.toHaveAttribute('aria-invalid');
    await expect(shopPage.shipCity).not.toHaveAttribute('aria-invalid');
    await expect(shopPage.shipAddress).toHaveAttribute('aria-invalid', 'true');
    await expect(shopPage.shipZip).toHaveAttribute('aria-invalid', 'true');
    await expect(shopPage.doneView).toBeHidden();
  });

  test('a field of only spaces counts as empty', async ({ shopPage }) => {
    await shopPage.addToCart(mouse.id);
    await shopPage.checkoutButton.click();

    await shopPage.fillShipping({ ...validShipping, city: '   ' });
    await shopPage.placeOrder();

    await expect(shopPage.checkoutError).toHaveText('Please fill in all shipping fields.');
    await expect(shopPage.shipCity).toHaveAttribute('aria-invalid', 'true');
  });

  const postalCodes = [
    { zip: '1000', valid: false },
    { zip: '1000001', valid: false },
    { zip: '1000-01', valid: false },
    { zip: 'abcd-efg', valid: false },
    { zip: '1000-001', valid: true },
  ];

  for (const { zip, valid } of postalCodes) {
    test(`postal code "${zip}" is ${valid ? 'accepted' : 'rejected'}`, async ({ shopPage }) => {
      await shopPage.addToCart(mouse.id);
      await shopPage.checkoutButton.click();

      await shopPage.fillShipping({ ...validShipping, zip });
      await shopPage.placeOrder();

      if (valid) {
        await expect(shopPage.doneView).toBeVisible();
      } else {
        await expect(shopPage.checkoutError).toHaveText('Postal code must look like 1000-001.');
        await expect(shopPage.shipZip).toHaveAttribute('aria-invalid', 'true');
        // Negative check: the confirmation never appears.
        await expect(shopPage.doneView).toBeHidden();
      }
    });
  }

  test('shows a busy button while placing the order, then resets the form (paused clock)', async ({ page, shopPage }) => {
    // Freeze the page's timers so the 1.2 s "placing order" state can't slip past us.
    await page.clock.install();
    await shopPage.goto();
    await page.clock.pauseAt(new Date(Date.now() + 60_000));

    await shopPage.addToCart(hoodie.id);
    await shopPage.checkoutButton.click();
    await shopPage.fillShipping(validShipping);
    await shopPage.shipExpress.check();
    await shopPage.placeOrder();

    await expect(shopPage.placeOrderButton).toHaveText('Placing order…');
    await expect(shopPage.placeOrderButton).toBeDisabled();
    await expect(shopPage.doneView).toBeHidden();

    await page.clock.runFor(1_300);
    await expect(shopPage.doneView).toBeVisible();

    // The form is cleared for the next order.
    await expect(shopPage.shipName).toHaveValue('');
    await expect(shopPage.shipStandard).toBeChecked();
    await expect(shopPage.placeOrderButton).toHaveText('Place order');
  });
});
