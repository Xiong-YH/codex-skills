$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$styleRoot=Split-Path -Parent $PSScriptRoot
$legacyRoot=Join-Path $styleRoot '../library/characters/design-atlas'
$pack=Get-Content -LiteralPath (Join-Path $styleRoot 'art-profiles.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$manifest=@()
foreach($profile in $pack.profiles){
  $dest=Join-Path $styleRoot ('references/'+$profile.id)
  New-Item -ItemType Directory -Force $dest | Out-Null
  $src=Join-Path $legacyRoot $profile.source.file
  $image=[Drawing.Bitmap]::FromFile($src)
  try {
    if($null -ne $profile.source.cell){
      $cell=[int]$profile.source.cell
      $xs=@(0,514,1030); $ws=@(500,500,506); $row=[int][Math]::Floor($cell/3)
      $rect=New-Object Drawing.Rectangle ($xs[$cell%3]),($(if($row -eq 0){0}else{500})),($ws[$cell%3]),($(if($row -eq 0){486}else{524}))
      $scene=$image.Clone($rect,$image.PixelFormat)
    } else { $scene=$image.Clone() }
    try {
      $scene.Save((Join-Path $dest 'scene.png'),[Drawing.Imaging.ImageFormat]::Png)
      $regions=@{ 'character-detail.png'=@(.08,.02,.76,.96); 'background-detail.png'=@(0,0,.35,.58); 'prop-detail.png'=@(.48,.40,.46,.36) }
      foreach($name in $regions.Keys){
        $r=$regions[$name];$rect=New-Object Drawing.Rectangle ([int]($r[0]*$scene.Width)),([int]($r[1]*$scene.Height)),([int]($r[2]*$scene.Width)),([int]($r[3]*$scene.Height))
        $detail=$scene.Clone($rect,$scene.PixelFormat)
        try{$detail.Save((Join-Path $dest $name),[Drawing.Imaging.ImageFormat]::Png)}finally{$detail.Dispose()}
      }
    } finally {$scene.Dispose()}
  } finally {$image.Dispose()}
  foreach($file in Get-ChildItem -LiteralPath $dest -Filter '*.png'){
    $manifest+=@{file=('references/'+$profile.id+'/'+$file.Name);sha256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLower();source=('../library/characters/design-atlas/'+$profile.source.file);sourceSha256=(Get-FileHash -LiteralPath $src -Algorithm SHA256).Hash.ToLower();method='reference extraction only; details are crops, not independent production assets';approval='inherits approved source art direction; crop is not new animation approval'}
  }
}
@{version=1;date='2026-11-01';method='System.Drawing rectangle extraction; no generative repaint';platformVerified='Windows PowerShell 5.1';assets=$manifest}|ConvertTo-Json -Depth 8|Set-Content -LiteralPath (Join-Path $styleRoot 'references/sources.json') -Encoding UTF8
Write-Output ('Extracted '+$manifest.Count+' references across 8 profiles')
