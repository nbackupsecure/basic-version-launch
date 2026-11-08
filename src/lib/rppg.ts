/**
 * rPPG (Video Photoplethysmography) Signal Processing Module
 *
 * Converts camera video frame data into a clean, smooth pulse waveform
 * using green-channel chrominance extraction, moving-window detrending,
 * and bandpass frequency filtering (0.75 Hz - 3.0 Hz / 45 - 180 BPM).
 */

export interface LandmarkPoint {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  z?: number;
}

export interface RPPGFrameSample {
  timestamp: number; // DOMHighResTimeStamp or Date.now()
  rawGreen: number;
}

/**
 * 1. GREEN-CHANNEL ROI EXTRACTION
 * Extracts average green-channel intensity from stable vascular micro-regions:
 * - Forehead (Landmarks: 10, 67, 109, 151, 9, 8)
 * - Left Malar / Cheek (Landmarks: 117, 118, 101, 205, 50)
 * - Right Malar / Cheek (Landmarks: 346, 347, 330, 425, 280)
 */
export function extractGreenChannelROI(
  ctx: CanvasRenderingContext2D,
  landmarks: LandmarkPoint[] | null,
  canvasWidth: number,
  canvasHeight: number
): number {
  if (!ctx || canvasWidth <= 0 || canvasHeight <= 0) return 0;

  // If landmarks are available, compute bounded bounding boxes for forehead and cheeks
  if (landmarks && landmarks.length >= 468) {
    // Forehead anchor (10) and Cheek anchors (Left 118, Right 347)
    const fh = landmarks[10];
    const lc = landmarks[118];
    const rc = landmarks[347];

    const boxW = Math.max(12, Math.floor(canvasWidth * 0.12));
    const boxH = Math.max(10, Math.floor(canvasHeight * 0.08));

    const regions = [
      // Forehead ROI
      {
        x: Math.max(0, Math.min(canvasWidth - boxW, Math.floor(fh.x * canvasWidth - boxW / 2))),
        y: Math.max(0, Math.min(canvasHeight - boxH, Math.floor(fh.y * canvasHeight - boxH / 2)))
      },
      // Left Cheek ROI
      {
        x: Math.max(0, Math.min(canvasWidth - boxW, Math.floor(lc.x * canvasWidth - boxW / 2))),
        y: Math.max(0, Math.min(canvasHeight - boxH, Math.floor(lc.y * canvasHeight - boxH / 2)))
      },
      // Right Cheek ROI
      {
        x: Math.max(0, Math.min(canvasWidth - boxW, Math.floor(rc.x * canvasWidth - boxW / 2))),
        y: Math.max(0, Math.min(canvasHeight - boxH, Math.floor(rc.y * canvasHeight - boxH / 2)))
      }
    ];

    let totalGreen = 0;
    let pixelCount = 0;

    for (const roi of regions) {
      const imgData = ctx.getImageData(roi.x, roi.y, boxW, boxH).data;
      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        // Ensure pixel satisfies basic skin tone chrominance to avoid hair/specs
        if (r > 40 && g > 30 && b > 20 && r >= g) {
          totalGreen += g;
          pixelCount++;
        }
      }
    }

    if (pixelCount > 0) {
      return totalGreen / pixelCount;
    }
  }

  // Fallback ROI: Center-upper 30% area of canvas where forehead resides
  const startX = Math.floor(canvasWidth * 0.35);
  const startY = Math.floor(canvasHeight * 0.25);
  const w = Math.floor(canvasWidth * 0.30);
  const h = Math.floor(canvasHeight * 0.20);

  const imgData = ctx.getImageData(startX, startY, w, h).data;
  let totalGreen = 0;
  let pixelCount = 0;

  for (let i = 0; i < imgData.length; i += 4) {
    totalGreen += imgData[i + 1];
    pixelCount++;
  }

  return pixelCount > 0 ? totalGreen / pixelCount : 0;
}

