Add-Type -AssemblyName System.Drawing

$rootDir = (Resolve-Path "$PSScriptRoot\..").Path
$srcPath = "C:\Users\luizi\.gemini\antigravity\brain\40dde89c-fe37-4536-bd9a-7d0c132b5858\.user_uploaded\media_1789823758041.png"

if (!(Test-Path $srcPath)) {
    Write-Error "Source image not found at $srcPath"
    exit 1
}

$rawSrc = [System.Drawing.Bitmap]::FromFile($srcPath)

# 1. Create seamless master 1024x1024 with feathered edges
$outSize = 1024
$masterBmp = New-Object System.Drawing.Bitmap($outSize, $outSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gMaster = [System.Drawing.Graphics]::FromImage($masterBmp)
$gMaster.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gMaster.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gMaster.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$topColor = $rawSrc.GetPixel(225, 2)
$bottomColor = $rawSrc.GetPixel(225, $rawSrc.Height - 3)

$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Rectangle(0, 0, $outSize, $outSize)),
    $topColor,
    $bottomColor,
    [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
)
$gMaster.FillRectangle($bgBrush, 0, 0, $outSize, $outSize)
$bgBrush.Dispose()

# Create edge-feathered version of rawSrc to avoid any seam
$fadedSrc = New-Object System.Drawing.Bitmap($rawSrc.Width, $rawSrc.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$fadeRows = 12

for ($y = 0; $y -lt $rawSrc.Height; $y++) {
    $alphaMult = 1.0
    if ($y -lt $fadeRows) {
        $alphaMult = [Math]::Pow([double]$y / $fadeRows, 1.5)
    } elseif ($y -ge ($rawSrc.Height - $fadeRows)) {
        $alphaMult = [Math]::Pow([double]($rawSrc.Height - 1 - $y) / $fadeRows, 1.5)
    }
    
    for ($x = 0; $x -lt $rawSrc.Width; $x++) {
        $p = $rawSrc.GetPixel($x, $y)
        $a = [int]($p.A * $alphaMult)
        $fadedSrc.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($a, $p.R, $p.G, $p.B))
    }
}

$scale = 2.45
$destW = [int]($rawSrc.Width * $scale)
$destH = [int]($rawSrc.Height * $scale)
$destX = [int](($outSize - $destW) / 2)
$destY = [int](($outSize - $destH) / 2)

$gMaster.DrawImage($fadedSrc, $destX, $destY, $destW, $destH)
$gMaster.Dispose()
$fadedSrc.Dispose()
$rawSrc.Dispose()

Write-Output "[Icons] 1024x1024 master canvas generated successfully."

# Helper functions for resizing and shapes
function Resize-Image([System.Drawing.Bitmap]$source, [int]$w, [int]$h) {
    $dest = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($source, 0, 0, $w, $h)
    $g.Dispose()
    return $dest
}

function Create-RoundedRectPath([System.Drawing.RectangleF]$rect, [float]$radius) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2.0
    $arc = New-Object System.Drawing.RectangleF($rect.X, $rect.Y, $diameter, $diameter)
    
    $path.AddArc($arc, 180, 90)
    $arc.X = $rect.Right - $diameter
    $path.AddArc($arc, 270, 90)
    $arc.Y = $rect.Bottom - $diameter
    $path.AddArc($arc, 0, 90)
    $arc.X = $rect.Left
    $path.AddArc($arc, 90, 90)
    $path.CloseFigure()
    return $path
}

function Create-Squircle([System.Drawing.Bitmap]$source, [float]$radiusRatio = 0.20) {
    $dest = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $radius = [float]($source.Width * $radiusRatio)
    $rect = New-Object System.Drawing.RectangleF(0, 0, $source.Width, $source.Height)
    $path = Create-RoundedRectPath $rect $radius
    $g.SetClip($path)
    $g.DrawImage($source, 0, 0, $source.Width, $source.Height)
    $g.Dispose()
    return $dest
}

function Create-Round([System.Drawing.Bitmap]$source) {
    $dest = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $source.Width, $source.Height)
    $g.SetClip($path)
    $g.DrawImage($source, 0, 0, $source.Width, $source.Height)
    $g.Dispose()
    return $dest
}

