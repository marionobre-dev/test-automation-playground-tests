import { test, expect } from '../../fixtures';

/*
 * Two kinds of test live here:
 *  - "real time" tests wait for the state they need with auto-waiting
 *    assertions, the way the page's exercises intend. They take as long as
 *    the page does (a few seconds).
 *  - "paused clock" tests freeze the page's timers and move time on with
 *    page.clock.runFor(). They're instant and can check what happens just
 *    before and just after a delay, which real waiting never can.
 * Neither kind uses fixed sleeps.
 */

test.describe('1. Delayed element', () => {
  test('waits for the greeting, however long the load takes (real time)', async ({ dynamicPage }) => {
    await dynamicPage.goto();
    await dynamicPage.startLoading.click();
    await expect(dynamicPage.loading).toBeVisible();
    await expect(dynamicPage.startLoading).toBeDisabled();

    // The load takes 2-5 s, longer than expect's 5 s default once rendering is added.
    await expect(dynamicPage.finish).toBeVisible({ timeout: 10_000 });
    await expect(dynamicPage.finish).toHaveText('Hello World!');
    await expect(dynamicPage.loading).toBeHidden();
    await expect(dynamicPage.startLoading).toBeEnabled();
  });

  test('loads in no less than 2 and no more than 5 seconds (paused clock)', async ({ page, dynamicPage }) => {
    await dynamicPage.gotoWithPausedClock();
    await dynamicPage.startLoading.click();

    await page.clock.runFor(1_900);
    await expect(dynamicPage.loading).toBeVisible();
    await expect(dynamicPage.finish).toBeHidden();

    await page.clock.runFor(3_200); // 5.1 s in total
    await expect(dynamicPage.finish).toBeVisible();
    await expect(dynamicPage.loading).toBeHidden();
  });
});

test.describe('2. Hidden vs removed', () => {
  test('tells a hidden element from a removed one', async ({ dynamicPage }) => {
    await dynamicPage.goto();
    await expect(dynamicPage.hiddenTarget).toBeVisible();
    await expect(dynamicPage.removedTarget).toBeVisible();

    await dynamicPage.toggleHidden.click();
    await dynamicPage.toggleRemoved.click();

    // toBeHidden() passes for both, so it can't tell them apart...
    await expect(dynamicPage.hiddenTarget).toBeHidden();
    await expect(dynamicPage.removedTarget).toBeHidden();
    // ...but the number of matches can.
    await expect(dynamicPage.hiddenTarget).toHaveCount(1);
    await expect(dynamicPage.removedTarget).toHaveCount(0);

    await dynamicPage.toggleHidden.click();
    await dynamicPage.toggleRemoved.click();
    await expect(dynamicPage.hiddenTarget).toBeVisible();
    await expect(dynamicPage.removedTarget).toBeVisible();
    await expect(dynamicPage.removedTarget).toHaveText('I am sometimes removed.');
  });
});

test.describe('3. Enable / disable', () => {
  test('types into the input once it is enabled (real time)', async ({ dynamicPage }) => {
    await dynamicPage.goto();
    await expect(dynamicPage.asyncInput).toBeDisabled();

    await dynamicPage.toggleEnable.click();
    await expect(dynamicPage.asyncInput).toBeEnabled();
    await expect(dynamicPage.enableMessage).toHaveText("It's enabled!");

    await dynamicPage.asyncInput.fill('Now I can type');
    await expect(dynamicPage.asyncInput).toHaveValue('Now I can type');
  });

  test('shows progress while working, and toggles back to disabled (paused clock)', async ({ page, dynamicPage }) => {
    await dynamicPage.gotoWithPausedClock();

    await dynamicPage.toggleEnable.click();
    await expect(dynamicPage.enableMessage).toHaveText('Working…');
    await expect(dynamicPage.toggleEnable).toBeDisabled();
    await page.clock.runFor(1_900);
    await expect(dynamicPage.asyncInput).toBeDisabled();

    await page.clock.runFor(200);
    await expect(dynamicPage.asyncInput).toBeEnabled();
    await expect(dynamicPage.toggleEnable).toHaveText('Disable');
    await expect(dynamicPage.toggleEnable).toBeEnabled();

    await dynamicPage.toggleEnable.click();
    await page.clock.runFor(2_100);
    await expect(dynamicPage.asyncInput).toBeDisabled();
    await expect(dynamicPage.enableMessage).toHaveText("It's disabled!");
    await expect(dynamicPage.toggleEnable).toHaveText('Enable');
  });
});

