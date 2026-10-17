import Foundation
import AVFoundation
import AppKit

let asset=AVURLAsset(url:URL(fileURLWithPath:CommandLine.arguments[1]))
let directory=URL(fileURLWithPath:CommandLine.arguments[2])
let track=asset.tracks(withMediaType:.video)[0]
let reader=try AVAssetReader(asset:asset)
let output=AVAssetReaderTrackOutput(track:track,outputSettings:[kCVPixelBufferPixelFormatTypeKey as String:kCVPixelFormatType_32BGRA])
reader.add(output)
reader.startReading()
var timestamps=[Double]()
while let sample=output.copyNextSampleBuffer(){timestamps.append(CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sample)))}
timestamps.sort()
let intervals=zip(timestamps,timestamps.dropFirst()).map{$1-$0}
let values:[String:Any]=[
  "durationSeconds":CMTimeGetSeconds(asset.duration),"fps":track.nominalFrameRate,
  "width":track.naturalSize.width,"height":track.naturalSize.height,
  "decodedFrames":timestamps.count,"distinctTimestamps":Set(timestamps).count,
  "minimumFrameInterval":intervals.min()!,"maximumFrameInterval":intervals.max()!,
  "videoTracks":asset.tracks(withMediaType:.video).count,"audioTracks":asset.tracks(withMediaType:.audio).count
]
let json=try JSONSerialization.data(withJSONObject:values,options:[.prettyPrinted,.sortedKeys])
try FileManager.default.createDirectory(at:directory,withIntermediateDirectories:true)
try json.write(to:directory.appendingPathComponent("metadata.json"))
let generator=AVAssetImageGenerator(asset:asset)
generator.appliesPreferredTrackTransform=true
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero
let durationSeconds=CMTimeGetSeconds(asset.duration)
let fps = Double(track.nominalFrameRate)
let sampleTimes=[0.05,0.18,0.32,0.45,0.59,0.72,0.85,0.95,0.999].map{min(timestamps.last!, floor($0*durationSeconds*fps)/fps)}
for (i,second) in sampleTimes.enumerated(){
  let image=try generator.copyCGImage(at:CMTime(seconds:second,preferredTimescale:60000),actualTime:nil)
  let bitmap=NSBitmapImageRep(cgImage:image)
  let png=bitmap.representation(using:.png,properties:[:])!
  try png.write(to:directory.appendingPathComponent(String(format:"decoded-%02d.png",i+1)))
}
print(String(data:json,encoding:.utf8)!)
