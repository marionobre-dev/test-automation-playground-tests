import type { Dialog, FrameLocator, Locator, Page } from '@playwright/test';

export type Tool = 'selenium' | 'playwright' | 'cypress';

/** Page object for interactions.html. */
export class InteractionsPage {
  // 1. JavaScript dialogs
  readonly alertButton: Locator;
  readonly confirmButton: Locator;
  readonly promptButton: Locator;
  readonly dialogResult: Locator;
  // 2. Modal dialog
  readonly openModal: Locator;
  readonly modal: Locator;
  readonly modalResult: Locator;
  // 3. Drag and drop
  readonly sourceZone: Locator;
  readonly targetZone: Locator;
  readonly dropResult: Locator;
  // 4. Mouse actions
  readonly hoverTrigger: Locator;
  readonly doubleClick: Locator;
  readonly contextTarget: Locator;
  readonly contextMenu: Locator;
  readonly mouseResult: Locator;
  // 5. Keyboard
  readonly keyInput: Locator;
  readonly keyResult: Locator;
  // 6. iframe
  readonly frame: FrameLocator;
  readonly frameResult: Locator;
  // 7. Tabs & windows
  readonly newTabLink: Locator;
  readonly newWindowButton: Locator;
  // 8. Shadow DOM (Playwright's locators pierce open shadow roots on their own)
  readonly shadowInput: Locator;
  readonly shadowButton: Locator;
  readonly shadowOutput: Locator;

  constructor(private readonly page: Page) {
    this.alertButton = page.getByTestId('js-alert');
    this.confirmButton = page.getByTestId('js-confirm');
    this.promptButton = page.getByTestId('js-prompt');
    this.dialogResult = page.getByTestId('dialog-result');

    this.openModal = page.getByTestId('open-modal');
    this.modal = page.getByRole('dialog');
    this.modalResult = page.getByTestId('modal-result');

    this.sourceZone = page.getByTestId('source-zone');
    this.targetZone = page.getByTestId('target-zone');
    this.dropResult = page.getByTestId('drop-result');

    this.hoverTrigger = page.getByTestId('hover-trigger');
    this.doubleClick = page.getByTestId('double-click');
    this.contextTarget = page.getByTestId('context-target');
    this.contextMenu = page.getByTestId('context-menu');
    this.mouseResult = page.getByTestId('mouse-result');

    this.keyInput = page.getByTestId('key-input');
    this.keyResult = page.getByTestId('key-result');

    this.frame = page.getByTestId('practice-frame').contentFrame();
    this.frameResult = page.getByTestId('frame-result');

    this.newTabLink = page.getByTestId('new-tab-link');
    this.newWindowButton = page.getByTestId('new-window');

    this.shadowInput = page.getByTestId('shadow-input');
    this.shadowButton = page.getByTestId('shadow-button');
    this.shadowOutput = page.getByTestId('shadow-output');
  }

  async goto() {
    await this.page.goto('/interactions.html');
  }

  /**
   * Clicks a button that opens a browser dialog, answers it with `respond`,
   * and returns the dialog so the test can check its type and message.
   * The handler is registered before the click, as it must be.
   */
  async answerDialog(button: Locator, respond: (dialog: Dialog) => Promise<void>): Promise<Dialog> {
    const dialogPromise = this.page.waitForEvent('dialog');
    const clickPromise = button.click();
    const dialog = await dialogPromise;
    await respond(dialog);
    await clickPromise;
    return dialog;
  }

  draggable(tool: Tool): Locator {
    return this.page.getByTestId(`drag-${tool}`);
  }

  menuItem(name: 'profile' | 'settings' | 'signout'): Locator {
    return this.page.getByTestId(`menu-${name}`);
  }

  contextItem(name: 'copy' | 'rename' | 'delete'): Locator {
    return this.page.getByTestId(`ctx-${name}`);
  }

  /** Opens a new page with `action` and returns it once it has loaded. */
  async openPopup(action: () => Promise<void>): Promise<Page> {
    const popupPromise = this.page.waitForEvent('popup');
    await action();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    return popup;
  }
}
