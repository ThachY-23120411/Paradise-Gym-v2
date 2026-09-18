const E2ETestRunner = require('../runner');

async function debug() {
  const runner = new E2ETestRunner();
  await runner.init();
  const QTV_PHONE = '0900000001';
  const BRANCH_Q1 = '11111111-1111-1111-1111-111111111111';

  try {
    await runner.openDesktopSession(QTV_PHONE, BRANCH_Q1, 'QTV');
    await runner.navigateTo('members');
    await runner.sleep(1500);

    await runner.page.evaluate(async () => {
      const res = await window.apiClient.members.searchPhone('0987654321');
      const m = res.data?.member || res.data;
      if (m?.id) window.MembersModule.openDetail(m.id);
    });
    await runner.sleep(1500);

    await runner.page.evaluate(() => {
      window.jQuery('.view-actions .dx-button:contains("Sửa hồ sơ")').trigger('dxclick');
    });
    await runner.page.waitForFunction(() => window.jQuery('.member-form-popup:visible').length > 0, { timeout: 10000 });
    await runner.sleep(1000);

    const info = await runner.page.evaluate(() => {
      const pop = window.jQuery('.member-form-popup:visible');
      const form = pop.find('.dx-form').dxForm('instance');
      const ed = form ? form.getEditor('email') : null;
      return {
        popTitle: pop.find('.dx-popup-title').text(),
        formData: form ? form.option('formData') : null,
        edValBefore: ed ? ed.option('value') : null,
        inputValBefore: pop.find('input[type="email"]').val()
      };
    });
    console.log('INFO BEFORE UPDATE:', info);

    // Update with editor
    await runner.page.evaluate(() => {
      const form = window.jQuery('.member-form-popup:visible .dx-form').dxForm('instance');
      if (form) {
        form.getEditor('email').option('value', 'nam.lehoang.updated@gmail.com');
      }
    });
    await runner.sleep(1000);

    const infoAfter = await runner.page.evaluate(() => {
      const pop = window.jQuery('.member-form-popup:visible');
      const form = pop.find('.dx-form').dxForm('instance');
      const ed = form ? form.getEditor('email') : null;
      return {
        formData: form ? form.option('formData') : null,
        edValAfter: ed ? ed.option('value') : null,
        inputValAfter: pop.find('input[type="email"]').val()
      };
    });
    console.log('INFO AFTER UPDATE:', infoAfter);

    await runner.page.screenshot({ path: 'tests/e2e/scratch/test_editor_debug.png' });
  } finally {
    await runner.browser.close();
  }
}
debug();