test.describe('4. Add / remove elements', () => {
  test('adds three buttons and removes the second', async ({ dynamicPage }) => {
    await dynamicPage.goto();
    await expect(dynamicPage.deleteButtons).toHaveCount(0);

    for (let i = 0; i < 3; i++) await dynamicPage.addElement.click();
    await expect(dynamicPage.deleteButtons).toHaveCount(3);

    await dynamicPage.addedButton(2).click();
    await expect(dynamicPage.deleteButtons).toHaveCount(2);
    await expect(dynamicPage.addedButton(2)).toHaveCount(0);
    await expect(dynamicPage.addedButton(1)).toBeVisible();
    await expect(dynamicPage.addedButton(3)).toBeVisible();
  });

  test('keeps numbering new buttons after a delete', async ({ dynamicPage }) => {
    await dynamicPage.goto();
    await dynamicPage.addElement.click();
    await dynamicPage.addElement.click();
    await dynamicPage.addedButton(2).click();

    await dynamicPage.addElement.click();
    // The new button is added-3, not a reused added-2.
    await expect(dynamicPage.addedButton(3)).toBeVisible();
    await expect(dynamicPage.addedButton(2)).toHaveCount(0);
    await expect(dynamicPage.deleteButtons).toHaveCount(2);
  });
});

test.describe('5. Dynamic IDs', () => {
  test('clicks a button whose id changes on every load', async ({ page, dynamicPage }) => {
    await dynamicPage.goto();
    const firstId = await dynamicPage.dynamicIdButton.getAttribute('id');
    expect(firstId).toMatch(/^btn-[a-z0-9]+$/);

    await dynamicPage.dynamicIdButton.click();
    await expect(dynamicPage.dynamicIdResult).toHaveText(`Clicked button with id "${firstId}".`);

    await page.reload();
    const secondId = await dynamicPage.dynamicIdButton.getAttribute('id');
    expect(secondId).toMatch(/^btn-[a-z0-9]+$/);
    expect(secondId).not.toBe(firstId);

    // The same locator still works after the reload.
    await dynamicPage.dynamicIdButton.click();
    await expect(dynamicPage.dynamicIdResult).toHaveText(`Clicked button with id "${secondId}".`);
  });
});

test.describe('6. Progress bar (paused clock)', () => {
  test.beforeEach(async ({ dynamicPage }) => {
    await dynamicPage.gotoWithPausedClock();
    await expect(dynamicPage.progressValue).toHaveText('0%');
  });

  test('stops at exactly 75%', async ({ page, dynamicPage }) => {
    await dynamicPage.progressStart.click();
    await page.clock.runFor(7_500); // 75 ticks of 100 ms

    await expect(dynamicPage.progress).toHaveAttribute('aria-valuenow', '75');
    await expect(dynamicPage.progressValue).toHaveText('75%');
    await dynamicPage.progressStop.click();
    await expect(dynamicPage.progressResult).toHaveText('Stopped at 75%. Perfect!');
  });

  test('says how far off a stop was', async ({ page, dynamicPage }) => {
    await dynamicPage.progressStart.click();
    await page.clock.runFor(7_400);
    await dynamicPage.progressStop.click();
    await expect(dynamicPage.progressResult).toHaveText('Stopped at 74%. Off by 1.');

    // Stopped means stopped: more time changes nothing.
    await page.clock.runFor(1_000);
    await expect(dynamicPage.progressValue).toHaveText('74%');
  });

  test('stops climbing at 100%', async ({ page, dynamicPage }) => {
    await dynamicPage.progressStart.click();
    await page.clock.runFor(12_000);
    await expect(dynamicPage.progress).toHaveAttribute('aria-valuenow', '100');
    await expect(dynamicPage.progressValue).toHaveText('100%');
  });

  test('Start again resets the bar to 0', async ({ page, dynamicPage }) => {
    await dynamicPage.progressStart.click();
    await page.clock.runFor(3_000);
    await dynamicPage.progressStop.click();
    await expect(dynamicPage.progressResult).not.toBeEmpty();

    await dynamicPage.progressStart.click();
    await expect(dynamicPage.progressValue).toHaveText('0%');
    await expect(dynamicPage.progressResult).toBeEmpty();
    await page.clock.runFor(7_500);
    await dynamicPage.progressStop.click();
    await expect(dynamicPage.progressResult).toHaveText('Stopped at 75%. Perfect!');
  });
});

