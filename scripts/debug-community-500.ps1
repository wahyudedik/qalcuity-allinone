# Debug helper (PS 5.1 compatible): ambil error body dari community API.
$base = 'http://localhost:3001'

function Get-BodyFromError($ex) {
    try {
        $resp = $ex.Response
        if (-not $resp) { return '(no response)' }
        $stream = $resp.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $reader.BaseStream.Position = 0
        $body = $reader.ReadToEnd()
        $reader.Close()
        return "STATUS: $([int]$resp.StatusCode)`nBODY: $body"
    }
    catch {
        return "(failed to read body: $($_.Exception.Message))"
    }
}

$s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrf = Invoke-WebRequest -Uri "$base/api/auth/csrf" -WebSession $s -UseBasicParsing
$tok = ($csrf.Content | ConvertFrom-Json).csrfToken
$ck = [uri]::EscapeDataString($tok)
Invoke-WebRequest -Uri "$base/api/auth/callback/credentials" -Method POST `
    -Body "csrfToken=$ck&email=ketua@rt02-melati.test&password=community123" `
    -WebSession $s -UseBasicParsing -MaximumRedirection 5 | Out-Null

$paths = @(
    '/api/community/members?limit=5',
    '/api/community/cash-transactions?limit=5',
    '/api/community/portal/bills?limit=5'
)

foreach ($p in $paths) {
    Write-Host "=== GET $p ==="
    try {
        $r = Invoke-WebRequest -Uri "$base$p" -WebSession $s -UseBasicParsing -MaximumRedirection 5
        Write-Host ("STATUS: " + [int]$r.StatusCode)
        Write-Host ("BODY: " + [string]$r.Content)
    }
    catch {
        Write-Host (Get-BodyFromError $_.Exception)
    }
    Write-Host ''
}
