import type { Locator, Page } from '@playwright/test';

export type Column = 'id' | 'name' | 'department' | 'role' | 'salary' | 'startDate';

/** Salaries are shown as "54,000" (en-GB): strip the separators before doing maths. */
export const toNumber = (text: string) => Number(text.replace(/,/g, ''));

/** The table always starts with the same 47 generated employees. */
export const TOTAL_ROWS = 47;

/** Page object for tables.html. */
export class TablesPage {
  readonly table: Locator;
  readonly bodyRows: Locator;
  readonly filter: Locator;
  readonly deptFilter: Locator;
  readonly pageSize: Locator;
  readonly resetData: Locator;
  readonly salaryTotal: Locator;
  readonly prevPage: Locator;
  readonly nextPage: Locator;
  readonly pageInfo: Locator;
  readonly rowCount: Locator;
  readonly noResults: Locator;

  constructor(private readonly page: Page) {
    this.table = page.getByTestId('employees-table');
    this.bodyRows = this.table.locator('tbody tr');
    this.filter = page.getByTestId('filter');
    this.deptFilter = page.getByTestId('dept-filter');
    this.pageSize = page.getByTestId('page-size');
    this.resetData = page.getByTestId('reset-data');
    this.salaryTotal = page.getByTestId('salary-total');
    this.prevPage = page.getByTestId('prev-page');
    this.nextPage = page.getByTestId('next-page');
    this.pageInfo = page.getByTestId('page-info');
    this.rowCount = page.getByTestId('row-count');
    this.noResults = page.getByTestId('no-results');
  }

  async goto() {
    await this.page.goto('/tables.html');
  }

  /** 50 rows per page fits all 47, so the visible cells are the whole (filtered) set. */
  async showAllRows() {
    await this.pageSize.selectOption('50');
  }

  /** The sort button in a column header. Each click toggles ascending / descending. */
  sortButton(column: Column): Locator {
    const testId = column === 'startDate' ? 'start-date' : column;
    return this.page.getByTestId(`sort-${testId}`);
  }

  /** The <th> that carries aria-sort for a column. */
  header(column: Column): Locator {
    return this.table.locator(`th[data-key="${column}"]`);
  }

  /** Every visible cell in a column, e.g. cells('salary'). */
  cells(column: Column): Locator {
    return this.table.locator(`td[data-col="${column}"]`);
  }

  async columnTexts(column: Column): Promise<string[]> {
    return this.cells(column).allTextContents();
  }

  async visibleSalaries(): Promise<number[]> {
    return (await this.columnTexts('salary')).map(toNumber);
  }

  async visibleIds(): Promise<number[]> {
    return (await this.columnTexts('id')).map(Number);
  }

  row(id: number): Locator {
    return this.page.getByTestId(`row-${id}`);
  }

  cell(id: number, column: Column): Locator {
    return this.row(id).locator(`td[data-col="${column}"]`);
  }

  editButton(id: number): Locator {
    return this.page.getByTestId(`edit-${id}`);
  }

  saveButton(id: number): Locator {
    return this.page.getByTestId(`save-${id}`);
  }

  salaryInput(id: number): Locator {
    return this.page.getByTestId(`salary-input-${id}`);
  }

  deleteButton(id: number): Locator {
    return this.page.getByTestId(`delete-${id}`);
  }

  /** Opens inline edit on a row, types a salary and clicks Save. */
  async editSalary(id: number, value: string) {
    await this.editButton(id).click();
    await this.salaryInput(id).fill(value);
    await this.saveButton(id).click();
  }
}
