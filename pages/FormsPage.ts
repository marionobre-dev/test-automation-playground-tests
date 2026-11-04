import type { Locator, Page } from '@playwright/test';

/** Everything the registration form can be filled with. Only set what a test needs. */
export type Registration = {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  age?: string;
  birthDate?: string; // ISO yyyy-mm-dd, whatever the display locale
  country?: string; // option value, e.g. 'PT'
  languages?: string[];
  experience?: 'junior' | 'mid' | 'senior';
  tools?: ('selenium' | 'playwright' | 'cypress')[];
  satisfaction?: number;
  favColor?: string;
  avatar?: { name: string; mimeType: string; buffer: Buffer };
  bio?: string;
  terms?: boolean;
};

/** The smallest registration that passes validation. */
export const validRegistration = {
  fullName: 'Ana Silva',
  email: 'ana@example.com',
  password: 'Secret123',
  country: 'PT',
  experience: 'mid',
  terms: true,
} satisfies Registration;

/** Page object for forms.html. */
export class FormsPage {
  readonly fullName: Locator;
  readonly email: Locator;
  readonly phone: Locator;
  readonly password: Locator;
  readonly age: Locator;
  readonly birthDate: Locator;
  readonly country: Locator;
  readonly languages: Locator;
  readonly satisfaction: Locator;
  readonly satisfactionValue: Locator;
  readonly favColor: Locator;
  readonly avatar: Locator;
  readonly avatarInfo: Locator;
  readonly bio: Locator;
  readonly bioCount: Locator;
  readonly terms: Locator;
  readonly submitButton: Locator;
  readonly resetButton: Locator;
  readonly status: Locator;
  readonly result: Locator;

  constructor(private readonly page: Page) {
    this.fullName = page.getByTestId('full-name');
    this.email = page.getByTestId('email');
    this.phone = page.getByTestId('phone');
    this.password = page.getByTestId('password');
    this.age = page.getByTestId('age');
    this.birthDate = page.getByTestId('birth-date');
    this.country = page.getByTestId('country');
    this.languages = page.getByTestId('languages');
    this.satisfaction = page.getByTestId('satisfaction');
    this.satisfactionValue = page.getByTestId('satisfaction-value');
    this.favColor = page.getByTestId('fav-color');
    this.avatar = page.getByTestId('avatar');
    this.avatarInfo = page.getByTestId('avatar-info');
    this.bio = page.getByTestId('bio');
    this.bioCount = page.getByTestId('bio-count');
    this.terms = page.getByTestId('terms');
    this.submitButton = page.getByTestId('submit');
    this.resetButton = page.getByTestId('reset');
    this.status = page.getByTestId('form-status');
    this.result = page.getByTestId('form-result');
  }

  async goto() {
    await this.page.goto('/forms.html');
  }

  /** The error message element for a field, e.g. error('full-name'). */
  error(field: string): Locator {
    return this.page.getByTestId(`${field}-error`);
  }

  experienceOption(level: NonNullable<Registration['experience']>): Locator {
    return this.page.getByTestId(`exp-${level}`);
  }

  tool(name: NonNullable<Registration['tools']>[number]): Locator {
    return this.page.getByTestId(`tool-${name}`);
  }

  /** Fills only the fields given, leaving the rest untouched. */
  async fill(data: Registration) {
    if (data.fullName !== undefined) await this.fullName.fill(data.fullName);
    if (data.email !== undefined) await this.email.fill(data.email);
    if (data.phone !== undefined) await this.phone.fill(data.phone);
    if (data.password !== undefined) await this.password.fill(data.password);
    if (data.age !== undefined) await this.age.fill(data.age);
    if (data.birthDate !== undefined) await this.birthDate.fill(data.birthDate);
    if (data.country !== undefined) await this.country.selectOption(data.country);
    if (data.languages !== undefined) await this.languages.selectOption(data.languages);
    if (data.experience !== undefined) await this.experienceOption(data.experience).check();
    for (const t of data.tools ?? []) await this.tool(t).check();
    if (data.satisfaction !== undefined) await this.satisfaction.fill(String(data.satisfaction));
    if (data.favColor !== undefined) await this.favColor.fill(data.favColor);
    if (data.avatar !== undefined) await this.avatar.setInputFiles(data.avatar);
    if (data.bio !== undefined) await this.bio.fill(data.bio);
    if (data.terms !== undefined) await this.terms.setChecked(data.terms);
  }

  async submit() {
    await this.submitButton.click();
  }

  /** The JSON summary shown after a valid submit, parsed into an object. */
  async resultJson(): Promise<Record<string, unknown>> {
    return JSON.parse(await this.result.innerText());
  }
}
