import type { Locator, Page } from '@playwright/test';

/** Page object for dynamic.html. Each section of the page gets its own group of locators. */
export class DynamicPage {
  // 1. Delayed element
  readonly startLoading: Locator;
  readonly loading: Locator;
  readonly finish: Locator;
  // 2. Hidden vs removed
  readonly toggleHidden: Locator;
  readonly toggleRemoved: Locator;
  readonly hiddenTarget: Locator;
  readonly removedTarget: Locator;
  // 3. Enable / disable
  readonly asyncInput: Locator;
  readonly toggleEnable: Locator;
  readonly enableMessage: Locator;
  // 4. Add / remove elements
  readonly addElement: Locator;
  readonly deleteButtons: Locator;
  // 5. Dynamic IDs
  readonly dynamicIdButton: Locator;
  readonly dynamicIdResult: Locator;
  // 6. Progress bar
  readonly progress: Locator;
  readonly progressStart: Locator;
  readonly progressStop: Locator;
  readonly progressValue: Locator;
  readonly progressResult: Locator;
  // 7. Text changes
  readonly startJob: Locator;
  readonly jobStatus: Locator;
  // 8. Covered button
  readonly coveredButton: Locator;
  readonly overlay: Locator;
  readonly coveredResult: Locator;
  // 9. Load more
  readonly items: Locator;
  readonly loadMore: Locator;

  constructor(private readonly page: Page) {
    this.startLoading = page.getByTestId('start-loading');
    this.loading = page.getByTestId('loading');
    this.finish = page.getByTestId('finish');

    this.toggleHidden = page.getByTestId('toggle-hidden');
    this.toggleRemoved = page.getByTestId('toggle-removed');
    this.hiddenTarget = page.getByTestId('hidden-target');
    this.removedTarget = page.getByTestId('removed-target');

    this.asyncInput = page.getByTestId('async-input');
    this.toggleEnable = page.getByTestId('toggle-enable');
    this.enableMessage = page.getByTestId('enable-message');

    this.addElement = page.getByTestId('add-element');
    // Scoped to the container so no other "Delete" button on the page can match.
    this.deleteButtons = page.getByTestId('elements').getByRole('button', { name: 'Delete' });

    // By role and visible name: the id changes on every load.
    this.dynamicIdButton = page.getByRole('button', { name: 'Click me' });
    this.dynamicIdResult = page.getByTestId('dynamic-id-result');

    this.progress = page.getByTestId('progress');
    this.progressStart = page.getByTestId('progress-start');
    this.progressStop = page.getByTestId('progress-stop');
    this.progressValue = page.getByTestId('progress-value');
    this.progressResult = page.getByTestId('progress-result');

    this.startJob = page.getByTestId('start-job');
    this.jobStatus = page.getByTestId('job-status');

    this.coveredButton = page.getByTestId('covered-button');
    this.overlay = page.getByTestId('overlay');
    this.coveredResult = page.getByTestId('covered-result');

    this.items = page.getByTestId('items').getByRole('listitem');
    this.loadMore = page.getByTestId('load-more');
  }

  async goto() {
    await this.page.goto('/dynamic.html');
  }

  /**
   * Opens the page with a fake clock and pauses it, so no timer fires until a
   * test moves time on with page.clock.runFor(). pauseAt() can only jump
   * forward, so it leaves a minute's margin for the page load. Timers the page
   * sets while loading (like the 3 s overlay) fire during that jump.
   */
  async gotoWithPausedClock() {
    await this.page.clock.install();
    await this.goto();
    await this.page.clock.pauseAt(new Date(Date.now() + 60_000));
  }

  addedButton(n: number): Locator {
    return this.page.getByTestId(`added-${n}`);
  }
}
