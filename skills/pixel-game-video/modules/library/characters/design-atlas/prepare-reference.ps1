# Run with Windows PowerShell 5.1 (powershell.exe), not pwsh.
# Finishing for these fox reference images; does not overwrite input or output.
param([Parameter(Mandatory=$true)][string]$InputImage,
      [Parameter(Mandatory=$true)][string]$OutputImage,
      [ValidateSet('four-tone','ultra-grid')][string]$Mode='four-tone')
$ErrorActionPreference='Stop'
if (Test-Path -LiteralPath $OutputImage) { throw 'Output already exists' }
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
public static class PixelReference {
  public static void Run(string input, string output, bool grid) {
    int[] hex = grid ? new int[]{0x291e24,0x795038,0xc8914c,0xef7025,0xffe4a5,0x285e68,0x86cbd6,0x8f8d82}
                     : new int[]{0x0f380f,0x306230,0x8bac0f,0x9bbc0f};
    Color[] palette=Array.ConvertAll(hex,h=>Color.FromArgb((h>>16)&255,(h>>8)&255,h&255));
    using(var src=new Bitmap(input)) {
      int w=grid?40:src.Width, h=grid?40:src.Height, scale=grid?24:1;
      using(var dst=new Bitmap(w*scale,h*scale,PixelFormat.Format24bppRgb)) {
        for(int y=0;y<h;y++) for(int x=0;x<w;x++) {
          Color c=src.GetPixel(grid?(int)((x+0.5)*src.Width/w):x,grid?(int)((y+0.5)*src.Height/h):y);
          int best=0; double distance=double.MaxValue;
          for(int i=0;i<palette.Length;i++) {
            double d=0.2126*Math.Pow(c.R-palette[i].R,2)+0.7152*Math.Pow(c.G-palette[i].G,2)+0.0722*Math.Pow(c.B-palette[i].B,2);
            if(d<distance){distance=d;best=i;}
          }
          for(int dy=0;dy<scale;dy++)for(int dx=0;dx<scale;dx++)dst.SetPixel(x*scale+dx,y*scale+dy,palette[best]);
        }
        // Restore the fox's one-logical-pixel eye lost during reduction.
        if(grid)for(int dy=0;dy<scale;dy++)for(int dx=0;dx<scale;dx++)dst.SetPixel(22*scale+dx,15*scale+dy,palette[0]);
        dst.Save(output,ImageFormat.Png);
      }
    }
    using(var check=new Bitmap(output)) {
      var colors=new HashSet<int>();
      for(int y=0;y<check.Height;y++)for(int x=0;x<check.Width;x++){
        colors.Add(check.GetPixel(x,y).ToArgb());
        if(grid&&check.GetPixel(x,y).ToArgb()!=check.GetPixel(x/24*24,y/24*24).ToArgb())throw new Exception("Uneven grid");
      }
      if(!grid && colors.Count!=4)throw new Exception("Expected exactly four colors");
      Console.WriteLine(check.Width+"x"+check.Height+", colors="+colors.Count+", grid="+(grid?"40x40 at 24x":"unchanged"));
    }
  }
}
'@
[PixelReference]::Run((Resolve-Path -LiteralPath $InputImage).Path,[IO.Path]::GetFullPath($OutputImage),($Mode -eq 'ultra-grid'))
