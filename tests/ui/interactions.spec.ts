import { test, expect } from '../../fixtures';

test.beforeEach(async ({ interactionsPage }) => {
  await interactionsPage.goto();
});

test.describe('1. JavaScript dialogs', () => {
  test('accepts the alert', async ({ interactionsPage: p }) => {
    const dialog = await p.answerDialog(p.alertButton, (d) => d.accept());

    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('I am a JS Alert');
    await expect(p.dialogResult).toHaveText('You clicked OK on the alert');
  });

  const confirmCases = [
    { answer: 'accept', result: 'You clicked: Ok' },
    { answer: 'dismiss', result: 'You clicked: Cancel' },
  ] as const;

  for (const c of confirmCases) {
    test(`confirm: ${c.answer} shows "${c.result}"`, async ({ interactionsPage: p }) => {
      const dialog = await p.answerDialog(p.confirmButton, (d) => d[c.answer]());

      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toBe('Do you confirm?');
      await expect(p.dialogResult).toHaveText(c.result);
    });
  }

  test('prompt: answers with a name', async ({ interactionsPage: p }) => {
    const dialog = await p.answerDialog(p.promptButton, (d) => d.accept('Mario'));

    expect(dialog.type()).toBe('prompt');
    expect(dialog.message()).toBe('What is your name?');
    await expect(p.dialogResult).toHaveText('You entered: Mario');
  });

  test('prompt: OK with nothing typed is not the same as Cancel', async ({ interactionsPage: p }) => {
    await p.answerDialog(p.promptButton, (d) => d.accept(''));
    await expect(p.dialogResult).toHaveText('You entered:');

    await p.answerDialog(p.promptButton, (d) => d.dismiss());
    await expect(p.dialogResult).toHaveText('You cancelled the prompt');
  });

  test('with no handler, Playwright dismisses dialogs by itself', async ({ interactionsPage: p }) => {
    await p.confirmButton.click();
    await expect(p.dialogResult).toHaveText('You clicked: Cancel');

    await p.promptButton.click();
    await expect(p.dialogResult).toHaveText('You cancelled the prompt');
  });
});

test.describe('2. Modal dialog', () => {
  test('subscribes through the modal', async ({ interactionsPage: p }) => {
    await expect(p.modal).toBeHidden();
    await p.openModal.click();

    await expect(p.modal).toBeVisible();
    await expect(p.modal.getByRole('heading')).toHaveText('Subscribe to updates?');
    await p.modal.getByRole('button', { name: 'Subscribe' }).click();

    await expect(p.modal).toBeHidden();
    await expect(p.modalResult).toHaveText('Subscribed');
  });

  test('declines through the modal', async ({ interactionsPage: p }) => {
    await p.openModal.click();
    await p.modal.getByRole('button', { name: 'No thanks' }).click();

    await expect(p.modal).toBeHidden();
    await expect(p.modalResult).toHaveText('Declined');
  });

  test('Escape closes the modal without choosing', async ({ page, interactionsPage: p }) => {
    await p.openModal.click();
    await expect(p.modal).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(p.modal).toBeHidden();
    await expect(p.modalResult).toBeEmpty();
  });

  test('the open modal blocks the page behind it', async ({ interactionsPage: p }) => {
    await p.openModal.click();

    // A modal <dialog> makes the rest of the page inert, so a trial click
    // (which only runs the actionability checks) can't reach the button behind it.
    await expect(p.doubleClick.click({ trial: true, timeout: 1_000 })).rejects.toThrow();

    await p.modal.getByRole('button', { name: 'No thanks' }).click();
    await p.doubleClick.click({ trial: true });
  });
});

