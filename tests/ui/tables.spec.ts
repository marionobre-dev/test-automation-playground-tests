import { test, expect } from '../../fixtures';
import { TOTAL_ROWS, toNumber } from '../../pages/TablesPage';

const sum = (values: number[]) => values.reduce((total, v) => total + v, 0);

test.beforeEach(async ({ tablesPage }) => {
  await tablesPage.goto();
});

test.describe('Employees table: initial state', () => {
  test('starts on page 1 of 5, sorted by ID', async ({ tablesPage }) => {
    await expect(tablesPage.bodyRows).toHaveCount(10);
    await expect(tablesPage.pageInfo).toHaveText('Page 1 of 5');
    await expect(tablesPage.rowCount).toHaveText(`${TOTAL_ROWS} of ${TOTAL_ROWS} rows`);
    await expect(tablesPage.prevPage).toBeDisabled();
    await expect(tablesPage.nextPage).toBeEnabled();

    await expect(tablesPage.header('id')).toHaveAttribute('aria-sort', 'ascending');
    await expect(tablesPage.header('salary')).toHaveAttribute('aria-sort', 'none');
    expect(await tablesPage.visibleIds()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test('loads the same data every time', async ({ page, tablesPage }) => {
    await tablesPage.showAllRows();
    const before = await tablesPage.bodyRows.allInnerTexts();
    const totalBefore = await tablesPage.salaryTotal.innerText();

    await page.reload();
    await tablesPage.showAllRows();

    expect(await tablesPage.bodyRows.allInnerTexts()).toEqual(before);
    await expect(tablesPage.salaryTotal).toHaveText(totalBefore);
  });

  test('the footer total is the sum of every salary', async ({ tablesPage }) => {
    await tablesPage.showAllRows();
    const salaries = await tablesPage.visibleSalaries();

    expect(salaries).toHaveLength(TOTAL_ROWS);
    expect(toNumber(await tablesPage.salaryTotal.innerText())).toBe(sum(salaries));
  });
});

test.describe('Employees table: sorting', () => {
  test.beforeEach(async ({ tablesPage }) => {
    await tablesPage.showAllRows();
  });

  test('sorts salaries ascending, then descending', async ({ tablesPage }) => {
    await tablesPage.sortButton('salary').click();
    await expect(tablesPage.header('salary')).toHaveAttribute('aria-sort', 'ascending');
    await expect(tablesPage.header('id')).toHaveAttribute('aria-sort', 'none');
    let salaries = await tablesPage.visibleSalaries();
    expect(salaries).toHaveLength(TOTAL_ROWS);
    // Compare with a copy we sort ourselves: never trust the app to check the app.
    expect(salaries).toEqual([...salaries].sort((a, b) => a - b));

    await tablesPage.sortButton('salary').click();
    await expect(tablesPage.header('salary')).toHaveAttribute('aria-sort', 'descending');
    salaries = await tablesPage.visibleSalaries();
    expect(salaries).toEqual([...salaries].sort((a, b) => b - a));
  });

  test('sorts start dates chronologically', async ({ tablesPage }) => {
    await tablesPage.sortButton('startDate').click();
    await expect(tablesPage.header('startDate')).toHaveAttribute('aria-sort', 'ascending');

    // ISO dates (yyyy-mm-dd) sort correctly as plain strings.
    const dates = await tablesPage.columnTexts('startDate');
    for (const d of dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dates).toEqual([...dates].sort());
  });

  test('sorts names alphabetically, and descending reverses it', async ({ tablesPage }) => {
    await tablesPage.sortButton('name').click();
    await expect(tablesPage.header('name')).toHaveAttribute('aria-sort', 'ascending');
    const ascending = await tablesPage.columnTexts('name');
    // Names include accents (Inês, Müller), so compare with a real collator, not < and >.
    expect(ascending).toEqual([...ascending].sort(new Intl.Collator('en-US').compare));

    await tablesPage.sortButton('name').click();
    await expect(tablesPage.header('name')).toHaveAttribute('aria-sort', 'descending');
    expect(await tablesPage.columnTexts('name')).toEqual([...ascending].reverse());
  });

  test('clicking a new column starts it ascending', async ({ tablesPage }) => {
    await tablesPage.sortButton('salary').click();
    await tablesPage.sortButton('salary').click();
    await expect(tablesPage.header('salary')).toHaveAttribute('aria-sort', 'descending');

    await tablesPage.sortButton('id').click();
    await expect(tablesPage.header('id')).toHaveAttribute('aria-sort', 'ascending');
    await expect(tablesPage.header('salary')).toHaveAttribute('aria-sort', 'none');
    expect(await tablesPage.visibleIds()).toEqual(Array.from({ length: TOTAL_ROWS }, (_, i) => i + 1));
  });
});

test.describe('Employees table: filtering', () => {
  test.beforeEach(async ({ tablesPage }) => {
    await tablesPage.showAllRows();
  });

  test('filters by department and totals the salaries', async ({ tablesPage }) => {
    await tablesPage.deptFilter.selectOption('Engineering');

    await expect(tablesPage.rowCount).toHaveText(`10 of ${TOTAL_ROWS} rows`);
    expect(new Set(await tablesPage.columnTexts('department'))).toEqual(new Set(['Engineering']));
    expect(toNumber(await tablesPage.salaryTotal.innerText())).toBe(sum(await tablesPage.visibleSalaries()));
  });

  test('every employee belongs to exactly one department filter', async ({ tablesPage }) => {
    const departments = (await tablesPage.deptFilter.locator('option').evaluateAll((options) =>
      options.map((o) => (o as HTMLOptionElement).value))).filter(Boolean);
    expect(departments).toEqual(['Engineering', 'Finance', 'HR', 'Sales', 'Support']);

    let counted = 0;
    for (const dept of departments) {
      await tablesPage.deptFilter.selectOption(dept);
      // Wait for the re-render, then read the count from the counter.
      await expect(tablesPage.rowCount).toHaveText(new RegExp(`^\\d+ of ${TOTAL_ROWS} rows$`));
      await expect.poll(async () => new Set(await tablesPage.columnTexts('department'))).toEqual(new Set([dept]));
      counted += await tablesPage.bodyRows.count();
    }
    expect(counted).toBe(TOTAL_ROWS);
  });

  test('the text filter matches any column, ignoring case', async ({ tablesPage }) => {
    await tablesPage.filter.fill('sdet');

    await expect(tablesPage.rowCount).not.toHaveText(`${TOTAL_ROWS} of ${TOTAL_ROWS} rows`);
    const rows = await tablesPage.bodyRows.allInnerTexts();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.toLowerCase()).toContain('sdet');
    expect(new Set(await tablesPage.columnTexts('role'))).toEqual(new Set(['SDET']));
  });

  test('combines the text and department filters', async ({ tablesPage }) => {
    await tablesPage.deptFilter.selectOption('Support');
    await tablesPage.filter.fill('Team Lead');

    const roles = await tablesPage.columnTexts('role');
    expect(roles.length).toBeGreaterThan(0);
    expect(new Set(roles)).toEqual(new Set(['Team Lead']));
    expect(new Set(await tablesPage.columnTexts('department'))).toEqual(new Set(['Support']));
  });

  test('shows a message when nothing matches', async ({ tablesPage }) => {
    await tablesPage.filter.fill('zzz-nobody');

    await expect(tablesPage.noResults).toHaveText('No matching employees.');
    await expect(tablesPage.rowCount).toHaveText(`0 of ${TOTAL_ROWS} rows`);
    await expect(tablesPage.salaryTotal).toHaveText('0');
    await expect(tablesPage.pageInfo).toHaveText('Page 1 of 1');
    await expect(tablesPage.prevPage).toBeDisabled();
    await expect(tablesPage.nextPage).toBeDisabled();

    await tablesPage.filter.clear();
    await expect(tablesPage.rowCount).toHaveText(`${TOTAL_ROWS} of ${TOTAL_ROWS} rows`);
  });
});

test.describe('Employees table: paging', () => {
  test('walks every page, collecting each ID once', async ({ tablesPage }) => {
    const ids: number[] = [];

    while (true) {
      ids.push(...(await tablesPage.visibleIds()));
      // isDisabled() reads the state right now, which is what a loop condition needs.
      if (await tablesPage.nextPage.isDisabled()) break;
      const info = await tablesPage.pageInfo.innerText();
      await tablesPage.nextPage.click();
      await expect(tablesPage.pageInfo).not.toHaveText(info);
    }

    await expect(tablesPage.pageInfo).toHaveText('Page 5 of 5');
    await expect(tablesPage.bodyRows).toHaveCount(7);
    expect(ids).toHaveLength(TOTAL_ROWS);
    expect(new Set(ids).size).toBe(TOTAL_ROWS);
  });

  test('Previous goes back and is disabled on the first page', async ({ tablesPage }) => {
    await tablesPage.nextPage.click();
    await expect(tablesPage.pageInfo).toHaveText('Page 2 of 5');
    await expect(tablesPage.prevPage).toBeEnabled();
    expect(await tablesPage.visibleIds()).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);

    await tablesPage.prevPage.click();
    await expect(tablesPage.pageInfo).toHaveText('Page 1 of 5');
    await expect(tablesPage.prevPage).toBeDisabled();
  });

  const pageSizes = [
    { size: '5', pages: 10, lastPageRows: 2 },
    { size: '25', pages: 2, lastPageRows: 22 },
    { size: '50', pages: 1, lastPageRows: 47 },
  ];

  for (const { size, pages, lastPageRows } of pageSizes) {
    test(`${size} rows per page gives ${pages} page(s)`, async ({ tablesPage }) => {
      await tablesPage.pageSize.selectOption(size);

      await expect(tablesPage.pageInfo).toHaveText(`Page 1 of ${pages}`);
      await expect(tablesPage.bodyRows).toHaveCount(Math.min(Number(size), TOTAL_ROWS));

      for (let p = 2; p <= pages; p++) await tablesPage.nextPage.click();
      await expect(tablesPage.pageInfo).toHaveText(`Page ${pages} of ${pages}`);
      await expect(tablesPage.bodyRows).toHaveCount(lastPageRows);
      await expect(tablesPage.nextPage).toBeDisabled();
    });
  }

  test('changing a filter goes back to page 1', async ({ tablesPage }) => {
    await tablesPage.nextPage.click();
    await tablesPage.nextPage.click();
    await expect(tablesPage.pageInfo).toHaveText('Page 3 of 5');

    await tablesPage.filter.fill('a');
    await expect(tablesPage.pageInfo).toHaveText(/^Page 1 of \d+$/);
  });
});

test.describe('Employees table: editing and deleting', () => {
  test('edits a salary inline and updates the total', async ({ tablesPage }) => {
    const oldSalary = toNumber(await tablesPage.cell(1, 'salary').innerText());
    const oldTotal = toNumber(await tablesPage.salaryTotal.innerText());

    await tablesPage.editButton(1).click();
    // The input only exists in edit mode, and starts with the current salary.
    await expect(tablesPage.salaryInput(1)).toBeFocused();
    await expect(tablesPage.salaryInput(1)).toHaveValue(String(oldSalary));
    await tablesPage.salaryInput(1).fill('99999');
    await tablesPage.saveButton(1).click();

    await expect(tablesPage.cell(1, 'salary')).toHaveText('99,999');
    await expect(tablesPage.salaryInput(1)).toHaveCount(0);
    expect(toNumber(await tablesPage.salaryTotal.innerText())).toBe(oldTotal - oldSalary + 99999);
  });

  test('refuses a salary that is not positive', async ({ page, tablesPage }) => {
    const oldSalary = await tablesPage.cell(2, 'salary').innerText();

    let message = '';
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('alert');
      message = dialog.message();
      await dialog.accept();
    });
    await tablesPage.editSalary(2, '0');

    await expect.poll(() => message).toBe('Salary must be a positive number.');
    // Still in edit mode; nothing was saved.
    await expect(tablesPage.salaryInput(2)).toBeVisible();
    await page.reload();
    await expect(tablesPage.cell(2, 'salary')).toHaveText(oldSalary);
  });

  test('deletes a row after confirming', async ({ page, tablesPage }) => {
    const name = await tablesPage.cell(3, 'name').innerText();

    // Dialogs must be handled BEFORE the click that opens them.
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toBe(`Delete ${name}?`);
      await dialog.accept();
    });
    await tablesPage.deleteButton(3).click();

    await expect(tablesPage.row(3)).toHaveCount(0);
    await expect(tablesPage.rowCount).toHaveText(`${TOTAL_ROWS - 1} of ${TOTAL_ROWS - 1} rows`);
    // Row 11 moves up to fill page 1.
    expect(await tablesPage.visibleIds()).toEqual([1, 2, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  test('keeps the row when the delete is cancelled', async ({ page, tablesPage }) => {
    page.once('dialog', (dialog) => dialog.dismiss());
    await tablesPage.deleteButton(3).click();

    await expect(tablesPage.row(3)).toBeVisible();
    await expect(tablesPage.rowCount).toHaveText(`${TOTAL_ROWS} of ${TOTAL_ROWS} rows`);
  });

  test('Reset data restores edited and deleted rows', async ({ page, tablesPage }) => {
    const salary1 = await tablesPage.cell(1, 'salary').innerText();
    const total = await tablesPage.salaryTotal.innerText();

    await tablesPage.editSalary(1, '12345');
    await expect(tablesPage.cell(1, 'salary')).toHaveText('12,345');
    page.once('dialog', (dialog) => dialog.accept());
    await tablesPage.deleteButton(3).click();
    await expect(tablesPage.row(3)).toHaveCount(0);

    await tablesPage.resetData.click();

    await expect(tablesPage.row(3)).toBeVisible();
    await expect(tablesPage.cell(1, 'salary')).toHaveText(salary1);
    await expect(tablesPage.rowCount).toHaveText(`${TOTAL_ROWS} of ${TOTAL_ROWS} rows`);
    await expect(tablesPage.salaryTotal).toHaveText(total);
  });
});
