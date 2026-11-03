Add-Type -AssemblyName System.Drawing
$dir=$PSScriptRoot
$img=[Drawing.Bitmap]::FromFile((Join-Path $dir 'ultra-board.png'))
$regions=@{'ultra-sprite.png'=@(0,0,520,1024);'ultra-room.png'=@(538,14,985,997);'ultra-prop.png'=@(790,530,470,210)}
try{foreach($name in $regions.Keys){$r=$regions[$name];$rect=New-Object Drawing.Rectangle $r[0],$r[1],$r[2],$r[3];$part=$img.Clone($rect,$img.PixelFormat);try{$part.Save((Join-Path $dir $name),[Drawing.Imaging.ImageFormat]::Png)}finally{$part.Dispose()}}}finally{$img.Dispose()}