test.describe('3. Drag and drop', () => {
  test('drags every tool into Selected', async ({ interactionsPage: p }) => {
    await expect(p.dropResult).toHaveText('none');

    for (const tool of ['selenium', 'playwright', 'cypress'] as const) {
      await p.draggable(tool).dragTo(p.targetZone);
    }

    await expect(p.sourceZone.locator('.draggable')).toHaveCount(0);
    await expect(p.targetZone.locator('.draggable')).toHaveCount(3);
    await expect(p.dropResult).toHaveText('Selenium, Playwright, Cypress');
  });

  test('lists tools in the order they were dropped', async ({ interactionsPage: p }) => {
    await p.draggable('cypress').dragTo(p.targetZone);
    await p.draggable('selenium').dragTo(p.targetZone);

    await expect(p.dropResult).toHaveText('Cypress, Selenium');
    await expect(p.sourceZone.locator('.draggable')).toHaveText(['Playwright']);
  });

  test('drags a tool back out of Selected', async ({ interactionsPage: p }) => {
    await p.draggable('playwright').dragTo(p.targetZone);
    await expect(p.dropResult).toHaveText('Playwright');

    await p.draggable('playwright').dragTo(p.sourceZone);

    await expect(p.dropResult).toHaveText('none');
    await expect(p.targetZone.locator('.draggable')).toHaveCount(0);
    await expect(p.sourceZone.locator('.draggable')).toHaveCount(3);
  });
});

test.describe('4. Mouse actions', () => {
  test('the hover menu only appears on hover', async ({ interactionsPage: p }) => {
    await expect(p.menuItem('settings')).toBeHidden();

    await p.hoverTrigger.hover();
    await expect(p.menuItem('settings')).toBeVisible();
    await p.menuItem('settings').click();

    await expect(p.mouseResult).toHaveText('Menu: Settings');
  });

  for (const [item, label] of [['profile', 'Profile'], ['signout', 'Sign out']] as const) {
    test(`hover menu: ${label}`, async ({ interactionsPage: p }) => {
      await p.hoverTrigger.hover();
      await p.menuItem(item).click();
      await expect(p.mouseResult).toHaveText(`Menu: ${label}`);
    });
  }

  test('a double-click registers, a single click does not', async ({ interactionsPage: p }) => {
    await p.doubleClick.click();
    await expect(p.mouseResult).toBeEmpty();

    await p.doubleClick.dblclick();
    await expect(p.mouseResult).toHaveText('Double click');
  });

  for (const [item, action] of [['copy', 'Copy'], ['rename', 'Rename'], ['delete', 'Delete']] as const) {
    test(`right-click menu: ${action}`, async ({ interactionsPage: p }) => {
      await expect(p.contextMenu).toBeHidden();

      await p.contextTarget.click({ button: 'right' });
      await expect(p.contextMenu).toBeVisible();
      await p.contextItem(item).click();

      await expect(p.mouseResult).toHaveText(`Context menu: ${action}`);
      // Any click closes the menu, including the one that picked an item.
      await expect(p.contextMenu).toBeHidden();
    });
  }

  test('a click elsewhere closes the right-click menu without choosing', async ({ page, interactionsPage: p }) => {
    await p.contextTarget.click({ button: 'right' });
    await expect(p.contextMenu).toBeVisible();

    await page.getByTestId('page-title').click();

    await expect(p.contextMenu).toBeHidden();
    await expect(p.mouseResult).toBeEmpty();
  });
});

test.describe('5. Keyboard', () => {
  // press: what Playwright sends. shown: what the page should report (modifiers first).
  const keys = [
    { press: 'Enter', shown: 'Enter' },
    { press: 'Escape', shown: 'Escape' },
    { press: 'Tab', shown: 'Tab' },
    { press: ' ', shown: 'Space' },
    { press: 'a', shown: 'a' },
    { press: 'Shift+A', shown: 'Shift+A' },
    { press: 'Control+a', shown: 'Ctrl+a' },
    { press: 'Alt+x', shown: 'Alt+x' },
    { press: 'Control+Shift+K', shown: 'Ctrl+Shift+K' },
    { press: 'Shift+ArrowLeft', shown: 'Shift+ArrowLeft' },
    // A modifier pressed on its own is reported once, not as "Shift+Shift".
    { press: 'Shift', shown: 'Shift' },
    { press: 'Control', shown: 'Ctrl+Control' },
  ];

  for (const k of keys) {
    test(`reports "${k.press}" as "${k.shown}"`, async ({ interactionsPage: p }) => {
      // locator.press() focuses the element first, then sends the key.
      await p.keyInput.press(k.press);
      await expect(p.keyResult).toHaveText(k.shown);
    });
  }
});

