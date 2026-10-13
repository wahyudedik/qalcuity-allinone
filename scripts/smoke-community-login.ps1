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

# ─── Fase 2: Surat & Kegiatan (Subtask M smoke) ─────────────────────────────

# 9. ketua GET /api/community/letters -> 200, response TANPA bodySnapshot
Write-Host "`n[9] ketua GET /api/community/letters (expect 200, no bodySnapshot)" -ForegroundColor Yellow
$r = Api-Get $ketua '/api/community/letters?limit=5'
Write-Host "  status: $($r.status)"
$noSnap = -not ($r.body -match 'bodySnapshot')
Write-Host "  bodySnapshot absent: $noSnap (expect True)"
Write-Host "  body(first 400): $($r.body.Substring(0, [Math]::Min(400, $r.body.Length)))"

# 10. ketua POST draft letter -> 201 (letterNumber null, verifyToken null)
Write-Host "`n[10] ketua POST /api/community/letters draft (expect 201, letterNumber null)" -ForegroundColor Yellow
$memberId = $null
try {
    $mr = Api-Get $ketua '/api/community/members?limit=1'
    $memberId = (($mr.body | ConvertFrom-Json).data[0]).id
}
catch {}
Write-Host "  memberId: $memberId"
$letterId = $null
if ($memberId) {
    $letterBody = '{"letterType":"DOMISILI","memberId":"' + $memberId + '","purpose":"Smoke test surat keterangan domisili"}'
    $r = Api-Post $ketua '/api/community/letters' $letterBody
    Write-Host "  status: $($r.status)"
    Write-Host "  body: $($r.body)"
    try {
        $letter = ($r.body | ConvertFrom-Json).data
        $letterId = $letter.id
        Write-Host "  letterNumber: [$($letter.letterNumber)] (expect empty) | verifyToken: [$($letter.verifyToken)] (expect empty)"
    }
    catch {}
}

if ($letterId) {
    # 11. bendahara POST issue -> 403 (tanpa community:approve)
    Write-Host "`n[11] bendahara POST letters/[id]/issue (expect 403)" -ForegroundColor Yellow
    $r = Api-Post $bendahara "/api/community/letters/$letterId/issue" '{}'
    Write-Host "  status: $($r.status)"
    Write-Host "  body: $($r.body)"

    # 12. ketua POST issue -> 200 (letterNumber + verifyToken terisi)
    Write-Host "`n[12] ketua POST letters/[id]/issue (expect 200, letterNumber+verifyToken)" -ForegroundColor Yellow
    $r = Api-Post $ketua "/api/community/letters/$letterId/issue" '{}'
    Write-Host "  status: $($r.status)"
    Write-Host "  body(first 500): $($r.body.Substring(0, [Math]::Min(500, $r.body.Length)))"
    $issueOk = $false
    try {
        $letter = ($r.body | ConvertFrom-Json).data
        Write-Host "  letterNumber: $($letter.letterNumber) | verifyToken present: $([bool]$letter.verifyToken) | verifyUrl: $($letter.verifyUrl)"
        $issueOk = ([bool]$letter.letterNumber) -and ([bool]$letter.verifyToken)
    }
    catch {}
    Write-Host "  issue invariants OK: $issueOk (expect True)"

    # 13. ketua GET pdf -> 200 application/pdf bytes>0
    Write-Host "`n[13] ketua GET letters/[id]/pdf (expect 200 application/pdf, bytes>0)" -ForegroundColor Yellow
    try {
        $pr = Invoke-WebRequest -Uri "$base/api/community/letters/$letterId/pdf" -WebSession $ketua -UseBasicParsing
        $bytes = $pr.RawContentStream.ToArray()
        Write-Host "  status: $($pr.StatusCode) | content-type: $($pr.Headers['Content-Type']) | bytes: $($bytes.Length)"
    }
    catch {
        $resp = $_.Exception.Response
        Write-Host "  status: $(if ($resp) { [int]$resp.StatusCode } else { 0 }) (PDF gagal)"
    }
}

# 14. admin tenant lain GET letters -> 403/401
Write-Host "`n[14] admin@qalcuity.com GET /api/community/letters (expect 401/403)" -ForegroundColor Yellow
$r = Api-Get $admin '/api/community/letters?limit=5'
Write-Host "  status: $($r.status)"
Write-Host "  body(first 300): $($r.body.Substring(0, [Math]::Min(300, $r.body.Length)))"

# 15. warga GET portal/letters -> 200 own only (semua baris milik 1 member)
Write-Host "`n[15] warga GET /api/community/portal/letters (expect 200 own only)" -ForegroundColor Yellow
$r = Api-Get $warga '/api/community/portal/letters?limit=10'
Write-Host "  status: $($r.status)"
Write-Host "  body(first 400): $($r.body.Substring(0, [Math]::Min(400, $r.body.Length)))"
try {
    $parsed = $r.body | ConvertFrom-Json
    $memberIds = @($parsed.data | ForEach-Object { $_.member.id } | Select-Object -Unique)
    Write-Host "  total: $($parsed.total) rows: $($parsed.data.Count) | unique member ids: $($memberIds.Count) (expect <=1)"
}
catch {}

