/**
 * Personal Finance Tracker - Full API Test Suite (A to Z)
 * Run: node test_all.js
 */

const http = require('http');

const BASE = 'http://localhost:5000/api';
let PASS = 0, FAIL = 0;
const ISSUES = [];
const TS = Date.now() % 100000; // keep short so username fits in 20 chars
const TEST_USER = `tu_${TS}`;   // max 20 chars
const TEST_EMAIL = `test${TS}@example.com`;
const TEST_PASS = 'TestPass123!';

let TOKEN = '';
let TOKEN2 = '';
let TXN_ID = '';
let GOAL_ID = '';
let BUDGET_ID = '';
let WALLET_ID = '';
let SUB_ID = '';
let INV_ID = '';
let SMS_TOKEN = '';
let NEW_USERNAME = `upd${TS}`;  // max 20 chars

// ── HTTP Helper ────────────────────────────────────────────────────────────────
function req(method, path, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const r = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(Buffer.concat(chunks).toString()); } catch (_) {}
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', (e) => resolve({ status: 0, body: null, error: e.message }));
    if (data) r.write(data);
    r.end();
  });
}

// ── Test checker ────────────────────────────────────────────────────────────────
function check(name, condition, failReason = '') {
  if (condition) {
    console.log(`  [PASS] ${name}`);
    PASS++;
  } else {
    console.log(`  [FAIL] ${name}  --> ${failReason}`);
    FAIL++;
    ISSUES.push(`[${name}] ${failReason}`);
  }
}