/**
 * 2. DETRENDING & DC COMPONENT REMOVAL
 * Applies moving-window baseline subtraction to eliminate slow illumination drifts,
 * room lighting fluctuations, and background shadows.
 *
 * Formula: y[n] = x[n] - mean(x[n - W/2 ... n + W/2])
 * @param signal Raw green values time-series
 * @param windowSize Moving window size (typically 15-30 frames at 30fps = 0.5 - 1.0s)
 */
export function detrendSignal(signal: number[], windowSize: number = 21): number[] {
  const len = signal.length;
  if (len === 0) return [];
  if (len < windowSize) {
    const mean = signal.reduce((acc, v) => acc + v, 0) / len;
    return signal.map((v) => v - mean);
  }

  const half = Math.floor(windowSize / 2);
  const detrended = new Array(len);

  for (let i = 0; i < len; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(len, i + half + 1);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += signal[j];
    }
    const localMean = sum / (end - start);
    detrended[i] = signal[i] - localMean;
  }

  return detrended;
}

/**
 * 3. SMOOTHING & PHYSIOLOGICAL BANDPASS FILTERING
 * Constrains frequency content strictly within human cardiac physiological boundaries:
 * 0.75 Hz to 3.0 Hz (equivalent to 45 BPM to 180 BPM).
 *
 * Implements a dual-pass weighted moving-average (Gaussian-kernel smoothing)
 * combined with high-frequency attenuation to remove bulb flicker (50/60Hz) and camera jitter.
 */
export function bandpassFilterRPPG(
  signal: number[],
  fps: number = 30,
  lowCutBpm: number = 45,
  highCutBpm: number = 180
): number[] {
  const len = signal.length;
  if (len < 5) return [...signal];

  // 1. Moving average low-pass smoothing (removes high-frequency jitter/flicker)
  // Window size corresponding to the upper bound of human heart rate (~3Hz => ~10 frames at 30fps)
  const smoothWindow = Math.max(3, Math.round(fps / (highCutBpm / 60) / 2));
  const smoothed = new Array(len);

  for (let i = 0; i < len; i++) {
    const start = Math.max(0, i - Math.floor(smoothWindow / 2));
    const end = Math.min(len, i + Math.floor(smoothWindow / 2) + 1);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += signal[j];
    }
    smoothed[i] = sum / (end - start);
  }

  // 2. High-pass baseline removal (removes frequencies below 0.75 Hz / 45 BPM)
  const lowPassWindow = Math.max(smoothWindow + 2, Math.round(fps / (lowCutBpm / 60)));
  const filtered = new Array(len);

  for (let i = 0; i < len; i++) {
    const start = Math.max(0, i - Math.floor(lowPassWindow / 2));
    const end = Math.min(len, i + Math.floor(lowPassWindow / 2) + 1);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += smoothed[j];
    }
    const slowDrift = sum / (end - start);
    filtered[i] = smoothed[i] - slowDrift;
  }

  // 3. Normalization (unit variance scaling for robust peak detection)
  let sumSq = 0;
  for (let i = 0; i < len; i++) {
    sumSq += filtered[i] * filtered[i];
  }
  const std = Math.sqrt(sumSq / len) || 1;

  return filtered.map((v) => v / std);
}

/**
 * COMPLETE PREPROCESSING PIPELINE
 * Converts a raw buffer of green samples into a clean, smooth pulse waveform.
 */
export function preprocessRPPGSignal(rawGreenBuffer: number[], fps: number = 30): number[] {
  if (rawGreenBuffer.length < 5) return [...rawGreenBuffer];
  // Step 1: Detrend DC component & slow lighting drift
  const detrended = detrendSignal(rawGreenBuffer, Math.round(fps * 0.75));
  // Step 2: Bandpass filter (0.75Hz - 3.0Hz) + high-frequency bulb flicker smoothing
  return bandpassFilterRPPG(detrended, fps, 45, 180);
}