# 16. ketua POST + GET kegiatan -> 201 + 200
Write-Host "`n[16] ketua POST /api/community/events (expect 201) + GET (expect 200)" -ForegroundColor Yellow
$startsAt = (Get-Date).ToUniversalTime().AddDays(7).ToString('yyyy-MM-ddT09:00:00.000Z')
$evBody = '{"title":"Kerja Bakti Smoke Test","startsAt":"' + $startsAt + '","location":"Lapangan RT","category":"SOSIAL"}'
$r = Api-Post $ketua '/api/community/events' $evBody
Write-Host "  POST status: $($r.status)"
Write-Host "  POST body: $($r.body)"
$r = Api-Get $ketua '/api/community/events?limit=5'
Write-Host "  GET status: $($r.status)"
Write-Host "  GET body(first 400): $($r.body.Substring(0, [Math]::Min(400, $r.body.Length)))"

# ─── Session 73: UI smoke (halaman internal/portal + verify publik) ────────────

# 17. ketua GET /dashboard/community/letters -> 200
Write-Host "`n[17] ketua GET /dashboard/community/letters (expect 200)" -ForegroundColor Yellow
$r = Api-Get $ketua '/dashboard/community/letters'
Write-Host "  status: $($r.status)"
$ok17 = ($r.status -eq 200)
Write-Host "  OK: $ok17 (expect True)"

# 18. ketua GET /dashboard/community/events -> 200
Write-Host "`n[18] ketua GET /dashboard/community/events (expect 200)" -ForegroundColor Yellow
$r = Api-Get $ketua '/dashboard/community/events'
Write-Host "  status: $($r.status)"
$ok18 = ($r.status -eq 200)
Write-Host "  OK: $ok18 (expect True)"

# 19. GET verify page valid token TANPA login -> 200 + body mengandung SRT/DOM/2026-
Write-Host "`n[19] GET /verify/community-letter/[token valid] anonim (expect 200 + SRT/DOM/2026-)" -ForegroundColor Yellow
$anon = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$verifyPath = $null
try {
    $lr = Api-Get $ketua '/api/community/letters?limit=20'
    $rows = ($lr.body | ConvertFrom-Json).data
    foreach ($row in $rows) {
        if ($row.status -eq 'ISSUED' -and $row.verifyUrl) { $verifyPath = $row.verifyUrl; break }
    }
}
catch {}
if ($verifyPath) { $verifyPath = ([uri]$verifyPath).PathAndQuery } # verifyUrl absolut -> ekstrak path agar bisa digabung $base
Write-Host "  verifyPath: $verifyPath"
$ok19 = $false
if ($verifyPath) {
    $r = Api-Get $anon $verifyPath
    $hasNumber = ($r.body -match 'SRT/DOM/2026-')
    $ok19 = ($r.status -eq 200) -and $hasNumber
    Write-Host "  status: $($r.status) | contains SRT/DOM/2026-: $hasNumber | OK: $ok19 (expect True)"
}
else {
    Write-Host "  SKIP: verifyUrl tidak tersedia (tidak ada letter ISSUED)"
}

# 20. GET verify page random 32-hex -> 404 (atau body 'tidak ditemukan')
Write-Host "`n[20] GET /verify/community-letter/[random 32-hex] (expect 404)" -ForegroundColor Yellow
$randomToken = [Guid]::NewGuid().ToString('N')
$r = Api-Get $anon "/verify/community-letter/$randomToken"
$notFoundOk = ($r.status -eq 404) -or ($r.body -match 'tidak ditemukan')
Write-Host "  token: $randomToken | status: $($r.status) | notFound OK: $notFoundOk (expect True)"

# 21. warga GET /dashboard/community/portal/letters -> 200
Write-Host "`n[21] warga GET /dashboard/community/portal/letters (expect 200)" -ForegroundColor Yellow
$r = Api-Get $warga '/dashboard/community/portal/letters'
Write-Host "  status: $($r.status)"
$ok21 = ($r.status -eq 200)
Write-Host "  OK: $ok21 (expect True)"

# 22. warga GET /dashboard/community/portal/events -> 200
Write-Host "`n[22] warga GET /dashboard/community/portal/events (expect 200)" -ForegroundColor Yellow
$r = Api-Get $warga '/dashboard/community/portal/events'
Write-Host "  status: $($r.status)"
$ok22 = ($r.status -eq 200)
Write-Host "  OK: $ok22 (expect True)"

Write-Host "`n=== RINGKASAN SESSION 73 ===" -ForegroundColor Cyan
Write-Host "  [17] letters page:      $ok17" -ForegroundColor $(if ($ok17) { 'Green' } else { 'Red' })
Write-Host "  [18] events page:       $ok18" -ForegroundColor $(if ($ok18) { 'Green' } else { 'Red' })
Write-Host "  [19] verify valid:      $ok19" -ForegroundColor $(if ($ok19) { 'Green' } else { 'Red' })
Write-Host "  [20] verify 404:        $notFoundOk" -ForegroundColor $(if ($notFoundOk) { 'Green' } else { 'Red' })
Write-Host "  [21] portal letters:    $ok21" -ForegroundColor $(if ($ok21) { 'Green' } else { 'Red' })
Write-Host "  [22] portal events:     $ok22" -ForegroundColor $(if ($ok22) { 'Green' } else { 'Red' })

Write-Host "`n=== SELESAI ===" -ForegroundColor Cyan
