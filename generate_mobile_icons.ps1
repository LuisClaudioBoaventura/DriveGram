Add-Type -AssemblyName System.Drawing

$publicIcons = "c:\Users\luizi\Downloads\Code\Projeto - DriveGram\public\icons"
if (!(Test-Path $publicIcons)) {
    New-Item -ItemType Directory -Path $publicIcons -Force | Out-Null
}

function Generate-DriveGramPng([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $g.Clear([System.Drawing.Color]::Transparent)

    # Scale factor
    $scale = [float]$size / 256.0

    # Gradient circle
    $rect = New-Object System.Drawing.Rectangle(
        [int](12 * $scale),
        [int](12 * $scale),
        [int](232 * $scale),
        [int](232 * $scale)
    )
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 36, 161, 222),
        [System.Drawing.Color]::FromArgb(255, 26, 115, 232),
        [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
    )
    $g.FillEllipse($brush, $rect)
    $brush.Dispose()

    # Inner highlight ring
    $ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 255, 255, 255), [float](3 * $scale))
    $g.DrawEllipse($ringPen, [int](15 * $scale), [int](15 * $scale), [int](226 * $scale), [int](226 * $scale))
    $ringPen.Dispose()

    # Paper Plane Graphic
    $planeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $p1 = New-Object System.Drawing.PointF([float](190 * $scale), [float](75 * $scale))
    $p2 = New-Object System.Drawing.PointF([float](55 * $scale), [float](125 * $scale))
    $p3 = New-Object System.Drawing.PointF([float](110 * $scale), [float](155 * $scale))
    $p4 = New-Object System.Drawing.PointF([float](150 * $scale), [float](195 * $scale))
    $p5 = New-Object System.Drawing.PointF([float](135 * $scale), [float](145 * $scale))

    $wing1 = @($p1, $p2, $p5)
    $g.FillPolygon($planeBrush, $wing1)

    $shadeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 240, 250, 255))
    $wing2 = @($p1, $p5, $p4)
    $g.FillPolygon($shadeBrush, $wing2)

    $wing3 = @($p5, $p3, (New-Object System.Drawing.PointF([float](125 * $scale), [float](165 * $scale))))
    $g.FillPolygon($planeBrush, $wing3)

    $planeBrush.Dispose()
    $shadeBrush.Dispose()
    $g.Dispose()

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

Generate-DriveGramPng 192 "$publicIcons\icon-192.png"
Generate-DriveGramPng 512 "$publicIcons\icon-512.png"
Generate-DriveGramPng 512 "$publicIcons\icon-maskable-512.png"
Generate-DriveGramPng 180 "$publicIcons\apple-touch-icon.png"

Write-Output "Mobile Icons generated successfully in $publicIcons"