function header(title) {
  console.log('\n======================================================');
  console.log(`  ${title}`);
  console.log('======================================================');
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function runTests() {

  // ── 1. HEALTH CHECK ──────────────────────────────────────────────────────────
  header('1. HEALTH CHECK');
  let r = await req('GET', '/health');
  check('Server health endpoint', r.status === 200 && r.body?.status === 'ok', `status=${r.status}`);
  if (r.body) console.log(`     DB: ${r.body.database}`);

  // ── 2. AUTH - REGISTRATION ───────────────────────────────────────────────────
  header('2. AUTH - REGISTRATION');

  r = await req('POST', '/auth/register', { username: TEST_USER, email: TEST_EMAIL, password: TEST_PASS });
  check('Register new user (201)', r.status === 201 && r.body?.token, `status=${r.status}`);
  if (r.body?.token) TOKEN = r.body.token;

  r = await req('POST', '/auth/register', { username: TEST_USER, email: TEST_EMAIL, password: TEST_PASS });
  check('Reject duplicate username/email (409)', r.status === 409, `Expected 409, got ${r.status}`);

  r = await req('POST', '/auth/register', { username: 'x' });
  check('Reject incomplete registration (400)', r.status === 400, `Expected 400, got ${r.status}`);

  r = await req('POST', '/auth/register', { username: TEST_USER, email: 'bademail', password: '123456' });
  check('Reject invalid email format', r.status === 400 || r.status === 409, `Expected 400/409, got ${r.status}`);

  // ── 3. AUTH - LOGIN ──────────────────────────────────────────────────────────
  header('3. AUTH - LOGIN');

  r = await req('POST', '/auth/login', { username: TEST_USER, password: TEST_PASS });
  check('Login with valid credentials (200)', r.status === 200 && r.body?.token, `status=${r.status}`);
  if (r.body?.token) TOKEN = r.body.token;

  r = await req('POST', '/auth/login', { username: TEST_EMAIL, password: TEST_PASS });
  check('Login with email instead of username (200)', r.status === 200 && r.body?.token, `status=${r.status}`);

  r = await req('POST', '/auth/login', { username: TEST_USER, password: 'wrongpass' });
  check('Reject wrong password (401)', r.status === 401, `Expected 401, got ${r.status}`);

  r = await req('POST', '/auth/login', { username: 'nonexistent9999', password: 'anything' });
  check('Reject non-existent user login (401)', r.status === 401, `Expected 401, got ${r.status}`);

  // ── 4. AUTH - TOKEN VERIFICATION ─────────────────────────────────────────────
  header('4. AUTH - TOKEN VERIFICATION');

  r = await req('GET', '/auth/me', null, TOKEN);
  check('GET /auth/me with valid token (200)', r.status === 200 && r.body?.user, `status=${r.status}`);

  r = await req('GET', '/auth/me');
  check('Block /auth/me with no token (401)', r.status === 401, `Expected 401, got ${r.status}`);

  r = await req('GET', '/auth/me', null, 'badtoken999abc');
  check('Block /auth/me with bad token (401)', r.status === 401, `Expected 401, got ${r.status}`);

  // ── 5. AUTH - PASSWORD RESET FLOW ────────────────────────────────────────────
  header('5. AUTH - PASSWORD RESET FLOW');

  r = await req('POST', '/auth/forgot-password', { email: TEST_EMAIL });
  check('Forgot password for existing email (200)', r.status === 200 && r.body?.message, `status=${r.status}`);

  r = await req('POST', '/auth/forgot-password', { email: 'nonexistent@example.com' });
  check('Forgot password for unknown email returns safe 200', r.status === 200, `status=${r.status}`);

  r = await req('POST', '/auth/forgot-password', {});
  check('Forgot password without email returns 400', r.status === 400, `Expected 400, got ${r.status}`);

  r = await req('POST', '/auth/reset-password', { token: 'faketoken', email: TEST_EMAIL, password: 'newpass123' });
  check('Reject invalid reset token (400)', r.status === 400, `Expected 400, got ${r.status}`);

  r = await req('POST', '/auth/reset-password', { token: 'tok', email: TEST_EMAIL, password: 'abc12' });
  check('Reject reset password < 8 chars (400)', r.status === 400, `Expected 400, got ${r.status}`);

  // ── 6. TRANSACTIONS - CRUD ───────────────────────────────────────────────────
  header('6. TRANSACTIONS - CRUD');

  r = await req('POST', '/transactions/add', {
    type: 'expense', category: 'Food', amount: 500,
    date: '2026-05-01', description: 'Dinner at restaurant', merchant: 'Swiggy'
  }, TOKEN);
  check('Add expense transaction (201)', r.status === 201 && r.body?.transaction?._id, `status=${r.status}`);
  if (r.body?.transaction?._id) TXN_ID = r.body.transaction._id;

  r = await req('POST', '/transactions/add', {
    type: 'income', category: 'Salary', amount: 50000,
    date: '2026-05-01', description: 'Monthly salary'
  }, TOKEN);
  check('Add income transaction (201)', r.status === 201, `status=${r.status}`);

  r = await req('POST', '/transactions/add', {
    type: 'expense', category: 'Rent', amount: 15000, date: '2026-05-01',
    description: 'Monthly rent', isRecurring: true, frequency: 'monthly'
  }, TOKEN);
  check('Add recurring transaction (201)', r.status === 201, `status=${r.status}`);

  r = await req('GET', '/transactions', null, TOKEN);
  check('GET all transactions', r.status === 200 && Array.isArray(r.body?.data), `status=${r.status}`);
  if (r.body?.total !== undefined) console.log(`     Found: ${r.body.total} transactions`);

  r = await req('GET', '/transactions?type=expense', null, TOKEN);
  check('GET transactions filtered by type=expense', r.status === 200, `status=${r.status}`);

  r = await req('GET', '/transactions?type=income', null, TOKEN);
  check('GET transactions filtered by type=income', r.status === 200, `status=${r.status}`);

  r = await req('GET', '/transactions?category=Food', null, TOKEN);
  check('GET transactions filtered by category', r.status === 200, `status=${r.status}`);

  r = await req('GET', '/transactions?dateFrom=2026-05-01&dateTo=2026-05-31', null, TOKEN);
  check('GET transactions with date range filter', r.status === 200, `status=${r.status}`);

  r = await req('GET', '/transactions?search=Dinner', null, TOKEN);
  check('GET transactions with search query', r.status === 200, `status=${r.status}`);

  r = await req('GET', '/transactions?page=1&limit=5', null, TOKEN);
  check('GET transactions with pagination', r.status === 200, `status=${r.status}`);

  r = await req('GET', '/transactions?sortField=amount&sortDir=asc', null, TOKEN);
  check('GET transactions with sort (amount asc)', r.status === 200, `status=${r.status}`);

  r = await req('GET', '/transactions?limit=0', null, TOKEN);
  check('GET all transactions with limit=0 (no pagination)', r.status === 200, `status=${r.status}`);

  r = await req('GET', '/transactions/summary', null, TOKEN);
  check('GET transaction summary (income/expenses/net)', r.status === 200 && r.body?.income !== undefined, `status=${r.status}`);

  if (TXN_ID) {
    r = await req('GET', `/transactions/${TXN_ID}`, null, TOKEN);
    check('GET single transaction by ID', r.status === 200, `status=${r.status}`);

    r = await req('POST', `/transactions/update/${TXN_ID}`, {
      type: 'expense', category: 'Food & Dining', amount: 600,
      date: '2026-05-01', description: 'Updated dinner'
    }, TOKEN);
    check('UPDATE transaction', r.status === 200, `status=${r.status}`);

    r = await req('GET', `/transactions/${TXN_ID}`, null, TOKEN);
    check('Updated transaction has new amount (600)', r.body?.amount === 600, `amount=${r.body?.amount}`);

    r = await req('GET', `/transactions/${TXN_ID}`);
    check('Block unauthenticated GET transaction (401)', r.status === 401, `Expected 401, got ${r.status}`);

    r = await req('DELETE', `/transactions/${TXN_ID}`, null, TOKEN);
    check('DELETE transaction', r.status === 200, `status=${r.status}`);

    r = await req('GET', `/transactions/${TXN_ID}`, null, TOKEN);
    check('Deleted transaction returns 404', r.status === 404, `Expected 404, got ${r.status}`);
  }

  r = await req('GET', '/transactions');
  check('Block unauthenticated GET /transactions (401)', r.status === 401, `Expected 401, got ${r.status}`);

  // ── 7. GOALS - CRUD ──────────────────────────────────────────────────────────
  header('7. GOALS - CRUD');

  r = await req('POST', '/goals/add', {
    name: 'Buy a Car', targetAmount: 500000, currentAmount: 50000, deadline: '2027-12-31'
  }, TOKEN);
  check('Add savings goal (201)', r.status === 201 && r.body?.goal?._id, `status=${r.status}`);
  if (r.body?.goal?._id) GOAL_ID = r.body.goal._id;

  r = await req('GET', '/goals', null, TOKEN);
  check('GET all goals', r.status === 200, `status=${r.status}`);

  if (GOAL_ID) {
    r = await req('POST', `/goals/update/${GOAL_ID}`, {
      name: 'Buy a Car', targetAmount: 500000, currentAmount: 100000
    }, TOKEN);
    check('UPDATE goal (add contribution)', r.status === 200, `status=${r.status}`);
    check('Updated goal currentAmount is 100000', r.body?.goal?.currentAmount === 100000, `amount=${r.body?.goal?.currentAmount}`);

    r = await req('DELETE', `/goals/${GOAL_ID}`, null, TOKEN);
    check('DELETE goal', r.status === 200, `status=${r.status}`);

    r = await req('DELETE', `/goals/${GOAL_ID}`, null, TOKEN);
    check('Deleted goal returns 404', r.status === 404, `Expected 404, got ${r.status}`);
  }

  r = await req('GET', '/goals');
  check('Block unauthenticated GET /goals (401)', r.status === 401, `Expected 401, got ${r.status}`);

  // ── 8. BUDGETS - CRUD ────────────────────────────────────────────────────────
  header('8. BUDGETS - CRUD');

  r = await req('POST', '/budgets/add', { category: 'Food', limit: 5000 }, TOKEN);
  check('Add/upsert budget', r.status === 200 && r.body?.budget?._id, `status=${r.status}`);
  if (r.body?.budget?._id) BUDGET_ID = r.body.budget._id;

  r = await req('GET', '/budgets', null, TOKEN);
  check('GET all budgets', r.status === 200, `status=${r.status}`);

  r = await req('POST', '/budgets/add', { category: 'Food', limit: 7000 }, TOKEN);
  check('Upsert budget (same category, new limit)', r.status === 200, `status=${r.status}`);

  if (BUDGET_ID) {
    r = await req('DELETE', `/budgets/${BUDGET_ID}`, null, TOKEN);
    check('DELETE budget', r.status === 200, `status=${r.status}`);

    r = await req('DELETE', `/budgets/${BUDGET_ID}`, null, TOKEN);
    check('Deleted budget returns 404', r.status === 404, `Expected 404, got ${r.status}`);
  }

  // ── 9. WALLETS - CRUD ────────────────────────────────────────────────────────
  header('9. WALLETS - CRUD');

  r = await req('POST', '/wallets', {
    name: 'HDFC Savings', type: 'bank', balance: 25000, currency: 'INR', isDefault: true
  }, TOKEN);
  check('Create wallet (201)', r.status === 201 && r.body?._id, `status=${r.status}`);
  if (r.body?._id) WALLET_ID = r.body._id;

  r = await req('GET', '/wallets', null, TOKEN);
  check('GET wallets with totalBalance field', r.status === 200 && r.body?.totalBalance !== undefined, `status=${r.status}`);

  r = await req('POST', '/wallets', { type: 'bank', balance: 1000 }, TOKEN);
  check('Reject wallet without name (400)', r.status === 400, `Expected 400, got ${r.status}`);

  if (WALLET_ID) {
    r = await req('PATCH', `/wallets/${WALLET_ID}`, { balance: 30000, notes: 'Updated' }, TOKEN);
    check('PATCH wallet (update balance)', r.status === 200, `status=${r.status}`);

    r = await req('DELETE', `/wallets/${WALLET_ID}`, null, TOKEN);
    check('DELETE wallet', r.status === 200, `status=${r.status}`);

    r = await req('DELETE', `/wallets/${WALLET_ID}`, null, TOKEN);
    check('Deleted wallet returns 404', r.status === 404, `Expected 404, got ${r.status}`);
  }

  // ── 10. SUBSCRIPTIONS - CRUD ─────────────────────────────────────────────────
  header('10. SUBSCRIPTIONS - CRUD');

  r = await req('POST', '/subscriptions', {
    name: 'Netflix', amount: 649, billingCycle: 'monthly',
    category: 'Entertainment', renewalDate: '2026-07-01'
  }, TOKEN);
  check('Create subscription (201)', r.status === 201 && r.body?._id, `status=${r.status}`);
  if (r.body?._id) SUB_ID = r.body._id;

  r = await req('GET', '/subscriptions', null, TOKEN);
  check('GET subscriptions with monthlyTotal', r.status === 200 && r.body?.monthlyTotal !== undefined, `status=${r.status}`);

  r = await req('POST', '/subscriptions', { billingCycle: 'monthly' }, TOKEN);
  check('Reject subscription without name/amount (400)', r.status === 400, `Expected 400, got ${r.status}`);

  r = await req('POST', '/subscriptions', {
    name: 'YouTube Premium', amount: 1190, billingCycle: 'yearly', category: 'Entertainment'
  }, TOKEN);
  check('Create yearly subscription (201)', r.status === 201, `status=${r.status}`);

  if (SUB_ID) {
    r = await req('PATCH', `/subscriptions/${SUB_ID}`, { amount: 799 }, TOKEN);
    check('PATCH subscription', r.status === 200, `status=${r.status}`);

    r = await req('DELETE', `/subscriptions/${SUB_ID}`, null, TOKEN);
    check('DELETE subscription', r.status === 200, `status=${r.status}`);

    r = await req('DELETE', `/subscriptions/${SUB_ID}`, null, TOKEN);
    check('Deleted subscription returns 404', r.status === 404, `Expected 404, got ${r.status}`);
  }

  // ── 11. INVESTMENTS - CRUD ───────────────────────────────────────────────────
  header('11. INVESTMENTS - CRUD');

  r = await req('POST', '/investments', {
    name: 'Reliance Industries', type: 'stocks',
    investedAmount: 10000, currentValue: 12000, units: 5, purchaseDate: '2025-01-15'
  }, TOKEN);
  check('Create investment (201)', r.status === 201 && r.body?._id, `status=${r.status}`);
  if (r.body?._id) INV_ID = r.body._id;

  r = await req('GET', '/investments', null, TOKEN);
  check('GET investments with P&L summary', r.status === 200 && r.body?.summary, `status=${r.status}`);
  if (r.body?.summary) console.log(`     P&L: Rs.${r.body.summary.totalPnL}`);

  r = await req('POST', '/investments', { name: 'Test Stock' }, TOKEN);
  check('Reject investment without investedAmount (400)', r.status === 400, `Expected 400, got ${r.status}`);

  if (INV_ID) {
    r = await req('PATCH', `/investments/${INV_ID}`, { currentValue: 13500 }, TOKEN);
    check('PATCH investment (update current value)', r.status === 200, `status=${r.status}`);

    r = await req('DELETE', `/investments/${INV_ID}`, null, TOKEN);
    check('DELETE investment', r.status === 200, `status=${r.status}`);

    r = await req('DELETE', `/investments/${INV_ID}`, null, TOKEN);
    check('Deleted investment returns 404', r.status === 404, `Expected 404, got ${r.status}`);
  }

  // ── 12. USER PROFILE MANAGEMENT ─────────────────────────────────────────────
  header('12. USER PROFILE MANAGEMENT');

  r = await req('GET', '/users/stats', null, TOKEN);
  check('GET user stats', r.status === 200 && r.body?.username, `status=${r.status}`);

  r = await req('PATCH', '/users/profile', { username: NEW_USERNAME }, TOKEN);
  check('PATCH user profile (username)', r.status === 200 && r.body?.user?.username === NEW_USERNAME, `status=${r.status}`);

  // Re-login with new username
  r = await req('POST', '/auth/login', { username: NEW_USERNAME, password: TEST_PASS });
  if (r.body?.token) TOKEN = r.body.token;

  r = await req('PATCH', '/users/password', { currentPassword: TEST_PASS, newPassword: 'NewPass456!' }, TOKEN);
  check('PATCH user password', r.status === 200, `status=${r.status}`);

  // Re-login with new password
  r = await req('POST', '/auth/login', { username: NEW_USERNAME, password: 'NewPass456!' });
  if (r.body?.token) TOKEN = r.body.token;

  r = await req('PATCH', '/users/password', { currentPassword: 'WrongPass', newPassword: 'Something' }, TOKEN);
  check('Reject wrong current password (401)', r.status === 401, `Expected 401, got ${r.status}`);

  // ── 13. SMS WEBHOOK - FULL FLOW ──────────────────────────────────────────────
  header('13. SMS WEBHOOK - FULL FLOW');

  r = await req('GET', '/sms/setup', null, TOKEN);
  check('GET SMS setup (token generated)', r.status === 200 && r.body?.token, `status=${r.status}`);
  if (r.body?.token) {
    SMS_TOKEN = r.body.token;
    console.log(`     Token: ${SMS_TOKEN}`);
    console.log(`     URL: ${r.body.webhookUrl}`);
  }

  if (SMS_TOKEN) {
    // Valid debit SMS
    r = await req('POST', `/sms/webhook/${SMS_TOKEN}`, {
      message: 'Dear Customer, Rs.1500.00 debited from A/c XX1234 on 01-Jun-2026 at AMAZON. Avl Bal: Rs.24000.00. -HDFCBK',
      from: 'HDFCBK'
    });
    check('SMS webhook: debit SMS creates expense (201)', r.status === 201 && r.body?.status === 'created', `status=${r.status}, body_status=${r.body?.status}`);

    // Valid credit SMS  
    r = await req('POST', `/sms/webhook/${SMS_TOKEN}`, {
      message: 'Rs.5000.00 credited to your A/c XX1234 on 02-Jun-2026 by GOOGLE PAY UPI. Avl Bal: Rs.29000.00. -HDFCBK',
      from: 'HDFCBK'
    });
    check('SMS webhook: credit SMS creates income (201)', r.status === 201 && r.body?.status === 'created', `status=${r.status}, body_status=${r.body?.status}`);

    // Duplicate SMS (same content same date)
    r = await req('POST', `/sms/webhook/${SMS_TOKEN}`, {
      message: 'Dear Customer, Rs.1500.00 debited from A/c XX1234 on 01-Jun-2026 at AMAZON. Avl Bal: Rs.24000.00. -HDFCBK',
      from: 'HDFCBK'
    });
    check('SMS webhook: duplicate SMS is skipped', r.status === 200 && r.body?.status === 'skipped', `status=${r.status}, body_status=${r.body?.status}`);

    // Non-bank sender
    r = await req('POST', `/sms/webhook/${SMS_TOKEN}`, {
      message: 'Congratulations! You won a prize. Click here.',
      from: 'AD-PROMO123'
    });
    check('SMS webhook: non-bank sender is skipped', r.status === 200 && r.body?.status === 'skipped', `status=${r.status}, body_status=${r.body?.status}`);

    // OTP - no amount
    r = await req('POST', `/sms/webhook/${SMS_TOKEN}`, {
      message: 'Your OTP for HDFC Bank login is 123456. Valid for 5 minutes.',
      from: 'HDFCBK'
    });
    check('SMS webhook: OTP/no-amount SMS is skipped', r.status === 200 && r.body?.status === 'skipped', `status=${r.status}, body_status=${r.body?.status}`);

    // Empty message body
    r = await req('POST', `/sms/webhook/${SMS_TOKEN}`, { from: 'HDFCBK' });
    check('SMS webhook: empty message returns 400', r.status === 400, `Expected 400, got ${r.status}`);

    // Invalid webhook token
    r = await req('POST', '/sms/webhook/invalidtoken999abc', {
      message: 'Rs.100 debited from A/c XX1234. -HDFCBK', from: 'HDFCBK'
    });
    check('SMS webhook: invalid token rejected (401)', r.status === 401, `Expected 401, got ${r.status}`);

    // Test INR symbol format
    r = await req('POST', `/sms/webhook/${SMS_TOKEN}`, {
      message: 'Your a/c XX5678 is debited with INR 750.00 on 03-Jun-2026. UPI Ref:123456789.',
      from: 'ICICIB'
    });
    check('SMS webhook: INR format parsed correctly', r.status === 201 || r.body?.status === 'created', `status=${r.status}`);

    // Regenerate token
    const oldToken = SMS_TOKEN;
    r = await req('POST', '/sms/token/regenerate', null, TOKEN);
    check('Regenerate SMS token (new token issued)', r.status === 200 && r.body?.token && r.body.token !== oldToken, `status=${r.status}`);
    const newSmsToken = r.body?.token;

    // Old token should be rejected
    r = await req('POST', `/sms/webhook/${oldToken}`, {
      message: 'Rs.200 debited from A/c XX1234 on 04-Jun-2026. -HDFCBK', from: 'HDFCBK'
    });
    check('Old token rejected after regeneration (401)', r.status === 401, `Expected 401, got ${r.status}`);

    // New token should work
    if (newSmsToken) {
      r = await req('POST', `/sms/webhook/${newSmsToken}`, {
        message: 'Rs.300.00 debited from A/c XX1234 on 04-Jun-2026 for Zomato. Avl Bal: Rs.23000.00. -HDFCBK',
        from: 'HDFCBK'
      });
      check('New token works after regeneration', r.status === 201, `status=${r.status}`);
    }

    // SMS history
    r = await req('GET', '/sms/history', null, TOKEN);
    check('GET SMS history returns array', r.status === 200 && Array.isArray(r.body), `status=${r.status}`);
    if (Array.isArray(r.body)) console.log(`     History records: ${r.body.length}`);
  }

  // ── 14. NOTIFICATIONS ────────────────────────────────────────────────────────
  header('14. NOTIFICATIONS');

  r = await req('GET', '/notifications', null, TOKEN);
  check('GET notifications', r.status === 200, `status=${r.status}`);

  r = await req('GET', '/notifications');
  check('Block unauthenticated GET /notifications (401)', r.status === 401, `Expected 401, got ${r.status}`);

  // ── 15. SECURITY - CROSS-USER ISOLATION ─────────────────────────────────────
  header('15. SECURITY - CROSS-USER ISOLATION');

  const TS2 = Date.now() + 1;
  r = await req('POST', '/auth/register', {
    username: `user2_${TS2}`, email: `user2_${TS2}@example.com`, password: 'User2Pass!'
  });
  check('Register second user for isolation test', r.status === 201, `status=${r.status}`);

  if (r.body?.token) {
    TOKEN2 = r.body.token;

    // User2 adds a transaction
    const u2tx = await req('POST', '/transactions/add', {
      type: 'expense', category: 'Test', amount: 999,
      date: '2026-05-01', description: 'User2 private txn'
    }, TOKEN2);
    const U2_TXN_ID = u2tx.body?.transaction?._id;

    if (U2_TXN_ID) {
      r = await req('GET', `/transactions/${U2_TXN_ID}`, null, TOKEN);
      check('User1 CANNOT read User2 transaction (404)', r.status === 404, `SECURITY BREACH! Expected 404, got ${r.status}`);

      r = await req('DELETE', `/transactions/${U2_TXN_ID}`, null, TOKEN);
      check('User1 CANNOT delete User2 transaction (404)', r.status === 404, `SECURITY BREACH! Expected 404, got ${r.status}`);

      r = await req('POST', `/transactions/update/${U2_TXN_ID}`, {
        type: 'expense', category: 'Hacked', amount: 0, date: '2026-01-01', description: 'hacked'
      }, TOKEN);
      check('User1 CANNOT update User2 transaction (404)', r.status === 404, `SECURITY BREACH! Expected 404, got ${r.status}`);
    }

    // Clean up user2
    r = await req('DELETE', '/users/account', null, TOKEN2);
    check('Cleanup: Delete user2 account', r.status === 200, `status=${r.status}`);
  }

  // ── 16. MISSING ROUTE / BAD INPUT HANDLING ───────────────────────────────────
  header('16. ERROR HANDLING');

  r = await req('GET', '/nonexistentroute');
  check('Non-existent route returns 404', r.status === 404, `Expected 404, got ${r.status}`);

  r = await req('GET', '/transactions/notavalidobjectid', null, TOKEN);
  check('Invalid MongoDB ObjectId does not return 200', r.status !== 200, `Expected error, got 200`);

  // ── 17. CLEANUP - DELETE TEST USER ───────────────────────────────────────────
  header('17. CLEANUP - DELETE TEST USER');

  r = await req('DELETE', '/users/account', null, TOKEN);
  check('Delete test account (all data purged)', r.status === 200, `status=${r.status}`);

  r = await req('GET', '/auth/me', null, TOKEN);
  check('Deleted user token returns 404 on /auth/me', r.status === 404, `Expected 404, got ${r.status}`);

  // ── FINAL RESULTS ────────────────────────────────────────────────────────────
  header('FINAL RESULTS');
  const total = PASS + FAIL;
  console.log(`\n  Total Tests : ${total}`);
  console.log(`  PASS        : ${PASS}`);
  console.log(`  FAIL        : ${FAIL}`);
  console.log('');

  if (ISSUES.length > 0) {
    console.log('--- ISSUES FOUND -------------------------------------------');
    ISSUES.forEach(i => console.log(`  * ${i}`));
    console.log('');
  }

  if (FAIL === 0) {
    console.log('ALL TESTS PASSED! Your API is working correctly.\n');
  } else {
    console.log(`${FAIL} test(s) FAILED. See issues above.\n`);
  }

  process.exit(FAIL > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
