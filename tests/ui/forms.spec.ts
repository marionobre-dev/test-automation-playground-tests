import { test, expect } from '../../fixtures';
import { validRegistration } from '../../pages/FormsPage';

test.beforeEach(async ({ formsPage }) => {
  await formsPage.goto();
});

test.describe('Registration form: validation', () => {
  test('shows every required-field error on an empty submit', async ({ formsPage }) => {
    await formsPage.submit();

    await expect(formsPage.status).toHaveText('Please fix the highlighted fields.');

    const errors = {
      'full-name': 'Full name must be at least 2 characters.',
      email: 'Enter a valid email address.',
      password: 'Password needs 8+ characters and a number.',
      country: 'Please choose a country.',
      experience: 'Choose your experience level.',
      terms: 'You must accept the terms.',
    };
    for (const [field, message] of Object.entries(errors)) {
      await expect(formsPage.error(field), field).toHaveText(message);
    }

    // Optional fields stay quiet when left empty.
    for (const field of ['phone', 'age', 'avatar']) {
      await expect(formsPage.error(field), field).toBeEmpty();
    }

    await expect(formsPage.fullName).toHaveAttribute('aria-invalid', 'true');
    await expect(formsPage.fullName).toBeFocused();
    await expect(formsPage.result).toHaveText('Nothing submitted yet.');
  });

  // Each row sits on one side of a rule's edge. message '' means the value is accepted.
  const boundaries = [
    { field: 'age', value: '17', message: 'Age must be between 18 and 120.' },
    { field: 'age', value: '18', message: '' },
    { field: 'age', value: '120', message: '' },
    { field: 'age', value: '121', message: 'Age must be between 18 and 120.' },
    { field: 'phone', value: '12345678', message: 'Phone must be 9-15 digits.' },
    { field: 'phone', value: '123456789', message: '' },
    { field: 'phone', value: '+351 912 345 678', message: '' },
    { field: 'phone', value: '1234567890123456', message: 'Phone must be 9-15 digits.' },
    { field: 'phone', value: '91234567a', message: 'Phone must be 9-15 digits.' },
    { field: 'password', value: 'abcdefg1', message: '' },
    { field: 'password', value: 'abcdef1', message: 'Password needs 8+ characters and a number.' },
    { field: 'password', value: 'abcdefgh', message: 'Password needs 8+ characters and a number.' },
    { field: 'email', value: 'ana@example', message: 'Enter a valid email address.' },
    { field: 'email', value: 'ana@example.com', message: '' },
    { field: 'full-name', value: 'A', message: 'Full name must be at least 2 characters.' },
    { field: 'full-name', value: 'Al', message: '' },
  ];

  for (const c of boundaries) {
    test(`${c.field} "${c.value}" is ${c.message ? 'rejected' : 'accepted'}`, async ({ page, formsPage }) => {
      await page.getByTestId(c.field).fill(c.value);
      // Validation runs on submit. Other empty fields fail too, but we only read this field's error.
      await formsPage.submit();

      await expect(formsPage.error(c.field)).toHaveText(c.message);
      await expect(page.getByTestId(c.field)).toHaveAttribute('aria-invalid', c.message ? 'true' : 'false');
    });
  }

  test('rejects an avatar over 1 MB, accepts exactly 1 MB', async ({ formsPage }) => {
    await formsPage.fill({ avatar: { name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(1024 * 1024 + 1) } });
    await expect(formsPage.avatarInfo).toHaveText('huge.png (1024 KB)');
    await formsPage.submit();
    await expect(formsPage.error('avatar')).toHaveText('File is larger than 1 MB.');

    await formsPage.fill({ avatar: { name: 'ok.png', mimeType: 'image/png', buffer: Buffer.alloc(1024 * 1024) } });
    await expect(formsPage.avatarInfo).toHaveText('ok.png (1024 KB)');
    await formsPage.submit();
    await expect(formsPage.error('avatar')).toBeEmpty();
  });

  test('clears an error once the field is fixed', async ({ formsPage }) => {
    await formsPage.submit();
    await expect(formsPage.error('email')).not.toBeEmpty();

    await formsPage.fill(validRegistration);
    await formsPage.submit();

    await expect(formsPage.error('email')).toBeEmpty();
    await expect(formsPage.email).toHaveAttribute('aria-invalid', 'false');
    await expect(formsPage.status).toContainText('Thanks Ana Silva');
  });
});

