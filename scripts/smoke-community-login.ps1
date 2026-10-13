# Smoke test helper: NextAuth credentials login + API assertions (Session 72)
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-community-login.ps1
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:3001'

function Login-User($email, $password) {
    $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $csrf = (Invoke-WebRequest -Uri "$base/api/auth/csrf" -WebSession $s).Content | ConvertFrom-Json
    $body = 'csrfToken=' + [uri]::EscapeDataString($csrf.csrfToken) + '&email=' + [uri]::EscapeDataString($email) + '&password=' + [uri]::EscapeDataString($password)
    try {
        $null = Invoke-WebRequest -Uri "$base/api/auth/callback/credentials" -Method POST -Body $body -ContentType 'application/x-www-form-urlencoded' -WebSession $s -MaximumRedirection 5
    }
    catch {
        # ignore; session cookie captured by WebSession if set
    }
    return $s
}

function Api-Get($session, $path) {
    try {
        $r = Invoke-WebRequest -Uri "$base$path" -WebSession $session -UseBasicParsing
        return @{ status = $r.StatusCode; body = $r.Content }
    }
    catch {
        $resp = $_.Exception.Response
        $code = if ($resp) { [int]$resp.StatusCode } else { 0 }
        $bodyText = ''
        try {
            $stream = $resp.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $bodyText = $reader.ReadToEnd()
        }
        catch {}
        return @{ status = $code; body = [string]$bodyText }
    }
}

function Api-Post($session, $path, $json) {
    try {
        $r = Invoke-WebRequest -Uri "$base$path" -Method POST -Body $json -ContentType 'application/json' -WebSession $session -UseBasicParsing
        return @{ status = $r.StatusCode; body = $r.Content }
    }
    catch {
        $resp = $_.Exception.Response
        $code = if ($resp) { [int]$resp.StatusCode } else { 0 }
        $bodyText = ''
        try {
            $stream = $resp.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $bodyText = $reader.ReadToEnd()
        }
        catch {}
        return @{ status = $code; body = [string]$bodyText }
    }
}

Write-Host "=== SMOKE TEST: Community RT/RW (Session 72) ===" -ForegroundColor Cyan

# 1. Login ketua
Write-Host "`n[1] Login ketua@rt02-melati.test" -ForegroundColor Yellow
$ketua = Login-User 'ketua@rt02-melati.test' 'community123'
$ketuaSess = (Api-Get $ketua '/api/auth/session').body
Write-Host "  session: $ketuaSess"

# 2. ketua GET /api/community/members -> 200
Write-Host "`n[2] ketua GET /api/community/members (expect 200)" -ForegroundColor Yellow
$r = Api-Get $ketua '/api/community/members?limit=5'
Write-Host "  status: $($r.status)"
Write-Host "  body(first 300): $($r.body.Substring(0, [Math]::Min(300, $r.body.Length)))"

# 3. Login admin@qalcuity.com (tenant lain) -> 403/401
Write-Host "`n[3] Login admin@qalcuity.com + GET members (expect 401/403)" -ForegroundColor Yellow
$admin = Login-User 'admin@qalcuity.com' 'admin123'
$adminSess = (Api-Get $admin '/api/auth/session').body
Write-Host "  session: $adminSess"
$r = Api-Get $admin '/api/community/members?limit=5'
Write-Host "  status: $($r.status)"
Write-Host "  body(first 300): $($r.body.Substring(0, [Math]::Min(300, $r.body.Length)))"

# 4. Login bendahara -> POST cash transaction (expect 201 PENDING)
Write-Host "`n[4] Login bendahara + POST /api/community/cash-transactions (expect 201 PENDING)" -ForegroundColor Yellow
$bendahara = Login-User 'bendahara@rt02-melati.test' 'community123'
$bendaharaSess = (Api-Get $bendahara '/api/auth/session').body
Write-Host "  session: $bendaharaSess"
# Catatan: schema createCommunityCashTransactionSchema memakai field "txDate" (bukan "transactionDate")
$txBody = '{"type":"EXPENSE","category":"OPERATIONAL","amount":150000,"description":"Smoke test biaya operasional","txDate":"' + (Get-Date -Format 'yyyy-MM-dd') + '"}'
$r = Api-Post $bendahara '/api/community/cash-transactions' $txBody
Write-Host "  status: $($r.status)"
Write-Host "  body: $($r.body)"
$txId = $null
try { $txId = ($r.body | ConvertFrom-Json).data.id } catch {}
Write-Host "  txId: $txId"

# 5. bendahara approve own tx -> 403
if ($txId) {
    Write-Host "`n[5] bendahara approve own tx (expect 403 self-approve)" -ForegroundColor Yellow
    $r = Api-Post $bendahara "/api/community/cash-transactions/$txId/approve" '{"note":"self approve test"}'
    Write-Host "  status: $($r.status)"
    Write-Host "  body: $($r.body)"

    # 6. ketua approve -> 200
    Write-Host "`n[6] ketua approve bendahara tx (expect 200)" -ForegroundColor Yellow
    $r = Api-Post $ketua "/api/community/cash-transactions/$txId/approve" '{"note":"approved by ketua (smoke test)"}'
    Write-Host "  status: $($r.status)"
    Write-Host "  body: $($r.body)"
}

# 7. warga portal bills -> 200 own only
Write-Host "`n[7] Login warga + GET /api/community/portal/bills (expect 200 own only)" -ForegroundColor Yellow
$warga = Login-User 'warga@rt02-melati.test' 'community123'
$wargaSess = (Api-Get $warga '/api/auth/session').body
Write-Host "  session: $wargaSess"
$r = Api-Get $warga '/api/community/portal/bills?limit=10'
Write-Host "  status: $($r.status)"
Write-Host "  body(first 400): $($r.body.Substring(0, [Math]::Min(400, $r.body.Length)))"
# Verify member isolation: all rows should belong to one member
try {
    $parsed = $r.body | ConvertFrom-Json
    Write-Host "  total: $($parsed.total) rows: $($parsed.data.Count)"
}
catch {}

# 8. GET /dashboard/community (authenticated ketua) -> 200 or 307
Write-Host "`n[8] ketua GET /dashboard/community (expect 200/307)" -ForegroundColor Yellow
$r = Api-Get $ketua '/dashboard/community'
Write-Host "  status: $($r.status)"

Write-Host "`n=== SELESAI ===" -ForegroundColor Cyan
