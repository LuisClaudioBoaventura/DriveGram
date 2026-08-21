Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size)
$g = [System.Drawing.Graphics]::FromImage($bmp)

$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

# Clear background (transparent)
$g.Clear([System.Drawing.Color]::Transparent)

# Draw subtle shadow / outer glow
$shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 0, 100, 200))
$g.FillEllipse($shadowBrush, 10, 14, 236, 236)
$shadowBrush.Dispose()

# Draw main circular gradient (Telegram Blue to Drive Sky Blue)
$rect = New-Object System.Drawing.Rectangle(12, 12, 232, 232)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect,
    [System.Drawing.Color]::FromArgb(255, 36, 161, 222), # Telegram Blue
    [System.Drawing.Color]::FromArgb(255, 26, 115, 232), # Drive Blue
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
)
$g.FillEllipse($brush, $rect)
$brush.Dispose()

# Inner highlight ring
$ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 255, 255, 255), 3)
$g.DrawEllipse($ringPen, 15, 15, 226, 226)
$ringPen.Dispose()

# Draw Cloud / Telegram Paper Plane graphic in white
$planeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

# Paper Plane Polygon coordinates
$p1 = New-Object System.Drawing.PointF(190, 75)
$p2 = New-Object System.Drawing.PointF(55, 125)
$p3 = New-Object System.Drawing.PointF(110, 155)
$p4 = New-Object System.Drawing.PointF(150, 195)
$p5 = New-Object System.Drawing.PointF(135, 145)

# Main wing
$wing1 = @(
    $p1,
    $p2,
    $p5
)
$g.FillPolygon($planeBrush, $wing1)

# Middle wing with slight shading
$shadeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 240, 250, 255))
$wing2 = @(
    $p1,
    $p5,
    $p4
)
$g.FillPolygon($shadeBrush, $wing2)

# Fold bottom
$wing3 = @(
    $p5,
    $p3,
    (New-Object System.Drawing.PointF(125, 165))
)
$g.FillPolygon($planeBrush, $wing3)

$planeBrush.Dispose()
$shadeBrush.Dispose()
$g.Dispose()

# Convert bitmap to true .ico format
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)

$icoPath = "c:\Users\luizi\Downloads\Code\Projeto - DriveGram\app_icon.ico"
$fileStream = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)
$icon.Save($fileStream)
$fileStream.Close()
$icon.Dispose()
$bmp.Dispose()

# Update Desktop shortcut with the new icon
$ws = New-Object -ComObject WScript.Shell
$desktopShortcut = "$([Environment]::GetFolderPath('Desktop'))\DriveGram.lnk"
if (Test-Path $desktopShortcut) {
    $s = $ws.CreateShortcut($desktopShortcut)
    $s.IconLocation = "$icoPath,0"
    $s.Save()
}

Write-Output "Icon created and shortcut updated successfully!"