test.describe('6. iframe', () => {
  test('sends a message from inside the iframe to the page', async ({ interactionsPage: p }) => {
    await expect(p.frame.getByTestId('frame-heading')).toHaveText('Inside the frame');

    await p.frame.getByTestId('frame-input').fill('Hello from Playwright');
    await p.frame.getByTestId('frame-submit').click();

    await expect(p.frame.getByTestId('frame-output')).toHaveText('Sent: Hello from Playwright');
    // Back on the main page: no "switching back" needed.
    await expect(p.frameResult).toHaveText('Hello from Playwright');
  });

  test('pressing Enter in the frame submits too', async ({ interactionsPage: p }) => {
    await p.frame.getByTestId('frame-input').fill('Sent with Enter');
    await p.frame.getByTestId('frame-input').press('Enter');

    await expect(p.frame.getByTestId('frame-output')).toHaveText('Sent: Sent with Enter');
    await expect(p.frameResult).toHaveText('Sent with Enter');
  });

  test("the page's own locators can't see into the frame", async ({ page }) => {
    // Unlike shadow DOM, an iframe is a separate document: page locators stop at its edge.
    await expect(page.getByTestId('frame-input')).toHaveCount(0);
  });
});

test.describe('7. Tabs & windows', () => {
  test('works in a new tab, closes it and carries on', async ({ page, interactionsPage: p }) => {
    const newTab = await p.openPopup(() => p.newTabLink.click());

    await expect(newTab).toHaveURL(/frame\.html\?standalone=1/);
    await expect(newTab.getByTestId('frame-heading')).toHaveText('Inside the frame');
    expect(page.context().pages()).toHaveLength(2);

    await newTab.close();

    expect(page.context().pages()).toHaveLength(1);
    await expect(page.getByTestId('page-title')).toHaveText('Interactions');
  });

  test('works in a popup window, closes it and carries on', async ({ page, interactionsPage: p }) => {
    const popup = await p.openPopup(() => p.newWindowButton.click());

    await expect(popup).toHaveURL(/frame\.html\?standalone=1/);
    await expect(popup.getByTestId('frame-heading')).toHaveText('Inside the frame');
    await popup.close();

    // The original page is untouched and still usable.
    await p.shadowButton.click();
    await expect(p.shadowOutput).toHaveText('Hello, stranger!');
  });

  test('a message sent in the standalone page does not reach the original', async ({ interactionsPage: p }) => {
    const newTab = await p.openPopup(() => p.newTabLink.click());

    await newTab.getByTestId('frame-input').fill('Only here');
    await newTab.getByTestId('frame-submit').click();
    await expect(newTab.getByTestId('frame-output')).toHaveText('Sent: Only here');

    // The frame only posts to a parent page, and a tab has none.
    await expect(p.frameResult).toBeEmpty();
    await newTab.close();
  });
});

test.describe('8. Shadow DOM', () => {
  test('greets through the shadow DOM', async ({ interactionsPage: p }) => {
    await p.shadowButton.click();
    await expect(p.shadowOutput).toHaveText('Hello, stranger!');

    await p.shadowInput.fill('Mario');
    await p.shadowButton.click();
    await expect(p.shadowOutput).toHaveText('Hello, Mario!');
  });

  test('the elements really are inside a shadow root', async ({ page, interactionsPage: p }) => {
    // Plain DOM queries can't see them...
    expect(await page.evaluate(() => document.querySelector('[data-testid="shadow-input"]'))).toBeNull();
    // ...nor can XPath, which doesn't pierce shadow roots.
    await expect(page.locator('xpath=//input[@data-testid="shadow-input"]')).toHaveCount(0);
    // Playwright's normal locators can.
    await expect(p.shadowInput).toHaveCount(1);
    await expect(p.shadowInput).toHaveAttribute('placeholder', 'Your name');
  });
});