test.describe('Registration form: submitting', () => {
  test('submits every field type and echoes the values back', async ({ formsPage }) => {
    await formsPage.fill({
      ...validRegistration,
      phone: '+351 912 345 678',
      age: '30',
      birthDate: '1995-05-17',
      languages: ['python', 'javascript'],
      tools: ['playwright', 'cypress'],
      satisfaction: 8,
      favColor: '#ff6600',
      avatar: { name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from('fake image bytes') },
      bio: 'I automate all the things.',
    });
    await formsPage.submit();

    await expect(formsPage.status).toHaveText('Thanks Ana Silva, your registration was received.');
    // toEqual, not toMatchObject: the summary must hold exactly these keys and values.
    expect(await formsPage.resultJson()).toEqual({
      fullName: 'Ana Silva',
      email: 'ana@example.com',
      phone: '+351 912 345 678',
      age: 30,
      birthDate: '1995-05-17',
      country: 'PT',
      languages: ['python', 'javascript'],
      experience: 'mid',
      tools: ['playwright', 'cypress'],
      satisfaction: 8,
      favColor: '#ff6600',
      avatar: 'avatar.png',
      bio: 'I automate all the things.',
    });
  });

  test('submits with only the required fields, leaving optional ones at their defaults', async ({ formsPage }) => {
    await formsPage.fill(validRegistration);
    await formsPage.submit();

    expect(await formsPage.resultJson()).toEqual({
      fullName: 'Ana Silva',
      email: 'ana@example.com',
      phone: '',
      age: null,
      birthDate: null,
      country: 'PT',
      languages: [],
      experience: 'mid',
      tools: [],
      satisfaction: 5,
      favColor: '#2f5bd3',
      avatar: null,
      bio: '',
    });
  });

  test('trims spaces around the name and email', async ({ formsPage }) => {
    await formsPage.fill({ ...validRegistration, fullName: '  Ana Silva  ', email: ' ana@example.com ' });
    await formsPage.submit();

    expect(await formsPage.resultJson()).toMatchObject({ fullName: 'Ana Silva', email: 'ana@example.com' });
  });
});

test.describe('Registration form: live widgets and reset', () => {
  test('the slider label follows the slider', async ({ formsPage }) => {
    await expect(formsPage.satisfactionValue).toHaveText('5');
    await formsPage.fill({ satisfaction: 9 });
    await expect(formsPage.satisfactionValue).toHaveText('9');
  });

  test('the bio counter tracks length and stops at 200 characters', async ({ formsPage }) => {
    await expect(formsPage.bioCount).toHaveText('0/200');

    await formsPage.bio.fill('Hello');
    await expect(formsPage.bioCount).toHaveText('5/200');

    // maxlength stops typing at 200. pressSequentially types like a user would,
    // whereas fill() would bypass the limit.
    await formsPage.bio.clear();
    await formsPage.bio.pressSequentially('x'.repeat(205));
    await expect(formsPage.bio).toHaveValue('x'.repeat(200));
    await expect(formsPage.bioCount).toHaveText('200/200');
  });

  test('reset clears values, errors and the result', async ({ formsPage }) => {
    // A failed submit first, so there are errors to clear.
    await formsPage.fill({ fullName: 'A', satisfaction: 9, bio: 'Hello' });
    await formsPage.submit();
    await expect(formsPage.error('full-name')).not.toBeEmpty();

    await formsPage.resetButton.click();

    await expect(formsPage.fullName).toHaveValue('');
    await expect(formsPage.fullName).not.toHaveAttribute('aria-invalid');
    await expect(formsPage.error('full-name')).toBeEmpty();
    await expect(formsPage.satisfactionValue).toHaveText('5');
    await expect(formsPage.bioCount).toHaveText('0/200');
    await expect(formsPage.status).toBeHidden();
    await expect(formsPage.result).toHaveText('Nothing submitted yet.');
  });
});