$squircleMaster = Create-Squircle $masterBmp 0.20
$roundMaster = Create-Round $masterBmp

# Save base master images in src-tauri/icons/
$tauriIconsDir = "$rootDir\src-tauri\icons"
if (!(Test-Path $tauriIconsDir)) { New-Item -ItemType Directory -Path $tauriIconsDir -Force | Out-Null }

$squircleMaster.Save("$tauriIconsDir\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$masterBmp.Save("$tauriIconsDir\icon_full.png", [System.Drawing.Imaging.ImageFormat]::Png)

# 2. Generate PWA / Web icons in public/icons
$publicIconsDir = "$rootDir\public\icons"
if (!(Test-Path $publicIconsDir)) { New-Item -ItemType Directory -Path $publicIconsDir -Force | Out-Null }

# icon-512.png & icon-192.png (Squircle for beautiful web/app appearance)
$pwa512 = Resize-Image $squircleMaster 512 512
$pwa512.Save("$publicIconsDir\icon-512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$pwa512.Dispose()

$pwa192 = Resize-Image $squircleMaster 192 192
$pwa192.Save("$publicIconsDir\icon-192.png", [System.Drawing.Imaging.ImageFormat]::Png)
$pwa192.Dispose()

# icon-maskable-512.png (Needs full bleed square so OS masks it properly)
$pwaMaskable = Resize-Image $masterBmp 512 512
$pwaMaskable.Save("$publicIconsDir\icon-maskable-512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$pwaMaskable.Dispose()

# apple-touch-icon.png (180x180 full bleed square, iOS adds its own corner radius)
$appleTouch = Resize-Image $masterBmp 180 180
$appleTouch.Save("$publicIconsDir\apple-touch-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$appleTouch.Dispose()

Write-Output "[Icons] PWA and Web icons saved to $publicIconsDir"

# 3. Android mipmaps
$androidResDir = "$rootDir\android\app\src\main\res"

$androidSizes = @{
    "mipmap-mdpi"    = @{ launcher = 48;  foreground = 108 }
    "mipmap-hdpi"    = @{ launcher = 72;  foreground = 162 }
    "mipmap-xhdpi"   = @{ launcher = 96;  foreground = 216 }
    "mipmap-xxhdpi"  = @{ launcher = 144; foreground = 324 }
    "mipmap-xxxhdpi" = @{ launcher = 192; foreground = 432 }
}

foreach ($folderName in $androidSizes.Keys) {
    $folderPath = Join-Path $androidResDir $folderName
    if (Test-Path $folderPath) {
        $lSize = $androidSizes[$folderName].launcher
        $fSize = $androidSizes[$folderName].foreground

        # ic_launcher.png (squircle)
        $icLauncher = Resize-Image $squircleMaster $lSize $lSize
        $icLauncher.Save((Join-Path $folderPath "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $icLauncher.Dispose()

        # ic_launcher_round.png (round)
        $icRound = Resize-Image $roundMaster $lSize $lSize
        $icRound.Save((Join-Path $folderPath "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $icRound.Dispose()

        # ic_launcher_foreground.png (scaled foreground for adaptive icons)
        # In 108dp adaptive canvas, safe logo fits in ~72dp center (scale 72/108 ~= 66.6%)
        $fgBmp = New-Object System.Drawing.Bitmap($fSize, $fSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $gFg = [System.Drawing.Graphics]::FromImage($fgBmp)
        $gFg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $gFg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gFg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $gFg.Clear([System.Drawing.Color]::Transparent)

        # Scale logo down slightly so it's fully inside adaptive safe-zone
        $innerSize = [int]($fSize * 0.72)
        $innerOffset = [int](($fSize - $innerSize) / 2)
        $gFg.DrawImage($squircleMaster, $innerOffset, $innerOffset, $innerSize, $innerSize)
        $gFg.Dispose()

        $fgBmp.Save((Join-Path $folderPath "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $fgBmp.Dispose()
    }
}

Write-Output "[Icons] Android mipmaps updated in $androidResDir"

$masterBmp.Dispose()
$squircleMaster.Dispose()
$roundMaster.Dispose()

Write-Output "[Icons] Base image generation complete."
