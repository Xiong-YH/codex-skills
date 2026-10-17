import Foundation
import AVFoundation
import AudioToolbox

let asset=AVURLAsset(url:URL(fileURLWithPath:CommandLine.arguments[1]))
let reader=try AVAssetReader(asset:asset)
let track=asset.tracks(withMediaType:.audio)[0]
let output=AVAssetReaderTrackOutput(track:track,outputSettings:[
    AVFormatIDKey:kAudioFormatLinearPCM, AVLinearPCMBitDepthKey:32,
    AVLinearPCMIsFloatKey:true, AVLinearPCMIsBigEndianKey:false,
    AVLinearPCMIsNonInterleaved:false, AVSampleRateKey:48000, AVNumberOfChannelsKey:2
])
reader.add(output)
guard reader.startReading() else {fatalError("Audio decode could not start")}
var data=Data()
var firstTime:Double?=nil
while let sample=output.copyNextSampleBuffer(){
    if firstTime == nil {firstTime=CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sample))}
    guard let block=CMSampleBufferGetDataBuffer(sample) else {continue}
    let length=CMBlockBufferGetDataLength(block)
    var chunk=Data(count:length)
    let result=chunk.withUnsafeMutableBytes {buffer in
        CMBlockBufferCopyDataBytes(block,atOffset:0,dataLength:length,destination:buffer.baseAddress!)
    }
    guard result == noErr else {fatalError("Audio PCM copy failed")}
    data.append(chunk)
}
guard reader.status == .completed else {fatalError("Audio decode failed: \(String(describing:reader.error))")}
try data.write(to:URL(fileURLWithPath:CommandLine.arguments[2]))
print("Decoded \(data.count / 8) stereo PCM frames at 48000 Hz; first timestamp \(firstTime ?? -1)")
