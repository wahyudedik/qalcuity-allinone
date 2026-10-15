# Smoke test helper: NextAuth credentials login + API assertions (Session 72-74)
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

function Api-Put($session, $path, $json) {
    try {
        $r = Invoke-WebRequest -Uri "$base$path" -Method PUT -Body $json -ContentType 'application/json' -WebSession $session -UseBasicParsing
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

function Api-Delete($session, $path) {
    try {
        $r = Invoke-WebRequest -Uri "$base$path" -Method DELETE -WebSession $session -UseBasicParsing
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

Write-Host "=== SMOKE TEST: Community RT/RW (Session 72-74) ===" -ForegroundColor Cyan

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

# --- Fase 2: Surat & Kegiatan (Subtask M smoke) -----------------------------

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
$eventId = $null
try { $eventId = ($r.body | ConvertFrom-Json).data.id } catch {}
Write-Host "  eventId: $eventId"
$r = Api-Get $ketua '/api/community/events?limit=5'
Write-Host "  GET status: $($r.status)"
Write-Host "  GET body(first 400): $($r.body.Substring(0, [Math]::Min(400, $r.body.Length)))"

# --- Session 73: UI smoke (halaman internal/portal + verify publik) ------------

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

# 19. GET verify page valid token TANPA login -> 200 + body mengandung nomor surat ISSUED yang dipilih
Write-Host "`n[19] GET /verify/community-letter/[token valid] anonim (expect 200 + nomor surat valid)" -ForegroundColor Yellow
$anon = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$verifyPath = $null
$verifyLetterNo = $null
try {
    $lr = Api-Get $ketua '/api/community/letters?limit=20'
    $rows = ($lr.body | ConvertFrom-Json).data
    foreach ($row in $rows) {
        if ($row.status -eq 'ISSUED' -and $row.verifyUrl) { $verifyPath = $row.verifyUrl; $verifyLetterNo = $row.letterNumber; break }
    }
}
catch {}
if ($verifyPath) { $verifyPath = ([uri]$verifyPath).PathAndQuery } # verifyUrl absolut -> ekstrak path agar bisa digabung $base
Write-Host "  verifyPath: $verifyPath | letterNumber: $verifyLetterNo"
$ok19 = $false
if ($verifyPath -and $verifyLetterNo) {
    $r = Api-Get $anon $verifyPath
    # Cocokkan nomor surat YANG DIPILIH dari list (PNG/DOM/SKT — tergantung urutan), jangan hardcode DOM.
    $hasNumber = ($r.body -match [regex]::Escape($verifyLetterNo))
    $ok19 = ($r.status -eq 200) -and $hasNumber
    Write-Host "  status: $($r.status) | contains $verifyLetterNo : $hasNumber | OK: $ok19 (expect True)"
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

# --- Session 74: cash-transactions ?eventId= server-side filter --------------

# 23. ketua GET cash-transactions?eventId=<valid> -> 200, semua data.eventId sama
$ok23 = $false
if ($eventId) {
    Write-Host "`n[23] ketua GET /api/community/cash-transactions?eventId=<valid> (expect 200, all rows same eventId)" -ForegroundColor Yellow
    $r = Api-Get $ketua "/api/community/cash-transactions?eventId=$eventId&limit=50"
    Write-Host "  status: $($r.status)"
    try {
        $parsed = $r.body | ConvertFrom-Json
        $rows = @($parsed.data)
        $mismatch = @($rows | Where-Object { $_.eventId -ne $eventId })
        Write-Host "  total: $($parsed.total) rows: $($rows.Count) | eventId mismatch: $($mismatch.Count) (expect 0)"
        $ok23 = ($r.status -eq 200) -and ($mismatch.Count -eq 0)
    }
    catch {
        Write-Host "  parse error: $_"
    }
    Write-Host "  OK: $ok23 (expect True)"
}
else {
    Write-Host "`n[23] SKIP: eventId tidak tersedia dari [16]" -ForegroundColor Yellow
}

# 24. ketua GET cash-transactions?eventId=<invalid> -> 404 EVENT_NOT_FOUND
Write-Host "`n[24] ketua GET /api/community/cash-transactions?eventId=<invalid> (expect 404)" -ForegroundColor Yellow
$invalidEventId = [Guid]::NewGuid().ToString()
$r = Api-Get $ketua "/api/community/cash-transactions?eventId=$invalidEventId"
Write-Host "  eventId: $invalidEventId | status: $($r.status)"
Write-Host "  body(first 300): $($r.body.Substring(0, [Math]::Min(300, $r.body.Length)))"
$ok24 = ($r.status -eq 404)
Write-Host "  OK: $ok24 (expect True)"

# --- Fase 3: Pendaftaran peserta kegiatan (Subtask Q smoke) ------------------
# Catatan seed: akun warga ter-link ke member W-001 - sudah ATTENDED di
# KGT/2026-001 & REGISTERED di KGT/2026-002 (startsAt 17 Okt, masih Future).

# Resolve id kegiatan seed berdasarkan eventNumber (posisi baris tidak diandalkan)
$kgt001Id = $null; $kgt002Id = $null; $kgt003Id = $null
try {
    $er = Api-Get $ketua '/api/community/events?limit=20'
    foreach ($ev in (($er.body | ConvertFrom-Json).data)) {
        if ($ev.eventNumber -eq 'KGT/2026-001') { $kgt001Id = $ev.id }
        elseif ($ev.eventNumber -eq 'KGT/2026-002') { $kgt002Id = $ev.id }
        elseif ($ev.eventNumber -eq 'KGT/2026-003') { $kgt003Id = $ev.id }
    }
}
catch {}
Write-Host "  kgt001=$kgt001Id | kgt002=$kgt002Id | kgt003=$kgt003Id"

$ok25 = $false; $ok26 = $false; $ok27 = $false; $ok28 = $false
$ok29 = $false; $ok30 = $false; $ok31 = $false; $ok32 = $false
$ok33 = $false; $ok34 = $false; $ok35 = $false; $ok36 = $false

if ($kgt001Id -and $kgt002Id -and $kgt003Id) {
    # 25. ketua GET participants KGT-001 -> 200, 5 baris, W-001 ATTENDED
    Write-Host "`n[25] ketua GET events/[kgt001]/participants (expect 200, 5 rows, W-001 ATTENDED)" -ForegroundColor Yellow
    $w001MemberId = $null
    $r = Api-Get $ketua "/api/community/events/$kgt001Id/participants?limit=50"
    Write-Host "  status: $($r.status)"
    try {
        $parsed = $r.body | ConvertFrom-Json
        $rows = @($parsed.data)
        $w001 = $rows | Where-Object { $_.member.code -eq 'W-001' } | Select-Object -First 1
        if ($w001) { $w001MemberId = $w001.member.id }
        Write-Host "  total: $($parsed.total) rows: $($rows.Count) | W-001 status: $($w001.status) | warga memberId: $w001MemberId"
        $ok25 = ($r.status -eq 200) -and ($rows.Count -eq 5) -and ($w001.status -eq 'ATTENDED') -and ([bool]$w001MemberId)
    }
    catch { Write-Host "  parse error: $_" }
    Write-Host "  OK: $ok25 (expect True)"

    # 26. ketua POST duplikat member (W-001 sudah ATTENDED di KGT-001) -> 409
    Write-Host "`n[26] ketua POST participants duplikat (expect 409 already registered)" -ForegroundColor Yellow
    if ($w001MemberId) {
        $r = Api-Post $ketua "/api/community/events/$kgt001Id/participants" ('{"memberId":"' + $w001MemberId + '"}')
        Write-Host "  status: $($r.status)"
        Write-Host "  body: $($r.body)"
        $ok26 = ($r.status -eq 409) -and ($r.body -match 'already registered')
    }
    else {
        Write-Host "  SKIP: memberId W-001 tidak tersedia dari [25]"
    }
    Write-Host "  OK: $ok26 (expect True)"

    # 27. ketua POST memberId tidak ada (pola id tenant lain / random GUID) -> 404
    Write-Host "`n[27] ketua POST participants memberId random GUID (expect 404 Member not found)" -ForegroundColor Yellow
    $ghostMemberId = [Guid]::NewGuid().ToString()
    $r = Api-Post $ketua "/api/community/events/$kgt001Id/participants" ('{"memberId":"' + $ghostMemberId + '"}')
    Write-Host "  status: $($r.status) | memberId: $ghostMemberId"
    Write-Host "  body: $($r.body)"
    $ok27 = ($r.status -eq 404) -and ($r.body -match 'Member not found')
    Write-Host "  OK: $ok27 (expect True)"

    # 28. warga POST internal participants (hanya community:portal) -> 403
    Write-Host "`n[28] warga POST internal events/[id]/participants (expect 403)" -ForegroundColor Yellow
    if ($w001MemberId) {
        $r = Api-Post $warga "/api/community/events/$kgt001Id/participants" ('{"memberId":"' + $w001MemberId + '"}')
        Write-Host "  status: $($r.status)"
        Write-Host "  body: $($r.body)"
        $ok28 = ($r.status -eq 403)
    }
    else {
        Write-Host "  SKIP: memberId W-001 tidak tersedia dari [25]"
    }
    Write-Host "  OK: $ok28 (expect True)"

    # 29. warga GET portal/events -> 200 + embed participantStatus & participantCount
    Write-Host "`n[29] warga GET /api/community/portal/events (expect 200 + participantStatus/participantCount)" -ForegroundColor Yellow
    $r = Api-Get $warga '/api/community/portal/events?limit=20'
    Write-Host "  status: $($r.status)"
    try {
        $parsed = $r.body | ConvertFrom-Json
        $rows = @($parsed.data)
        $allEmbed = @($rows | Where-Object { $null -eq $_.participantStatus -or $_.participantStatus -eq 'REGISTERED' -or $_.participantStatus -eq 'ATTENDED' -or $_.participantStatus -eq 'CANCELLED' }).Count -eq $rows.Count -and @($rows | Where-Object { $null -ne $_.participantCount }).Count -eq $rows.Count
        $kgt002Row = $rows | Where-Object { $_.eventNumber -eq 'KGT/2026-002' } | Select-Object -First 1
        Write-Host "  rows: $($rows.Count) | all have embed: $allEmbed | KGT-002: status=$($kgt002Row.participantStatus) active=$($kgt002Row.participantCount.active) max=$($kgt002Row.participantCount.maxCapacity)"
        $ok29 = ($r.status -eq 200) -and $allEmbed -and ($kgt002Row.participantStatus -eq 'REGISTERED') -and ($kgt002Row.participantCount.active -eq 3) -and ($kgt002Row.participantCount.maxCapacity -eq 30)
    }
    catch { Write-Host "  parse error: $_" }
    Write-Host "  OK: $ok29 (expect True)"

    # 30. warga POST register KGT-002 (sudah REGISTERED) -> 409
    Write-Host "`n[30] warga POST portal register KGT-002 (expect 409 already registered)" -ForegroundColor Yellow
    $r = Api-Post $warga "/api/community/portal/events/$kgt002Id/register" ''
    Write-Host "  status: $($r.status)"
    Write-Host "  body: $($r.body)"
    $ok30 = ($r.status -eq 409) -and ($r.body -match 'already registered')
    Write-Host "  OK: $ok30 (expect True)"

    # 31. warga DELETE register KGT-002 (sebelum startsAt 17 Okt) -> 200 CANCELLED
    Write-Host "`n[31] warga DELETE portal register KGT-002 (expect 200 CANCELLED)" -ForegroundColor Yellow
    $r = Api-Delete $warga "/api/community/portal/events/$kgt002Id/register"
    Write-Host "  status: $($r.status)"
    Write-Host "  body: $($r.body)"
    try {
        $row = ($r.body | ConvertFrom-Json).data
        Write-Host "  data.status: $($row.status) (expect CANCELLED)"
        $ok31 = ($r.status -eq 200) -and ($row.status -eq 'CANCELLED')
    }
    catch {}
    Write-Host "  OK: $ok31 (expect True)"

    # 32. warga DELETE lagi (sudah CANCELLED) -> 404 not registered
    Write-Host "`n[32] warga DELETE portal register KGT-002 lagi (expect 404 not registered)" -ForegroundColor Yellow
    $r = Api-Delete $warga "/api/community/portal/events/$kgt002Id/register"
    Write-Host "  status: $($r.status)"
    Write-Host "  body: $($r.body)"
    $ok32 = ($r.status -eq 404) -and ($r.body -match 'not registered')
    Write-Host "  OK: $ok32 (expect True)"

    # 33. warga POST register ulang (reactivasi in-place) -> 201 REGISTERED
    Write-Host "`n[33] warga POST portal register KGT-002 (expect 201 reactivated REGISTERED)" -ForegroundColor Yellow
    $r = Api-Post $warga "/api/community/portal/events/$kgt002Id/register" ''
    Write-Host "  status: $($r.status)"
    Write-Host "  body: $($r.body)"
    try {
        $row = ($r.body | ConvertFrom-Json).data
        Write-Host "  data.status: $($row.status) (expect REGISTERED)"
        $ok33 = ($r.status -eq 201) -and ($row.status -eq 'REGISTERED') -and ($r.body -match 'reactivated')
    }
    catch {}
    Write-Host "  OK: $ok33 (expect True)"

    # 34. warga DELETE register KGT-001 (W-001 ATTENDED - kehadiran final) -> 409
    Write-Host "`n[34] warga DELETE portal register KGT-001 (expect 409 attendance already recorded)" -ForegroundColor Yellow
    $r = Api-Delete $warga "/api/community/portal/events/$kgt001Id/register"
    Write-Host "  status: $($r.status)"
    Write-Host "  body: $($r.body)"
    $ok34 = ($r.status -eq 409) -and ($r.body -match 'attendance already recorded')
    Write-Host "  OK: $ok34 (expect True)"

    # 35. warga POST register KGT-003 (CANCELLED + unpublished) -> 404
    Write-Host "`n[35] warga POST portal register KGT-003 (expect 404 event not found)" -ForegroundColor Yellow
    $r = Api-Post $warga "/api/community/portal/events/$kgt003Id/register" ''
    Write-Host "  status: $($r.status)"
    Write-Host "  body: $($r.body)"
    $ok35 = ($r.status -eq 404)
    Write-Host "  OK: $ok35 (expect True)"
}
else {
    Write-Host "`n[25-35] SKIP: id kegiatan seed KGT/2026-001..003 tidak ter-resolve dari [16]/list" -ForegroundColor Yellow
}

# 36. admin tenant lain GET portal/events -> 401/403
Write-Host "`n[36] admin@qalcuity.com GET /api/community/portal/events (expect 401/403)" -ForegroundColor Yellow
$r = Api-Get $admin '/api/community/portal/events?limit=5'
Write-Host "  status: $($r.status)"
Write-Host "  body(first 300): $($r.body.Substring(0, [Math]::Min(300, $r.body.Length)))"
$ok36 = ($r.status -eq 401) -or ($r.status -eq 403)
Write-Host "  OK: $ok36 (expect True)"

# ═══ Fase 4A: Aset Komunitas (S37–S44) ═══════════════════════

# 37. ketua GET /api/community/assets (expect 200, 12 rows seed)
Write-Host "`n[37] ketua GET /api/community/assets (expect 200, total=12)" -ForegroundColor Yellow
$r = Api-Get $ketua '/api/community/assets?limit=100'
Write-Host "  status: $($r.status)"
$ok37 = $false
$seedAssetId = $null
try {
    $json37 = $r.body | ConvertFrom-Json
    $ok37 = ($r.status -eq 200) -and ($json37.total -eq 12) -and ($json37.data.Count -eq 12)
    $seedAssetId = $json37.data[0].id
    Write-Host "  total: $($json37.total), rows: $($json37.data.Count)"
}
catch { Write-Host "  parse error: $_" }
Write-Host "  OK: $ok37 (expect True)"

# 38. ketua POST aset smoke (expect 201 + assetCode auto AST/…)
$smokeAssetName = 'Smoke test aset ' + (Get-Date -Format 'yyyyMMddHHmmss')
$createBody = '{"name":"' + $smokeAssetName + '","category":"PERABOT","condition":"BAIK","status":"AKTIF","location":"Balai RT","notes":"Smoke test Fase 4A"}'
Write-Host "`n[38] ketua POST /api/community/assets (expect 201 + auto assetCode)" -ForegroundColor Yellow
$r = Api-Post $ketua '/api/community/assets' $createBody
Write-Host "  status: $($r.status)"
$ok38 = $false
$smokeAssetId = $null
try {
    $json38 = $r.body | ConvertFrom-Json
    $smokeAssetId = $json38.data.id
    $smokeAssetCode = $json38.data.assetCode
    $ok38 = ($r.status -eq 201) -and ($smokeAssetId) -and ($smokeAssetCode -match '^AST/')
    Write-Host "  id: $smokeAssetId, assetCode: $smokeAssetCode"
}
catch { Write-Host "  parse error: $_" }
Write-Host "  OK: $ok38 (expect True)"

# 39. ketua POST dengan custodianMemberId ghost (expect 404 — custodian tidak boleh diterima)
Write-Host "`n[39] ketua POST aset w/ ghost custodian (expect 404 member not found)" -ForegroundColor Yellow
$ghostBody = '{"name":"Smoke test aset ghost","category":"LAINNYA","condition":"BAIK","status":"AKTIF","custodianMemberId":"cm_smoke_ghost_member_x"}'
$r = Api-Post $ketua '/api/community/assets' $ghostBody
Write-Host "  status: $($r.status)"
Write-Host "  body(first 300): $($r.body.Substring(0, [Math]::Min(300, $r.body.Length)))"
# handleApiError menghasilkan plain error message (tanpa field code) — wajib 404 + "not found".
$ok39 = ($r.status -eq 404) -and ($r.body -match 'not found')
Write-Host "  OK: $ok39 (expect True)"

# 40. ketua PUT aset smoke condition -> RUSAK_RINGAN (expect 200)
$ok40 = $false
if ($smokeAssetId) {
    Write-Host "`n[40] ketua PUT aset smoke condition -> RUSAK_RINGAN (expect 200)" -ForegroundColor Yellow
    $r = Api-Put $ketua "/api/community/assets/$smokeAssetId" '{"condition":"RUSAK_RINGAN"}'
    Write-Host "  status: $($r.status)"
    Write-Host "  body(first 300): $($r.body.Substring(0, [Math]::Min(300, $r.body.Length)))"
    $ok40 = ($r.status -eq 200) -and ($r.body -match 'RUSAK_RINGAN')
    Write-Host "  OK: $ok40 (expect True)"
}
else {
    Write-Host "`n[40] SKIP: id aset smoke dari [38] tidak tersedia" -ForegroundColor Yellow
}

# 41. warga GET portal/assets (expect 200, HANYA 5 field — tanpa cost/custodian)
Write-Host "`n[41] warga GET /api/community/portal/assets (expect 200, 5-field only)" -ForegroundColor Yellow
$r = Api-Get $warga '/api/community/portal/assets'
Write-Host "  status: $($r.status)"
$leaked41 = ($r.body -match 'acquisitionCost') -or ($r.body -match 'custodianMemberId') -or ($r.body -match 'custodian')
$ok41 = ($r.status -eq 200) -and (-not $leaked41)
Write-Host "  leak field terlarang: $leaked41"
Write-Host "  OK: $ok41 (expect True)"

# 42. bendahara POST aset (expect 403 — role tidak punya community:manage)
Write-Host "`n[42] bendahara POST /api/community/assets (expect 403)" -ForegroundColor Yellow
$r = Api-Post $bendahara '/api/community/assets' $createBody
Write-Host "  status: $($r.status)"
Write-Host "  body(first 300): $($r.body.Substring(0, [Math]::Min(300, $r.body.Length)))"
$ok42 = ($r.status -eq 403)
Write-Host "  OK: $ok42 (expect True)"

# 43. admin tenant lain GET /api/community/assets/[id] rt02 (expect DENIED: 403 RBAC_STRICT atau 404 ASSET_NOT_FOUND — tanpa kebocoran data)
$ok43 = $false
if ($seedAssetId) {
    Write-Host "`n[43] admin@qalcuity.com GET aset rt02 (expect denied 403/404, no data leak)" -ForegroundColor Yellow
    $r = Api-Get $admin "/api/community/assets/$seedAssetId"
    Write-Host "  status: $($r.status)"
    Write-Host "  body(first 300): $($r.body.Substring(0, [Math]::Min(300, $r.body.Length)))"
    # admin tenant lain tidak punya community:view (RBAC_STRICT 403 di depan) ATAU tenant isolation 404.
    # Keduanya MENOLAK akses — keamanan tetap berlaku; yang diuji: tidak ada data aset yang bocor.
    $denied43 = ($r.status -eq 403) -or ($r.status -eq 404)
    $leak43 = ($r.body -match '"assetCode"') -or ($r.body -match 'AST/2026-')
    Write-Host "  denied(403/404): $denied43 | data leak: $leak43"
    $ok43 = $denied43 -and (-not $leak43)
    Write-Host "  OK: $ok43 (expect True)"
}
else {
    Write-Host "`n[43] SKIP: id aset seed dari [37] tidak tersedia" -ForegroundColor Yellow
}

# 44. ketua DELETE aset smoke (expect 200; list & summary totalAssets turun 1)
$ok44 = $false
if ($smokeAssetId) {
    Write-Host "`n[44] ketua DELETE aset smoke (expect 200 + totalAssets turun 1)" -ForegroundColor Yellow
    $sumBefore = Api-Get $ketua '/api/community/assets/summary'
    $totalBefore = ($sumBefore.body | ConvertFrom-Json).data.totalAssets
    $r = Api-Delete $ketua "/api/community/assets/$smokeAssetId"
    Write-Host "  status: $($r.status)"
    $sumAfter = Api-Get $ketua '/api/community/assets/summary'
    $totalAfter = ($sumAfter.body | ConvertFrom-Json).data.totalAssets
    Write-Host "  totalAssets before: $totalBefore, after: $totalAfter"
    $listAfter = Api-Get $ketua '/api/community/assets?limit=100'
    $listTotal = ($listAfter.body | ConvertFrom-Json).total
    Write-Host "  list total after delete: $listTotal (expect 12)"
    $ok44 = ($r.status -eq 200) -and ($totalAfter -eq ($totalBefore - 1)) -and ($listTotal -eq 12)
    Write-Host "  OK: $ok44 (expect True)"
}
else {
    Write-Host "`n[44] SKIP: id aset smoke dari [38] tidak tersedia" -ForegroundColor Yellow
}

Write-Host "`n=== RINGKASAN SESSION 73/74 ===" -ForegroundColor Cyan
Write-Host "  [17] letters page:      $ok17" -ForegroundColor $(if ($ok17) { 'Green' } else { 'Red' })
Write-Host "  [18] events page:       $ok18" -ForegroundColor $(if ($ok18) { 'Green' } else { 'Red' })
Write-Host "  [19] verify valid:      $ok19" -ForegroundColor $(if ($ok19) { 'Green' } else { 'Red' })
Write-Host "  [20] verify 404:        $notFoundOk" -ForegroundColor $(if ($notFoundOk) { 'Green' } else { 'Red' })
Write-Host "  [21] portal letters:    $ok21" -ForegroundColor $(if ($ok21) { 'Green' } else { 'Red' })
Write-Host "  [22] portal events:     $ok22" -ForegroundColor $(if ($ok22) { 'Green' } else { 'Red' })
Write-Host "  [23] cash eventId=valid:  $ok23" -ForegroundColor $(if ($ok23) { 'Green' } else { 'Red' })
Write-Host "  [24] cash eventId=404:    $ok24" -ForegroundColor $(if ($ok24) { 'Green' } else { 'Red' })

Write-Host "`n--- Fase 3: Pendaftaran Peserta Kegiatan ---" -ForegroundColor Cyan
Write-Host "  [25] GET participants 5 rows:   $ok25" -ForegroundColor $(if ($ok25) { 'Green' } else { 'Red' })
Write-Host "  [26] duplikat 409:              $ok26" -ForegroundColor $(if ($ok26) { 'Green' } else { 'Red' })
Write-Host "  [27] ghost member 404:          $ok27" -ForegroundColor $(if ($ok27) { 'Green' } else { 'Red' })
Write-Host "  [28] warga internal 403:        $ok28" -ForegroundColor $(if ($ok28) { 'Green' } else { 'Red' })
Write-Host "  [29] portal embed:              $ok29" -ForegroundColor $(if ($ok29) { 'Green' } else { 'Red' })
Write-Host "  [30] register dup 409:          $ok30" -ForegroundColor $(if ($ok30) { 'Green' } else { 'Red' })
Write-Host "  [31] cancel 200 CANCELLED:      $ok31" -ForegroundColor $(if ($ok31) { 'Green' } else { 'Red' })
Write-Host "  [32] cancel lagi 404:           $ok32" -ForegroundColor $(if ($ok32) { 'Green' } else { 'Red' })
Write-Host "  [33] re-register 201:           $ok33" -ForegroundColor $(if ($ok33) { 'Green' } else { 'Red' })
Write-Host "  [34] ATTENDED cancel 409:       $ok34" -ForegroundColor $(if ($ok34) { 'Green' } else { 'Red' })
Write-Host "  [35] unpublished 404:           $ok35" -ForegroundColor $(if ($ok35) { 'Green' } else { 'Red' })
Write-Host "  [36] admin portal 401/403:      $ok36" -ForegroundColor $(if ($ok36) { 'Green' } else { 'Red' })

Write-Host "`n--- Fase 4A: Aset Komunitas ---" -ForegroundColor Cyan
Write-Host "  [37] ketua list 12 rows:        $ok37" -ForegroundColor $(if ($ok37) { 'Green' } else { 'Red' })
Write-Host "  [38] POST 201 auto assetCode:   $ok38" -ForegroundColor $(if ($ok38) { 'Green' } else { 'Red' })
Write-Host "  [39] ghost custodian 404:       $ok39" -ForegroundColor $(if ($ok39) { 'Green' } else { 'Red' })
Write-Host "  [40] PUT condition 200:         $ok40" -ForegroundColor $(if ($ok40) { 'Green' } else { 'Red' })
Write-Host "  [41] portal 5-field no leak:    $ok41" -ForegroundColor $(if ($ok41) { 'Green' } else { 'Red' })
Write-Host "  [42] bendahara POST 403:        $ok42" -ForegroundColor $(if ($ok42) { 'Green' } else { 'Red' })
Write-Host "  [43] cross-tenant denied:       $ok43" -ForegroundColor $(if ($ok43) { 'Green' } else { 'Red' })
Write-Host "  [44] DELETE + turun 1:          $ok44" -ForegroundColor $(if ($ok44) { 'Green' } else { 'Red' })

Write-Host "`n=== SELESAI ===" -ForegroundColor Cyan
