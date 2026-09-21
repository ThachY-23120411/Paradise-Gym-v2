const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registrationState } = require('../../backend/src/modules/core/registrationState');

const day = '2026-09-21';
const base = {
  status: 'ACTIVE', is_paid: true, start_date: '2026-09-01', end_date: '2026-10-21',
  package_type_snapshot: 'COMBO', remaining_pt_sessions: 10,
  total_gym_sessions_snapshot: 0, remaining_gym_sessions: 0
};
const cases = [
  ['time at four days', { package_type_snapshot: 'GYM_TIME', end_date: '2026-09-25' }, true],
  ['time at five days', { package_type_snapshot: 'GYM_TIME', end_date: '2026-09-26' }, false],
  ['time on last date', { package_type_snapshot: 'GYM_TIME', end_date: day }, true],
  ['time past date', { package_type_snapshot: 'GYM_TIME', end_date: '2026-09-20' }, false],
  ['time ignores absent session benefits', { package_type_snapshot: 'GYM_TIME', remaining_pt_sessions: 0 }, false],
  ['gym at three sessions', { package_type_snapshot: 'GYM_SESSION', remaining_gym_sessions: 3 }, true],
  ['gym at four sessions', { package_type_snapshot: 'GYM_SESSION', remaining_gym_sessions: 4 }, false],
  ['pt at three sessions', { package_type_snapshot: 'PT_SESSION', remaining_pt_sessions: 3 }, true],
  ['pt at four sessions', { package_type_snapshot: 'PT_SESSION', remaining_pt_sessions: 4 }, false],
  ['numeric session string', { package_type_snapshot: 'PT_SESSION', remaining_pt_sessions: '3' }, true],
  ['missing count does not imply zero', { package_type_snapshot: 'PT_SESSION', remaining_pt_sessions: null }, false],
  ['combo date only', { end_date: '2026-09-25' }, true],
  ['combo pt only', { remaining_pt_sessions: 3 }, true],
  ['combo gym benefit only', { total_gym_sessions_snapshot: 20, remaining_gym_sessions: 3 }, true],
  ['combo both thresholds', { end_date: '2026-09-25', remaining_pt_sessions: 3 }, true],
  ['combo neither threshold', {}, false],
  ['combo no gym quota ignores zero gym remaining', { remaining_gym_sessions: 0 }, false],
  ['undated pt uses count', { package_type_snapshot: 'PT_SESSION', end_date: null, remaining_pt_sessions: 3 }, true],
  ['pending cannot be near expiry', { status: 'PENDING_PAYMENT', remaining_pt_sessions: 3 }, false],
  ['unpaid cannot be near expiry', { is_paid: false, remaining_pt_sessions: 3 }, false],
  ['future contract cannot be near expiry', { status: 'SCHEDULED', start_date: '2026-09-22', remaining_pt_sessions: 3 }, false],
  ['cancelled cannot be near expiry', { status: 'CANCELLED', remaining_pt_sessions: 3 }, false],
  ['frozen cannot be near expiry', { is_frozen: true, remaining_pt_sessions: 3 }, false]
];
for (const [name, fields, expected] of cases) test(name, () => {
  const result = registrationState({ ...base, ...fields }, day);
  assert.equal(result.is_expiring, expected);
  assert.equal(result.display_status === 'EXPIRING', expected);
  if (expected) assert.equal(result.status, 'ACTIVE', 'Near expiry must not revoke active eligibility');
});
