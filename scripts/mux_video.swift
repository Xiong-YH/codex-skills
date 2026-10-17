import Foundation
import AVFoundation

let videoURL = URL(fileURLWithPath: CommandLine.arguments[1])
let audioURL = URL(fileURLWithPath: CommandLine.arguments[2])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[3])
let audioOffset = Double(CommandLine.arguments[4])!
let composition = AVMutableComposition()
let videoAsset = AVURLAsset(url: videoURL)
let audioAsset = AVURLAsset(url: audioURL)
let duration = videoAsset.duration
let video = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
let audio = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
try video.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: videoAsset.tracks(withMediaType: .video)[0], at: .zero)
try audio.insertTimeRange(CMTimeRange(start: CMTime(seconds: audioOffset, preferredTimescale: 48000), duration: duration), of: audioAsset.tracks(withMediaType: .audio)[0], at: .zero)
if FileManager.default.fileExists(atPath: outputURL.path) { try FileManager.default.removeItem(at: outputURL) }
let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality)!
exporter.outputURL = outputURL
exporter.outputFileType = .mp4
exporter.shouldOptimizeForNetworkUse = true
let done = DispatchSemaphore(value: 0)
exporter.exportAsynchronously { done.signal() }
done.wait()
guard exporter.status == .completed else { fatalError("Mux failed: \(String(describing: exporter.error))") }
let result = AVURLAsset(url: outputURL)
print("Saved: \(outputURL.path)")
print("Duration: \(CMTimeGetSeconds(result.duration))s, video: \(result.tracks(withMediaType: .video).count), audio: \(result.tracks(withMediaType: .audio).count)")
