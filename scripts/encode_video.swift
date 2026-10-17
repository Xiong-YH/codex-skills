import Foundation
import AVFoundation
import AppKit
import ImageIO

let source = CommandLine.arguments[1]
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let width = 1920, height = 1080
let fps = Int32(CommandLine.arguments[4])!
let frameCount = Int(CommandLine.arguments[3])!
if FileManager.default.fileExists(atPath: output.path) { try FileManager.default.removeItem(at: output) }
let writer = try AVAssetWriter(outputURL: output, fileType: .mp4)
let settings: [String: Any] = [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: width,
  AVVideoHeightKey: height,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: 14_000_000,
    AVVideoMaxKeyFrameIntervalKey: 60,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
  ],
  AVVideoColorPropertiesKey: [
    AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
    AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
    AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2
  ]
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
  kCVPixelBufferWidthKey as String: width,
  kCVPixelBufferHeightKey as String: height,
  kCVPixelBufferCGImageCompatibilityKey as String: true,
  kCVPixelBufferCGBitmapContextCompatibilityKey as String: true
])
writer.add(input)
writer.shouldOptimizeForNetworkUse = true
guard writer.startWriting() else { fatalError("Cannot start writer: \(String(describing: writer.error))") }
writer.startSession(atSourceTime: .zero)
for frame in 0..<frameCount {
  while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.003) }
  autoreleasepool {
    let file = URL(fileURLWithPath: source).appendingPathComponent(String(format: "frame_%04d.png", frame))
    guard let imageSource = CGImageSourceCreateWithURL(file as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(imageSource, 0, nil) else { fatalError("Cannot read frame \(frame)") }
    var pixelBuffer: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(kCFAllocatorDefault, adaptor.pixelBufferPool!, &pixelBuffer)
    guard let buffer = pixelBuffer else { fatalError("Cannot create buffer") }
    CVPixelBufferLockBaseAddress(buffer, [])
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    guard let context = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: width, height: height,
      bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: colorSpace,
      bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue) else { fatalError("Cannot create context") }
    context.interpolationQuality = .none
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    CVPixelBufferUnlockBaseAddress(buffer, [])
    guard adaptor.append(buffer, withPresentationTime: CMTime(value: Int64(frame), timescale: fps)) else {
      fatalError("Frame append failed: \(String(describing: writer.error))")
    }
  }
  if frame % 90 == 0 { print("Encoded \(frame)/\(frameCount)") }
}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
guard writer.status == .completed else { fatalError("Encoding failed: \(String(describing: writer.error))") }
print("Saved: \(output.path)")
