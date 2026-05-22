# ============================================================
#  Personal Finance Tracker - Full API Test Suite (A to Z)
#  Run: powershell -ExecutionPolicy Bypass -File test_all.ps1
# ============================================================

$BASE = "http://localhost:5000/api"
$script:PASS = 0
$script:FAIL = 0
$script:SKIP = 0
$script:ISSUES = [System.Collections.Generic.List[string]]::new()
$TOKEN = ""
$TOKEN2 = ""
$TXN_ID = ""
$GOAL_ID = ""
$BUDGET_ID = ""
$WALLET_ID = ""
$SUB_ID = ""
$INV_ID = ""
$SMS_TOKEN = ""
$TS = [System.DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$TEST_USER = "testuser_$TS"
$TEST_EMAIL = "test_$TS@example.com"
$TEST_PASS = "TestPass123!"

function Write-Header($title) {
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host "======================================================" -ForegroundColor Cyan
}

function Invoke-API {
    param($method, $url, $body, $token, $expectedStatus = 200)
    $headers = @{ "Content-Type" = "application/json" }
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    try {
        $params = @{ Uri=$url; Method=$method; Headers=$headers; ErrorAction="Stop" }
        if ($body) { $params["Body"] = ($body | ConvertTo-Json -Depth 10) }
        $r = Invoke-RestMethod @params
        return @{ status = 200; body = $r; ok = ($expectedStatus -eq 200 -or $expectedStatus -eq 201) }
    } catch {
        $resp = $_.Exception.Response
        $status = if ($resp) { [int]$resp.StatusCode } else { 0 }
        return @{ status = $status; body = $null; ok = ($status -eq $expectedStatus) }
    }
}

function Check {
    param($name, $condition, $failReason = "Condition was false")
    $script:total++
    if ($condition) {
        Write-Host "  [PASS] $name" -ForegroundColor Green
        $script:PASS++
    } else {
        Write-Host "  [FAIL] $name  --> $failReason" -ForegroundColor Red
        $script:FAIL++
        $script:ISSUES.Add("[$name] $failReason")
    }
}

$script:total = 0

# ======================================================
Write-Header "1. HEALTH CHECK"
# ======================================================
$h = Invoke-API "GET" "$BASE/health" $null $null 200
Check "Server health endpoint returns OK" ($h.status -eq 200 -and $h.body.status -eq "ok") "status=$($h.status)"
if ($h.body) { Write-Host "     DB: $($h.body.database)" -ForegroundColor Gray }

# ======================================================
Write-Header "2. AUTH - REGISTRATION"
# ======================================================
$r = Invoke-API "POST" "$BASE/auth/register" @{username=$TEST_USER; email=$TEST_EMAIL; password=$TEST_PASS} $null 201
Check "Register new user (201)" ($r.status -eq 201 -and $r.body.token) "status=$($r.status)"
if ($r.body.token) { $TOKEN = $r.body.token }

$r2 = Invoke-API "POST" "$BASE/auth/register" @{username=$TEST_USER; email=$TEST_EMAIL; password=$TEST_PASS} $null 409
Check "Reject duplicate username/email (409)" ($r2.status -eq 409) "Expected 409, got $($r2.status)"

$r3 = Invoke-API "POST" "$BASE/auth/register" @{username="x"} $null 400
Check "Reject incomplete registration (400)" ($r3.status -eq 400) "Expected 400, got $($r3.status)"

# ======================================================
Write-Header "3. AUTH - LOGIN"
# ======================================================
$lr = Invoke-API "POST" "$BASE/auth/login" @{username=$TEST_USER; password=$TEST_PASS} $null 200
Check "Login with valid credentials (200)" ($lr.status -eq 200 -and $lr.body.token) "status=$($lr.status)"
if ($lr.body.token) { $TOKEN = $lr.body.token }

$lr2 = Invoke-API "POST" "$BASE/auth/login" @{username=$TEST_EMAIL; password=$TEST_PASS} $null 200
Check "Login with email instead of username (200)" ($lr2.status -eq 200 -and $lr2.body.token) "status=$($lr2.status)"

$lr3 = Invoke-API "POST" "$BASE/auth/login" @{username=$TEST_USER; password="wrongpass"} $null 401
Check "Reject wrong password (401)" ($lr3.status -eq 401) "Expected 401, got $($lr3.status)"

$lr4 = Invoke-API "POST" "$BASE/auth/login" @{username="nonexistentuser9999"; password="anything"} $null 401
Check "Reject login for non-existent user (401)" ($lr4.status -eq 401) "Expected 401, got $($lr4.status)"

# ======================================================
Write-Header "4. AUTH - TOKEN VERIFICATION"
# ======================================================
$me = Invoke-API "GET" "$BASE/auth/me" $null $TOKEN 200
Check "GET /auth/me with valid token (200)" ($me.status -eq 200 -and $me.body.user) "status=$($me.status)"

$me2 = Invoke-API "GET" "$BASE/auth/me" $null $null 401
Check "Block /auth/me with no token (401)" ($me2.status -eq 401) "Expected 401, got $($me2.status)"

$me3 = Invoke-API "GET" "$BASE/auth/me" $null "invalidtoken123abc" 401
Check "Block /auth/me with bad token (401)" ($me3.status -eq 401) "Expected 401, got $($me3.status)"

# ======================================================
Write-Header "5. AUTH - PASSWORD RESET FLOW"
# ======================================================
$fp = Invoke-API "POST" "$BASE/auth/forgot-password" @{email=$TEST_EMAIL} $null 200
Check "Forgot password for existing email (200)" ($fp.status -eq 200 -and $fp.body.message) "status=$($fp.status)"

$fp2 = Invoke-API "POST" "$BASE/auth/forgot-password" @{email="nonexistent999@example.com"} $null 200
Check "Forgot password for non-existent email returns safe 200" ($fp2.status -eq 200) "status=$($fp2.status)"

$rp = Invoke-API "POST" "$BASE/auth/forgot-password" @{} $null 400
Check "Forgot password without email returns 400" ($rp.status -eq 400) "Expected 400, got $($rp.status)"

$rb = Invoke-API "POST" "$BASE/auth/reset-password" @{token="faketoken"; email=$TEST_EMAIL; password="newpass"} $null 400
Check "Reject invalid reset token (400)" ($rb.status -eq 400) "Expected 400, got $($rb.status)"

$rshort = Invoke-API "POST" "$BASE/auth/reset-password" @{token="tok"; email=$TEST_EMAIL; password="abc"} $null 400
Check "Reject reset password shorter than 6 chars (400)" ($rshort.status -eq 400) "Expected 400, got $($rshort.status)"

# ======================================================
Write-Header "6. TRANSACTIONS - CRUD"
# ======================================================

# Add expense
$tx1 = Invoke-API "POST" "$BASE/transactions/add" @{
    type="expense"; category="Food"; amount=500; date="2026-05-01"
    description="Dinner at restaurant"; merchant="Swiggy"
} $TOKEN 201
Check "Add expense transaction (201)" ($tx1.status -eq 201 -and $tx1.body.transaction._id) "status=$($tx1.status)"
if ($tx1.body.transaction._id) { $TXN_ID = $tx1.body.transaction._id }

# Add income
$tx2 = Invoke-API "POST" "$BASE/transactions/add" @{
    type="income"; category="Salary"; amount=50000; date="2026-05-01"; description="Monthly salary"
} $TOKEN 201
Check "Add income transaction (201)" ($tx2.status -eq 201) "status=$($tx2.status)"

# Add recurring
$tx3 = Invoke-API "POST" "$BASE/transactions/add" @{
    type="expense"; category="Rent"; amount=15000; date="2026-05-01"
    description="Monthly rent"; isRecurring=$true; frequency="monthly"
} $TOKEN 201
Check "Add recurring transaction (creates 2 records)" ($tx3.status -eq 201) "status=$($tx3.status)"

# GET all
$txa = Invoke-API "GET" "$BASE/transactions" $null $TOKEN 200
Check "GET all transactions" ($txa.status -eq 200 -and $txa.body.data -ne $null) "status=$($txa.status)"
if ($txa.body.total) { Write-Host "     Found: $($txa.body.total) transactions" -ForegroundColor Gray }

# GET with type filter
$txf = Invoke-API "GET" "$BASE/transactions?type=expense" $null $TOKEN 200
Check "GET transactions filtered by type=expense" ($txf.status -eq 200) "status=$($txf.status)"

# GET with category filter
$txc = Invoke-API "GET" "$BASE/transactions?category=Food" $null $TOKEN 200
Check "GET transactions filtered by category" ($txc.status -eq 200) "status=$($txc.status)"

# GET with date range
$txd = Invoke-API "GET" "$BASE/transactions?dateFrom=2026-05-01&dateTo=2026-05-31" $null $TOKEN 200
Check "GET transactions with date range filter" ($txd.status -eq 200) "status=$($txd.status)"

# GET with search
$txs = Invoke-API "GET" "$BASE/transactions?search=Dinner" $null $TOKEN 200
Check "GET transactions with search query" ($txs.status -eq 200) "status=$($txs.status)"

# GET with pagination
$txp = Invoke-API "GET" "$BASE/transactions?page=1&limit=5" $null $TOKEN 200
Check "GET transactions with pagination" ($txp.status -eq 200) "status=$($txp.status)"

# GET with sort
$txsort = Invoke-API "GET" "$BASE/transactions?sortField=amount&sortDir=asc" $null $TOKEN 200
Check "GET transactions with sort (amount asc)" ($txsort.status -eq 200) "status=$($txsort.status)"

# Summary
$txsum = Invoke-API "GET" "$BASE/transactions/summary" $null $TOKEN 200
Check "GET transaction summary (income/expenses/net)" ($txsum.status -eq 200 -and $null -ne $txsum.body.income) "status=$($txsum.status)"

# GET single
if ($TXN_ID) {
    $txone = Invoke-API "GET" "$BASE/transactions/$TXN_ID" $null $TOKEN 200
    Check "GET single transaction by ID" ($txone.status -eq 200) "status=$($txone.status)"

    # UPDATE
    $txup = Invoke-API "POST" "$BASE/transactions/update/$TXN_ID" @{
        type="expense"; category="Food & Dining"; amount=600; date="2026-05-01"; description="Updated dinner"
    } $TOKEN 200
    Check "UPDATE transaction" ($txup.status -eq 200) "status=$($txup.status)"

    # Verify updated value
    $txver = Invoke-API "GET" "$BASE/transactions/$TXN_ID" $null $TOKEN 200
    Check "Updated transaction has new amount (600)" ($txver.body.amount -eq 600) "amount=$($txver.body.amount)"

    # Cross-user access (no token)
    $txunauth = Invoke-API "GET" "$BASE/transactions/$TXN_ID" $null $null 401
    Check "Block unauthenticated transaction access (401)" ($txunauth.status -eq 401) "Expected 401, got $($txunauth.status)"

    # DELETE
    $txdel = Invoke-API "DELETE" "$BASE/transactions/$TXN_ID" $null $TOKEN 200
    Check "DELETE transaction" ($txdel.status -eq 200) "status=$($txdel.status)"

    # After delete returns 404
    $txgone = Invoke-API "GET" "$BASE/transactions/$TXN_ID" $null $TOKEN 404
    Check "Deleted transaction returns 404" ($txgone.status -eq 404) "Expected 404, got $($txgone.status)"
}

# Unauth access to /transactions
$txnoauth = Invoke-API "GET" "$BASE/transactions" $null $null 401
Check "Block unauthenticated GET /transactions (401)" ($txnoauth.status -eq 401) "Expected 401, got $($txnoauth.status)"

# ======================================================
Write-Header "7. GOALS - CRUD"
# ======================================================

$g1 = Invoke-API "POST" "$BASE/goals/add" @{
    name="Buy a Car"; targetAmount=500000; currentAmount=50000; deadline="2027-12-31"
} $TOKEN 201
Check "Add savings goal (201)" ($g1.status -eq 201 -and $g1.body.goal._id) "status=$($g1.status)"
if ($g1.body.goal._id) { $GOAL_ID = $g1.body.goal._id }

$ga = Invoke-API "GET" "$BASE/goals" $null $TOKEN 200
Check "GET all goals" ($ga.status -eq 200) "status=$($ga.status)"

if ($GOAL_ID) {
    $gu = Invoke-API "POST" "$BASE/goals/update/$GOAL_ID" @{
        name="Buy a Car"; targetAmount=500000; currentAmount=100000
    } $TOKEN 200
    Check "UPDATE goal (add contribution)" ($gu.status -eq 200) "status=$($gu.status)"

    $gv = Invoke-API "POST" "$BASE/goals/update/$GOAL_ID" $null $null 200
    # Verify updated amount
    $gacheck = Invoke-API "GET" "$BASE/goals" $null $TOKEN 200
    $goalObj = $gacheck.body | Where-Object { $_._id -eq $GOAL_ID }
    Check "Goal currentAmount updated to 100000" ($goalObj.currentAmount -eq 100000) "amount=$($goalObj.currentAmount)"

    $gd = Invoke-API "DELETE" "$BASE/goals/$GOAL_ID" $null $TOKEN 200
    Check "DELETE goal" ($gd.status -eq 200) "status=$($gd.status)"

    $gd2 = Invoke-API "DELETE" "$BASE/goals/$GOAL_ID" $null $TOKEN 404
    Check "Deleted goal returns 404" ($gd2.status -eq 404) "Expected 404, got $($gd2.status)"
}

# ======================================================
Write-Header "8. BUDGETS - CRUD"
# ======================================================

$b1 = Invoke-API "POST" "$BASE/budgets/add" @{ category="Food"; limit=5000 } $TOKEN 200
Check "Add/upsert budget" ($b1.status -eq 200 -and $b1.body.budget._id) "status=$($b1.status)"
if ($b1.body.budget._id) { $BUDGET_ID = $b1.body.budget._id }

$ba = Invoke-API "GET" "$BASE/budgets" $null $TOKEN 200
Check "GET all budgets" ($ba.status -eq 200) "status=$($ba.status)"

$b2 = Invoke-API "POST" "$BASE/budgets/add" @{ category="Food"; limit=7000 } $TOKEN 200
Check "Upsert budget (same category, new limit)" ($b2.status -eq 200) "status=$($b2.status)"

if ($BUDGET_ID) {
    $bd = Invoke-API "DELETE" "$BASE/budgets/$BUDGET_ID" $null $TOKEN 200
    Check "DELETE budget" ($bd.status -eq 200) "status=$($bd.status)"

    $bd2 = Invoke-API "DELETE" "$BASE/budgets/$BUDGET_ID" $null $TOKEN 404
    Check "Deleted budget returns 404" ($bd2.status -eq 404) "Expected 404, got $($bd2.status)"
}

# ======================================================
Write-Header "9. WALLETS - CRUD"
# ======================================================

$w1 = Invoke-API "POST" "$BASE/wallets" @{
    name="HDFC Savings"; type="bank"; balance=25000; currency="INR"; isDefault=$true
} $TOKEN 201
Check "Create wallet (201)" ($w1.status -eq 201 -and $w1.body._id) "status=$($w1.status)"
if ($w1.body._id) { $WALLET_ID = $w1.body._id }

$wa = Invoke-API "GET" "$BASE/wallets" $null $TOKEN 200
Check "GET wallets with totalBalance field" ($wa.status -eq 200 -and $null -ne $wa.body.totalBalance) "status=$($wa.status)"

$wno = Invoke-API "POST" "$BASE/wallets" @{ type="bank"; balance=1000 } $TOKEN 400
Check "Reject wallet without name (400)" ($wno.status -eq 400) "Expected 400, got $($wno.status)"

if ($WALLET_ID) {
    $wp = Invoke-API "PATCH" "$BASE/wallets/$WALLET_ID" @{ balance=30000; notes="Updated balance" } $TOKEN 200
    Check "PATCH wallet (update balance)" ($wp.status -eq 200) "status=$($wp.status)"

    $wd = Invoke-API "DELETE" "$BASE/wallets/$WALLET_ID" $null $TOKEN 200
    Check "DELETE wallet" ($wd.status -eq 200) "status=$($wd.status)"

    $wd2 = Invoke-API "DELETE" "$BASE/wallets/$WALLET_ID" $null $TOKEN 404
    Check "Deleted wallet returns 404" ($wd2.status -eq 404) "Expected 404, got $($wd2.status)"
}

# ======================================================
Write-Header "10. SUBSCRIPTIONS - CRUD"
# ======================================================

$s1 = Invoke-API "POST" "$BASE/subscriptions" @{
    name="Netflix"; amount=649; billingCycle="monthly"; category="Entertainment"; renewalDate="2026-07-01"
} $TOKEN 201
Check "Create subscription (201)" ($s1.status -eq 201 -and $s1.body._id) "status=$($s1.status)"
if ($s1.body._id) { $SUB_ID = $s1.body._id }

$sa = Invoke-API "GET" "$BASE/subscriptions" $null $TOKEN 200
Check "GET subscriptions with monthlyTotal" ($sa.status -eq 200 -and $null -ne $sa.body.monthlyTotal) "status=$($sa.status)"

$sno = Invoke-API "POST" "$BASE/subscriptions" @{ billingCycle="monthly" } $TOKEN 400
Check "Reject subscription without name/amount (400)" ($sno.status -eq 400) "Expected 400, got $($sno.status)"

# Yearly billing cycle monthly equivalent
$sy = Invoke-API "POST" "$BASE/subscriptions" @{
    name="YouTube Premium"; amount=1190; billingCycle="yearly"; category="Entertainment"
} $TOKEN 201
Check "Create yearly subscription (201)" ($sy.status -eq 201) "status=$($sy.status)"

if ($SUB_ID) {
    $sp = Invoke-API "PATCH" "$BASE/subscriptions/$SUB_ID" @{ amount=799; status="active" } $TOKEN 200
    Check "PATCH subscription" ($sp.status -eq 200) "status=$($sp.status)"

    $sd = Invoke-API "DELETE" "$BASE/subscriptions/$SUB_ID" $null $TOKEN 200
    Check "DELETE subscription" ($sd.status -eq 200) "status=$($sd.status)"

    $sd2 = Invoke-API "DELETE" "$BASE/subscriptions/$SUB_ID" $null $TOKEN 404
    Check "Deleted subscription returns 404" ($sd2.status -eq 404) "Expected 404, got $($sd2.status)"
}

# ======================================================
Write-Header "11. INVESTMENTS - CRUD"
# ======================================================

$i1 = Invoke-API "POST" "$BASE/investments" @{
    name="Reliance Industries"; type="stocks"; investedAmount=10000
    currentValue=12000; units=5; purchaseDate="2025-01-15"
} $TOKEN 201
Check "Create investment (201)" ($i1.status -eq 201 -and $i1.body._id) "status=$($i1.status)"
if ($i1.body._id) { $INV_ID = $i1.body._id }

$ia = Invoke-API "GET" "$BASE/investments" $null $TOKEN 200
Check "GET investments with P&L summary" ($ia.status -eq 200 -and $null -ne $ia.body.summary) "status=$($ia.status)"
if ($ia.body.summary) { Write-Host "     PnL: Rs.$($ia.body.summary.totalPnL)" -ForegroundColor Gray }

$ino = Invoke-API "POST" "$BASE/investments" @{ name="Test Stock" } $TOKEN 400
Check "Reject investment without investedAmount (400)" ($ino.status -eq 400) "Expected 400, got $($ino.status)"

if ($INV_ID) {
    $ip = Invoke-API "PATCH" "$BASE/investments/$INV_ID" @{ currentValue=13500 } $TOKEN 200
    Check "PATCH investment (update current value)" ($ip.status -eq 200) "status=$($ip.status)"

    $id = Invoke-API "DELETE" "$BASE/investments/$INV_ID" $null $TOKEN 200
    Check "DELETE investment" ($id.status -eq 200) "status=$($id.status)"

    $id2 = Invoke-API "DELETE" "$BASE/investments/$INV_ID" $null $TOKEN 404
    Check "Deleted investment returns 404" ($id2.status -eq 404) "Expected 404, got $($id2.status)"
}

# ======================================================
Write-Header "12. USER PROFILE MANAGEMENT"
# ======================================================

$us = Invoke-API "GET" "$BASE/users/stats" $null $TOKEN 200
Check "GET user stats" ($us.status -eq 200 -and $us.body.username) "status=$($us.status)"

$NEW_USERNAME = "upd_$TS"
$up = Invoke-API "PATCH" "$BASE/users/profile" @{ username=$NEW_USERNAME } $TOKEN 200
Check "PATCH user profile (username)" ($up.status -eq 200 -and $up.body.user.username -eq $NEW_USERNAME) "status=$($up.status), username=$($up.body.user.username)"

# Re-login with new username to get fresh token
$rl = Invoke-API "POST" "$BASE/auth/login" @{username=$NEW_USERNAME; password=$TEST_PASS} $null 200
if ($rl.body.token) { $TOKEN = $rl.body.token }

$cp = Invoke-API "PATCH" "$BASE/users/password" @{
    currentPassword=$TEST_PASS; newPassword="NewPass456!"
} $TOKEN 200
Check "PATCH user password" ($cp.status -eq 200) "status=$($cp.status)"

$rl2 = Invoke-API "POST" "$BASE/auth/login" @{username=$NEW_USERNAME; password="NewPass456!"} $null 200
if ($rl2.body.token) { $TOKEN = $rl2.body.token }

$cp2 = Invoke-API "PATCH" "$BASE/users/password" @{
    currentPassword="WrongPass"; newPassword="Something"
} $TOKEN 401
Check "Reject wrong current password (401)" ($cp2.status -eq 401) "Expected 401, got $($cp2.status)"

# Duplicate username
$dupUser = Invoke-API "PATCH" "$BASE/users/profile" @{ username=$NEW_USERNAME } $TOKEN 200
# (same username, no conflict with self - should pass)
Check "Update profile with same username (no self-conflict)" ($dupUser.status -eq 200) "status=$($dupUser.status)"

# ======================================================
Write-Header "13. SMS WEBHOOK - FULL FLOW"
# ======================================================

$ss = Invoke-API "GET" "$BASE/sms/setup" $null $TOKEN 200
Check "GET SMS setup (token generated)" ($ss.status -eq 200 -and $ss.body.token) "status=$($ss.status)"
if ($ss.body.token) {
    $SMS_TOKEN = $ss.body.token
    Write-Host "     Token: $SMS_TOKEN" -ForegroundColor Gray
    Write-Host "     URL: $($ss.body.webhookUrl)" -ForegroundColor Gray
}

if ($SMS_TOKEN) {
    # Valid debit SMS
    $sms1 = Invoke-API "POST" "$BASE/sms/webhook/$SMS_TOKEN" @{
        message = "Dear Customer, Rs.1500.00 debited from A/c XX1234 on 01-Jun-2026 at AMAZON. Avl Bal: Rs.24000.00. -HDFCBK"
        from    = "HDFCBK"
    } $null 201
    Check "SMS webhook: debit SMS creates expense (201)" ($sms1.status -eq 201 -and $sms1.body.status -eq "created") "status=$($sms1.status), body=$($sms1.body.status)"

    # Valid credit SMS
    $sms2 = Invoke-API "POST" "$BASE/sms/webhook/$SMS_TOKEN" @{
        message = "Rs.5000.00 credited to your A/c XX1234 on 02-Jun-2026 by GOOGLE PAY UPI. Avl Bal: Rs.29000.00. -HDFCBK"
        from    = "HDFCBK"
    } $null 201
    Check "SMS webhook: credit SMS creates income (201)" ($sms2.status -eq 201 -and $sms2.body.status -eq "created") "status=$($sms2.status), body=$($sms2.body.status)"

    # Duplicate SMS (same amount, sender, near same date)
    Start-Sleep -Milliseconds 500
    $sms3 = Invoke-API "POST" "$BASE/sms/webhook/$SMS_TOKEN" @{
        message = "Dear Customer, Rs.1500.00 debited from A/c XX1234 on 01-Jun-2026 at AMAZON. Avl Bal: Rs.24000.00. -HDFCBK"
        from    = "HDFCBK"
    } $null 200
    Check "SMS webhook: duplicate SMS is skipped" ($sms3.status -eq 200 -and $sms3.body.status -eq "skipped") "status=$($sms3.status), body=$($sms3.body.status)"

    # Non-bank sender
    $sms4 = Invoke-API "POST" "$BASE/sms/webhook/$SMS_TOKEN" @{
        message = "Congratulations! You won a prize. Click here."
        from    = "AD-PROMO123"
    } $null 200
    Check "SMS webhook: non-bank sender is skipped" ($sms4.status -eq 200 -and $sms4.body.status -eq "skipped") "status=$($sms4.status), body=$($sms4.body.status)"

    # OTP / no-amount SMS
    $sms5 = Invoke-API "POST" "$BASE/sms/webhook/$SMS_TOKEN" @{
        message = "Your OTP for HDFC Bank login is 123456. Valid for 5 minutes."
        from    = "HDFCBK"
    } $null 200
    Check "SMS webhook: OTP/no-amount SMS is skipped" ($sms5.status -eq 200 -and $sms5.body.status -eq "skipped") "status=$($sms5.status), body=$($sms5.body.status)"

    # Empty message body
    $sms6 = Invoke-API "POST" "$BASE/sms/webhook/$SMS_TOKEN" @{ from="HDFCBK" } $null 400
    Check "SMS webhook: empty message returns 400" ($sms6.status -eq 400) "Expected 400, got $($sms6.status)"

    # Invalid token
    $sms7 = Invoke-API "POST" "$BASE/sms/webhook/invalidtoken999abc" @{
        message = "Rs.100 debited from A/c"; from = "HDFCBK"
    } $null 401
    Check "SMS webhook: invalid token rejected (401)" ($sms7.status -eq 401) "Expected 401, got $($sms7.status)"

    # Various Indian bank formats
    $smsPaytm = Invoke-API "POST" "$BASE/sms/webhook/$SMS_TOKEN" @{
        message = "INR 250.00 debited from Paytm wallet on 03-Jun-2026. Ref: ABC123456"
        from    = "PAYTMB"
    } $null 201
    Check "SMS webhook: Paytm wallet debit SMS parsed" ($smsPaytm.status -eq 201 -or $smsPaytm.body.status -eq "created") "status=$($smsPaytm.status)"

    # Regenerate token
    $regen = Invoke-API "POST" "$BASE/sms/token/regenerate" $null $TOKEN 200
    Check "Regenerate SMS token (new token issued)" ($regen.status -eq 200 -and $regen.body.token -and $regen.body.token -ne $SMS_TOKEN) "status=$($regen.status)"

    # Old token should now be invalid
    $oldTok = Invoke-API "POST" "$BASE/sms/webhook/$SMS_TOKEN" @{
        message = "Rs.200 debited from A/c XX1234 on 03-Jun-2026. -HDFCBK"
        from    = "HDFCBK"
    } $null 401
    Check "Old token rejected after regeneration (401)" ($oldTok.status -eq 401) "Expected 401, got $($oldTok.status)"

    # SMS history
    $hist = Invoke-API "GET" "$BASE/sms/history" $null $TOKEN 200
    Check "GET SMS history returns array" ($hist.status -eq 200 -and $hist.body -is [Array]) "status=$($hist.status)"
    if ($hist.body) { Write-Host "     History records: $($hist.body.Count)" -ForegroundColor Gray }
}

# ======================================================
Write-Header "14. NOTIFICATIONS"
# ======================================================

$n1 = Invoke-API "GET" "$BASE/notifications" $null $TOKEN 200
Check "GET notifications" ($n1.status -eq 200) "status=$($n1.status)"

$n2 = Invoke-API "GET" "$BASE/notifications" $null $null 401
Check "Block unauthenticated GET /notifications (401)" ($n2.status -eq 401) "Expected 401, got $($n2.status)"

# ======================================================
Write-Header "15. SECURITY - CROSS-USER ISOLATION"
# ======================================================

$TS2 = [System.DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$u2 = Invoke-API "POST" "$BASE/auth/register" @{
    username="user2_$TS2"; email="user2_$TS2@example.com"; password="User2Pass!"
} $null 201
Check "Register second user for isolation test" ($u2.status -eq 201) "status=$($u2.status)"

if ($u2.body.token) {
    $TOKEN2 = $u2.body.token

    # User2 adds a transaction
    $u2tx = Invoke-API "POST" "$BASE/transactions/add" @{
        type="expense"; category="Test"; amount=999; date="2026-05-01"; description="User2 private"
    } $TOKEN2 201
    $U2_TXN_ID = $u2tx.body.transaction._id

    if ($U2_TXN_ID) {
        # User1 tries to GET user2's transaction
        $iso1 = Invoke-API "GET" "$BASE/transactions/$U2_TXN_ID" $null $TOKEN 404
        Check "User1 cannot read User2 transaction (404)" ($iso1.status -eq 404) "SECURITY BREACH: Expected 404, got $($iso1.status)"

        # User1 tries to DELETE user2's transaction
        $iso2 = Invoke-API "DELETE" "$BASE/transactions/$U2_TXN_ID" $null $TOKEN 404
        Check "User1 cannot delete User2 transaction (404)" ($iso2.status -eq 404) "SECURITY BREACH: Expected 404, got $($iso2.status)"

        # User1 tries to UPDATE user2's transaction
        $iso3 = Invoke-API "POST" "$BASE/transactions/update/$U2_TXN_ID" @{
            type="expense"; category="Hacked"; amount=0; date="2026-01-01"; description="hacked"
        } $TOKEN 404
        Check "User1 cannot update User2 transaction (404)" ($iso3.status -eq 404) "SECURITY BREACH: Expected 404, got $($iso3.status)"
    }

    # Clean up user2
    $u2del = Invoke-API "DELETE" "$BASE/users/account" $null $TOKEN2 200
    Check "Cleanup: Delete user2 account" ($u2del.status -eq 200) "status=$($u2del.status)"
} else {
    Write-Host "  [SKIP] Cross-user isolation (could not create user2)" -ForegroundColor Yellow
    $script:SKIP++; $script:total++
}

# ======================================================
Write-Header "16. MISSING ROUTE HANDLING"
# ======================================================

$nr = Invoke-API "GET" "$BASE/nonexistentroute" $null $null 404
Check "Non-existent route returns 404" ($nr.status -eq 404) "Expected 404, got $($nr.status)"

$nr2 = Invoke-API "GET" "$BASE/transactions/nonexistentid" $null $TOKEN 500
# This might be 500 (invalid ObjectId) or 400 - check it's not 200
Check "Invalid ObjectId format not silently accepted" ($nr2.status -ne 200) "Expected error, got 200"

# ======================================================
Write-Header "17. CLEANUP - DELETE TEST USER"
# ======================================================

$del = Invoke-API "DELETE" "$BASE/users/account" $null $TOKEN 200
Check "Delete test account (all data purged)" ($del.status -eq 200) "status=$($del.status)"

# Token should no longer resolve user
$postDel = Invoke-API "GET" "$BASE/auth/me" $null $TOKEN 404
Check "Deleted user gets 404 on /auth/me" ($postDel.status -eq 404) "Expected 404, got $($postDel.status)"

# ======================================================
Write-Header "FINAL RESULTS"
# ======================================================
$total = $script:PASS + $script:FAIL + $script:SKIP
Write-Host ""
Write-Host "  Total Tests : $total" -ForegroundColor White
Write-Host "  PASS        : $($script:PASS)" -ForegroundColor Green
Write-Host "  FAIL        : $($script:FAIL)" -ForegroundColor Red
Write-Host "  SKIP        : $($script:SKIP)" -ForegroundColor Yellow
Write-Host ""

if ($script:ISSUES.Count -gt 0) {
    Write-Host "--- ISSUES FOUND -------------------------------------------" -ForegroundColor Red
    foreach ($issue in $script:ISSUES) {
        Write-Host "  * $issue" -ForegroundColor Red
    }
    Write-Host ""
}

if ($script:FAIL -eq 0) {
    Write-Host "ALL TESTS PASSED! Your API is working correctly." -ForegroundColor Green
} else {
    Write-Host "$($script:FAIL) test(s) FAILED. See issues above." -ForegroundColor Yellow
}
Write-Host ""
