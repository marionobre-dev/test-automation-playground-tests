import type { Locator, Page } from '@playwright/test';

/** The shop's fixed catalogue, by product id. Prices in euros. */
export const PRODUCTS = {
  keyboard: { id: 1, name: 'Mechanical Keyboard', price: 89.9, stock: 5 },
  mouse: { id: 2, name: 'Wireless Mouse', price: 24.5, stock: 10 },
  monitor: { id: 3, name: '27" Monitor', price: 229, stock: 2 },
  hub: { id: 4, name: 'USB-C Hub', price: 39.99, stock: 0 },
  cleanCode: { id: 5, name: 'Clean Code', price: 34.95, stock: 8 },
  artOfTesting: { id: 6, name: 'The Art of Software Testing', price: 42, stock: 3 },
  hoodie: { id: 7, name: 'QA Hoodie', price: 49, stock: 6 },
  tshirt: { id: 8, name: '"It works on my machine" T-shirt', price: 19.99, stock: 12 },
} as const;

export const TOTAL_PRODUCTS = Object.keys(PRODUCTS).length;

/** Formats a number the way the shop shows money: €1234.50. */
export const euros = (n: number) => `€${n.toFixed(2)}`;

export type Shipping = { name: string; address: string; city: string; zip: string };

export const validShipping: Shipping = {
  name: 'Ana Silva',
  address: 'Rua das Flores 1',
  city: 'Lisboa',
  zip: '1000-001',
};

/** Page object for shop.html: catalogue, cart, checkout and confirmation. */
export class ShopPage {
  // Catalogue
  readonly search: Locator;
  readonly category: Locator;
  readonly sort: Locator;
  readonly products: Locator;
  readonly noProducts: Locator;
  // Cart
  readonly cartCount: Locator;
  readonly cartLines: Locator;
  readonly cartEmpty: Locator;
  readonly promo: Locator;
  readonly applyPromoButton: Locator;
  readonly promoMessage: Locator;
  readonly subtotal: Locator;
  readonly discount: Locator;
  readonly total: Locator;
  readonly checkoutButton: Locator;
  // Views
  readonly catalogView: Locator;
  readonly checkoutView: Locator;
  readonly doneView: Locator;
  // Checkout
  readonly shipName: Locator;
  readonly shipAddress: Locator;
  readonly shipCity: Locator;
  readonly shipZip: Locator;
  readonly shipStandard: Locator;
  readonly shipExpress: Locator;
  readonly checkoutError: Locator;
  readonly checkoutTotal: Locator;
  readonly placeOrderButton: Locator;
  readonly backToCart: Locator;
  // Confirmation
  readonly orderNumber: Locator;
  readonly orderAmount: Locator;
  readonly continueShopping: Locator;

  constructor(private readonly page: Page) {
    this.search = page.getByTestId('search');
    this.category = page.getByTestId('category');
    this.sort = page.getByTestId('sort');
    // data-product-id is only on the cards, so this counts products without
    // matching the testids inside each card.
    this.products = page.locator('[data-product-id]');
    this.noProducts = page.getByTestId('no-products');

    this.cartCount = page.getByTestId('cart-count');
    this.cartLines = page.getByTestId('cart-lines').locator('.cart-line');
    this.cartEmpty = page.getByTestId('cart-empty');
    this.promo = page.getByTestId('promo');
    this.applyPromoButton = page.getByTestId('apply-promo');
    this.promoMessage = page.getByTestId('promo-message');
    this.subtotal = page.getByTestId('subtotal');
    this.discount = page.getByTestId('discount');
    this.total = page.getByTestId('total');
    this.checkoutButton = page.getByTestId('checkout');

    this.catalogView = page.getByTestId('view-catalog');
    this.checkoutView = page.getByTestId('view-checkout');
    this.doneView = page.getByTestId('view-done');

    this.shipName = page.getByTestId('ship-name');
    this.shipAddress = page.getByTestId('ship-address');
    this.shipCity = page.getByTestId('ship-city');
    this.shipZip = page.getByTestId('ship-zip');
    this.shipStandard = page.getByTestId('ship-standard');
    this.shipExpress = page.getByTestId('ship-express');
    this.checkoutError = page.getByTestId('checkout-error');
    this.checkoutTotal = page.getByTestId('checkout-total');
    this.placeOrderButton = page.getByTestId('place-order');
    this.backToCart = page.getByTestId('back-to-cart');

    this.orderNumber = page.getByTestId('order-number');
    this.orderAmount = page.getByTestId('order-amount');
    this.continueShopping = page.getByTestId('continue-shopping');
  }

  async goto() {
    await this.page.goto('/shop.html');
  }

  // --- Catalogue ---

  product(id: number): Locator {
    return this.page.getByTestId(`product-${id}`);
  }

  addToCartButton(id: number): Locator {
    return this.page.getByTestId(`add-to-cart-${id}`);
  }

  async addToCart(id: number, times = 1) {
    for (let i = 0; i < times; i++) await this.addToCartButton(id).click();
  }

  async productNames(): Promise<string[]> {
    return this.products.getByTestId('product-name').allTextContents();
  }

  async productPrices(): Promise<number[]> {
    return (await this.products.getByTestId('product-price').allTextContents()).map((t) => Number(t.replace('€', '')));
  }

  // --- Cart ---

  cartLine(id: number): Locator {
    return this.page.getByTestId(`cart-line-${id}`);
  }

  quantity(id: number): Locator {
    return this.page.getByTestId(`qty-${id}`);
  }

  lineTotal(id: number): Locator {
    return this.page.getByTestId(`line-total-${id}`);
  }

  removeButton(id: number): Locator {
    return this.page.getByTestId(`remove-${id}`);
  }

  /** Types a quantity and leaves the field: the cart updates on "change", which fires on blur. */
  async setQuantity(id: number, value: string) {
    await this.quantity(id).fill(value);
    await this.quantity(id).blur();
  }

  async applyPromo(code: string) {
    await this.promo.fill(code);
    await this.applyPromoButton.click();
  }

  // --- Checkout ---

  async fillShipping(details: Partial<Shipping>) {
    if (details.name !== undefined) await this.shipName.fill(details.name);
    if (details.address !== undefined) await this.shipAddress.fill(details.address);
    if (details.city !== undefined) await this.shipCity.fill(details.city);
    if (details.zip !== undefined) await this.shipZip.fill(details.zip);
  }

  async placeOrder() {
    await this.placeOrderButton.click();
  }
}
