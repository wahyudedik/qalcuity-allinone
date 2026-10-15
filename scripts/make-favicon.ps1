# One-off: konversi public/favicon.png -> public/favicon.ico (PNG-in-ICO, 16x16 + 32x32)
# Jalankan: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/make-favicon.ps1
Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\apps\web\public\favicon.png"
$outPath = Join-Path $PSScriptRoot "..\apps\web\public\favicon.ico"

if (-not (Test-Path $srcPath)) {
    Write-Error "Source tidak ditemukan: $srcPath"
    exit 1
}

$src = [System.Drawing.Image]::FromFile($srcPath)

function New-PngBytes($image, $size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($image, 0, 0, $size, $size)
    $g.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $bytes = $ms.ToArray()
    $ms.Dispose()
    return , $bytes
}

$sizes = @(16, 32)
$pngBlobs = @()
foreach ($s in $sizes) {
    $pngBlobs += , (New-PngBytes $src $s)
}
$src.Dispose()

# Susun struktur ICO: ICONDIR (6 byte) + ICONDIRENTRY (16 byte/entry) + PNG blobs
$fs = [System.IO.File]::Create($outPath)
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([UInt16]0)              # reserved
$bw.Write([UInt16]1)              # type: icon
$bw.Write([UInt16]$sizes.Count)   # count

$offset = 6 + (16 * $sizes.Count)
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $s = $sizes[$i]
    $data = $pngBlobs[$i]
    $bw.Write([Byte]$s)           # width  (0 = 256)
    $bw.Write([Byte]$s)           # height (0 = 256)
    $bw.Write([Byte]0)            # palette color count
    $bw.Write([Byte]0)            # reserved
    $bw.Write([UInt16]1)          # color planes
    $bw.Write([UInt16]32)         # bits per pixel
    $bw.Write([UInt32]$data.Length)
    $bw.Write([UInt32]$offset)
    $offset += $data.Length
}
foreach ($data in $pngBlobs) {
    $bw.Write($data)
}
$bw.Close()
$fs.Close()

$created = Get-Item $outPath
Write-Host "OK: $($created.FullName) ($($created.Length) bytes)"