test.describe('7. Text changes', () => {
  test('follows the job through every status (real time)', async ({ dynamicPage }) => {
    await dynamicPage.goto();
    await expect(dynamicPage.jobStatus).toHaveText('Idle');

    await dynamicPage.startJob.click();
    await expect(dynamicPage.jobStatus).toHaveText('Pending');
    await expect(dynamicPage.startJob).toBeDisabled();
    await expect(dynamicPage.jobStatus).toHaveText('Processing');
    await expect(dynamicPage.jobStatus).toHaveText('Done');
    await expect(dynamicPage.startJob).toBeEnabled();
  });

  test('spends about 1.5 s pending and 2.5 s processing (paused clock)', async ({ page, dynamicPage }) => {
    await dynamicPage.gotoWithPausedClock();
    await dynamicPage.startJob.click();

    await page.clock.runFor(1_400);
    await expect(dynamicPage.jobStatus).toHaveText('Pending');
    await page.clock.runFor(200); // 1.6 s
    await expect(dynamicPage.jobStatus).toHaveText('Processing');
    await page.clock.runFor(2_300); // 3.9 s
    await expect(dynamicPage.jobStatus).toHaveText('Processing');
    await page.clock.runFor(200); // 4.1 s
    await expect(dynamicPage.jobStatus).toHaveText('Done');
  });
});

test.describe('8. Covered button', () => {
  test('clicks the real button once the overlay is gone, without forcing', async ({ dynamicPage }) => {
    await dynamicPage.goto();

    // click() checks the button would really receive the click, and retries
    // while the overlay sits on top. click({ force: true }) would hit the overlay.
    await dynamicPage.coveredButton.click();

    await expect(dynamicPage.coveredResult).toHaveText('Button clicked!');
    await expect(dynamicPage.overlay).toHaveCount(0);
  });
});

test.describe('9. Load more', () => {
  test('loads four batches of five, then stops (real time)', async ({ dynamicPage }) => {
    await dynamicPage.goto();
    await expect(dynamicPage.items).toHaveCount(0);

    for (let batch = 1; batch <= 4; batch++) {
      // click() waits for the button to be enabled again after the last batch.
      await dynamicPage.loadMore.click();
      await expect(dynamicPage.items).toHaveCount(batch * 5);
    }

    await expect(dynamicPage.loadMore).toBeDisabled();
    await expect(dynamicPage.loadMore).toHaveText('No more items');
    await expect(dynamicPage.items.first()).toHaveText('Item 1');
    await expect(dynamicPage.items.last()).toHaveText('Item 20');
  });

  test('shows a loading state for about a second per batch (paused clock)', async ({ page, dynamicPage }) => {
    await dynamicPage.gotoWithPausedClock();

    await dynamicPage.loadMore.click();
    await expect(dynamicPage.loadMore).toHaveText('Loading…');
    await expect(dynamicPage.loadMore).toBeDisabled();
    await page.clock.runFor(900);
    await expect(dynamicPage.items).toHaveCount(0);

    await page.clock.runFor(200);
    await expect(dynamicPage.items).toHaveCount(5);
    await expect(dynamicPage.loadMore).toHaveText('Load more');
    await expect(dynamicPage.loadMore).toBeEnabled();
  });
});
