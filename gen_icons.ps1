Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$root = 'd:\ERP-main\twelo-review\client\android\app\src\main\res'
$src = [System.Drawing.Image]::FromFile('d:\ERP-main\twelo-review\client\public\icon-512x512.png')

function Resize-Image([System.Drawing.Image]$img, [int]$size, [double]$cropRatio) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $crop = [int](((1.0 - $cropRatio) * $img.Width) / 2.0)
    $dest = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $srcRect = New-Object System.Drawing.Rectangle($crop, $crop, ($img.Width - 2 * $crop), ($img.Height - 2 * $crop))
    $g.DrawImage($img, $dest, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    return $bmp
}

# 1) Launcher icons (legacy densities) = full site logo
$lmap = @{ 'ldpi' = 36; 'mdpi' = 48; 'hdpi' = 72; 'xhdpi' = 96; 'xxhdpi' = 144; 'xxxhdpi' = 192 }
foreach ($d in $lmap.Keys) {
    $dir = Join-Path $root "mipmap-$d"
    if (Test-Path $dir) {
        $sz = $lmap[$d]
        $img = Resize-Image $src $sz 1.0
        $img.Save((Join-Path $dir 'ic_launcher.png'), [System.Drawing.Imaging.ImageFormat]::Png)
        $img.Save((Join-Path $dir 'ic_launcher_round.png'), [System.Drawing.Imaging.ImageFormat]::Png)
        $img.Dispose()
        Write-Output "launcher $d $sz"
    }
}

# 2) Adaptive foreground = zoomed crop of the logo (bubble fills the safe zone)
$fmap = @{ 'ldpi' = 81; 'mdpi' = 108; 'hdpi' = 162; 'xhdpi' = 216; 'xxhdpi' = 324; 'xxxhdpi' = 432 }
foreach ($d in $fmap.Keys) {
    $dir = Join-Path $root "mipmap-$d"
    if (Test-Path $dir) {
        $img = Resize-Image $src $fmap[$d] 0.74
        $img.Save((Join-Path $dir 'ic_launcher_foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)
        $img.Dispose()
        Write-Output "foreground $d"
    }
}

# 3) Notification status icon: white bubble silhouette with the T knocked out
function Make-Silhouette([System.Drawing.Image]$img, [int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $size, $size)
    $g.Dispose()
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $bytes = New-Object byte[] ($data.Stride * $data.Height)
    [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
    for ($i = 0; $i -lt $bytes.Length; $i += 4) {
        $b = $bytes[$i]; $gg = $bytes[$i + 1]; $r = $bytes[$i + 2]
        $max = [Math]::Max($r, [Math]::Max($gg, $b))
        if ($r -gt 215 -and $gg -gt 215 -and $b -gt 215) {
            $bytes[$i + 3] = 0              # white T glyph -> negative space
        } elseif ($max -gt 110) {
            $bytes[$i] = 255; $bytes[$i + 1] = 255; $bytes[$i + 2] = 255; $bytes[$i + 3] = 255  # bubble -> solid white
        } else {
            $bytes[$i + 3] = 0              # dark background/glow -> transparent
        }
    }
    [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
    $bmp.UnlockBits($data)
    return $bmp
}
$smap = @{ 'mdpi' = 24; 'hdpi' = 36; 'xhdpi' = 48; 'xxhdpi' = 72; 'xxxhdpi' = 96 }
foreach ($d in $smap.Keys) {
    $dir = Join-Path $root "drawable-$d"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $img = Make-Silhouette $src $smap[$d]
    $img.Save((Join-Path $dir 'ic_stat_twelo.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    $img.Dispose()
    Write-Output "stat $d"
}
$src.Dispose()
Write-Output 'DONE'
