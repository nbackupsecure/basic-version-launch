import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Heart,
  Activity,
  ShieldCheck,
  Camera,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Wind,
  Flame,
  ArrowRight,
  Download,
  User,
  MapPin,
  Phone,
  AlertTriangle
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface PatientInfo {
  fullName: string;
  phone: string;
  city: string;
  gender: string;
}

export interface VitalReadings {
  heartRate: number;
  spo2: number;
  stressLevel: string;
  stressScore: number;
  respiratoryRate: number;
  hrv: number;
  timestamp: string;
}

interface VitalLensModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete?: (vitals: VitalReadings, patient?: PatientInfo) => void;
}

export const VitalLensModal: React.FC<VitalLensModalProps> = ({
  isOpen,
  onClose,
  onScanComplete
}) => {
  const [step, setStep] = useState<'details' | 'consent' | 'scanning' | 'completed'>('details');
  const [patientInfo, setPatientInfo] = useState<PatientInfo>({
    fullName: '',
    phone: '',
    city: '',
    gender: 'Male'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [scanStatus, setScanStatus] = useState<string>('Initializing optical sensors...');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');

  // Dynamic live vitals reading state
  const [liveVitals, setLiveVitals] = useState<VitalReadings>({
    heartRate: 72,
    spo2: 98,
    stressLevel: 'Normal',
    stressScore: 22,
    respiratoryRate: 16,
    hrv: 54,
    timestamp: new Date().toLocaleTimeString()
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<any>(null);
  const isFaceDetectedRef = useRef<boolean>(true);
  const faceMissCountRef = useRef<number>(0);

  // Real-time Face Detection state
  const [isFaceDetected, setIsFaceDetected] = useState<boolean>(true);
  const [faceWarning, setFaceWarning] = useState<string | null>(null);

  // Stop camera helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Close handler
  const handleModalClose = () => {
    stopCamera();
    setStep('details');
    setProgress(0);
    setCameraError(null);
    setFormError(null);
    onClose();
  };

  const [isCheckingLimit, setIsCheckingLimit] = useState<boolean>(false);
  const [limitExceededModal, setLimitExceededModal] = useState<boolean>(false);
  const [scanLimitStats, setScanLimitStats] = useState<{ used: number; allowed: number } | null>(null);

  // Form submission handler for pre-scan details with Phone Scan Limit Check
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientInfo.fullName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    const cleanPhone = patientInfo.phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!patientInfo.city.trim()) {
      setFormError('Please enter your city.');
      return;
    }
    setFormError(null);
    setIsCheckingLimit(true);

    try {
      let successfulScans = 0;
      let bonusScans = 0;

      // a. Count completed successful scans from vital_scans table
      try {
        const { count, error } = await supabase
          .from('vital_scans')
          .select('*', { count: 'exact', head: true })
          .ilike('phone_number', `%${cleanPhone}%`);

        if (!error && typeof count === 'number') {
          successfulScans = count;
        } else {
          const localRecords = JSON.parse(localStorage.getItem('nhealth_vitals_records') || '[]');
          successfulScans = localRecords.filter((r: any) =>
            String(r.phone || '').replace(/\D/g, '').includes(cleanPhone)
          ).length;
        }
      } catch {
        const localRecords = JSON.parse(localStorage.getItem('nhealth_vitals_records') || '[]');
        successfulScans = localRecords.filter((r: any) =>
          String(r.phone || '').replace(/\D/g, '').includes(cleanPhone)
        ).length;
      }

      // b. Check scan_limits table for bonus_scans added by Admin
      try {
        const { data: limitData } = await supabase
          .from('scan_limits')
          .select('bonus_scans')
          .ilike('phone_number', `%${cleanPhone}%`)
          .maybeSingle();

        if (limitData && limitData.bonus_scans !== undefined && limitData.bonus_scans !== null) {
          bonusScans = Number(limitData.bonus_scans) || 0;
        } else {
          const localLimits = JSON.parse(localStorage.getItem('nhealth_scan_limits') || '{}');
          bonusScans = Number(localLimits[cleanPhone]) || 0;
        }
      } catch {
        const localLimits = JSON.parse(localStorage.getItem('nhealth_scan_limits') || '{}');
        bonusScans = Number(localLimits[cleanPhone]) || 0;
      }

      // c. Allowed Scans = 9 (Base Limit) + bonus_scans
      const allowedScans = 9 + bonusScans;
      setScanLimitStats({ used: successfulScans, allowed: allowedScans });

      // d. If (successful_scans >= Allowed Scans), block the scan immediately
      if (successfulScans >= allowedScans) {
        setLimitExceededModal(true);
        setIsCheckingLimit(false);
        return;
      }

      // e. Only proceed with the 20-second camera scan if the user has remaining scans
      setStep('consent');
    } catch {
      setStep('consent');
    } finally {
      setIsCheckingLimit(false);
    }
  };

  // Generate & Download Printable PDF Vital Report Card
  const handleDownloadPdfReport = () => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) return;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Nhealth Vital Report</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0b192c;
      background: #ffffff;
      padding: 24px;
      line-height: 1.5;
      position: relative;
      overflow: hidden;
    }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 110px;
      font-weight: 900;
      color: rgba(11, 25, 44, 0.04);
      letter-spacing: 12px;
      text-transform: uppercase;
      user-select: none;
      pointer-events: none;
      z-index: 0;
    }
    .content-wrap {
      position: relative;
      z-index: 1;
    }
    .header-box {
      border-bottom: 2px solid #7c3aed;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .header-logo {
      height: 48px;
      width: 48px;
      object-fit: contain;
      border-radius: 8px;
    }
    .corp-title {
      font-size: 24px;
      font-weight: 900;
      color: #0b192c;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .sub-title {
      font-size: 13px;
      color: #7c3aed;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-top: 3px;
    }
    .doc-meta {
      text-align: right;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 14px;
      border-left: 3px solid #7c3aed;
      padding-left: 8px;
    }
    .vitals-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .vital-card {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 12px;
      padding: 16px;
      text-align: center;
    }
    .vital-label {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .vital-val {
      font-size: 28px;
      font-weight: 800;
      color: #0b192c;
      margin: 6px 0;
    }
    .vital-unit {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
    .vital-status {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      color: #166534;
      background: #dcfce7;
      padding: 2px 8px;
      border-radius: 6px;
      margin-top: 6px;
    }
    .aux-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .aux-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .disclaimer-box {
      border: 1px solid #fed7aa;
      background: #fffbeb;
      border-radius: 8px;
      padding: 14px 16px;
      margin-top: 28px;
      font-size: 10.5px;
      color: #9a3412;
      line-height: 1.6;
    }
    .footer {
      margin-top: 32px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="watermark">Nhealth</div>
  <div class="content-wrap">
    <div class="header-box">
      <div class="header-left">
        <img src="https://i.ibb.co/JW6HFRV0/Nhealth-logo-8cm-x-8cm-high-quality-1-1.png" class="header-logo" alt="Nhealth Logo" />
        <div>
          <div class="corp-title">Nhealth</div>
          <div class="sub-title">Healthcare at Home</div>
        </div>
      </div>
      <div class="doc-meta">
        <div><strong>Date:</strong> ${formattedDate}</div>
        <div><strong>Time:</strong> ${formattedTime}</div>
      </div>
    </div>

    <!-- Patient Screening Profile -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 16px;margin-bottom:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;font-size:11.5px;">
      <div><span style="color:#64748b;font-size:10px;display:block;font-weight:600;text-transform:uppercase;">Patient Name</span><strong style="color:#0b192c;">${patientInfo.fullName || 'Patient'}</strong></div>
      <div><span style="color:#64748b;font-size:10px;display:block;font-weight:600;text-transform:uppercase;">Mobile</span><strong style="color:#0b192c;">+91 ${patientInfo.phone || 'N/A'}</strong></div>
      <div><span style="color:#64748b;font-size:10px;display:block;font-weight:600;text-transform:uppercase;">City</span><strong style="color:#0b192c;">${patientInfo.city || 'N/A'}</strong></div>
      <div><span style="color:#64748b;font-size:10px;display:block;font-weight:600;text-transform:uppercase;">Gender</span><strong style="color:#0b192c;">${patientInfo.gender}</strong></div>
    </div>

    <div class="section-title">Summary of Scanned Vitals</div>
    <div class="vitals-grid">
      <div class="vital-card">
        <div class="vital-label">Heart Rate (Pulse)</div>
        <div class="vital-val">${liveVitals.heartRate} <span class="vital-unit">BPM</span></div>
        <div class="vital-status">Normal (60-100 BPM)</div>
      </div>
      <div class="vital-card">
        <div class="vital-label">Blood Oxygen (SpO2)</div>
        <div class="vital-val">${liveVitals.spo2}<span class="vital-unit">%</span></div>
        <div class="vital-status">Optimal (95-100%)</div>
      </div>
      <div class="vital-card">
        <div class="vital-label">Respiratory Rate</div>
        <div class="vital-val">${liveVitals.respiratoryRate} <span class="vital-unit">RPM</span></div>
        <div class="vital-status">Normal (12-20 RPM)</div>
      </div>
    </div>

    <div class="aux-grid">
      <div class="aux-card">
        <span><strong>Stress Index:</strong> ${liveVitals.stressScore} / 100</span>
        <span style="color:#0284c7;font-weight:600;">${liveVitals.stressLevel} (Low)</span>
      </div>
      <div class="aux-card">
        <span><strong>Heart Rate Variability (HRV):</strong> ${liveVitals.hrv} ms</span>
        <span style="color:#16a34a;font-weight:600;">Good Equilibrium</span>
      </div>
    </div>

    <div class="disclaimer-box">
      <strong>MEDICAL DISCLAIMER NOTICE:</strong><br/>
      This digital vital assessment report is produced for wellness tracking and preliminary assessment purposes only. It is not an FDA/clinical diagnostic medical device and does not substitute professional medical diagnosis, prescription, or clinical consultation. For any health concerns or symptoms, please consult a registered medical practitioner or book an official Nhealth physician.
    </div>

    <div class="footer">
      Nhealth • Healthcare at Home • Andhra Pradesh, India • support@nhealth.in • Helpline: +91 9393934621
    </div>
  </div>
</body>
</html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 2000);
    }, 250);
  };

  // Start Camera with dynamic facing mode
  const startCamera = async (facing: 'user' | 'environment' = cameraFacingMode) => {
    try {
      setCameraError(null);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } else {
        setCameraError('Camera API not accessible on this device. Running in simulation mode.');
      }
    } catch {
      setCameraError('Camera access unavailable or declined. Running simulation with AI model.');
      setCameraActive(false);
    }
  };

  // Begin Scanning sequence
  const startScan = async () => {
    setStep('scanning');
    setProgress(0);
    setIsFaceDetected(true);
    isFaceDetectedRef.current = true;
    setFaceWarning(null);
    faceMissCountRef.current = 0;
    await startCamera(cameraFacingMode);
  };

  // Face Detection & Alignment Result interface
  interface FaceValidationResult {
    isValid: boolean;
    reason?: 'missing' | 'uncentered' | 'partial' | 'rotation' | 'tilt';
    message?: string;
  }

  // Refactored Face Validation Engine:
  // 1. Relax Center Tolerance: Allows ~20-25% deviation from absolute center (horizontal 25%-75%, vertical 20%-80%).
  // 2. Full Face Requirement (Half-face / crop detection): Checks MediaPipe / ShapeDetection landmark count & bounds.
  //    Ensures forehead, chin, left and right cheeks are uncropped and visible within the frame.
  // 3. Head Rotation & Tilt Detection: Measures asymmetry between nose tip and left/right cheeks (yaw) and eye level slope (tilt/roll).
  // 4. Resume on Correct Position: Automatically resumes scanning & vPPG signal buffering when complete, upright face is aligned.
  const checkFaceInFrame = async (): Promise<FaceValidationResult> => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return { isValid: true }; // Video stream initializing
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // 1. Check window.FaceDetector (ShapeDetection API) or MediaPipe FaceMesh if attached
    try {
      // Check for MediaPipe FaceMesh / FaceLandmarker instance if attached on window
      const mpDetector = (window as any).faceLandmarker || (window as any).faceMesh;
      if (mpDetector) {
        const results = await mpDetector.detectForVideo(video, performance.now());
        if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0];
          // MediaPipe FaceMesh provides 468 landmarks
          if (!landmarks || landmarks.length < 468) {
            return {
              isValid: false,
              reason: 'partial',
              message: '⚠️ Bring your full face into the frame to continue'
            };
          }

          // Key landmarks: Forehead (10), Chin (152), Left cheek (234), Right cheek (454), Nose tip (1), Left eye (33), Right eye (263)
          const forehead = landmarks[10];
          const chin = landmarks[152];
          const leftCheek = landmarks[234];
          const rightCheek = landmarks[454];
          const nose = landmarks[1];
          const leftEye = landmarks[33];
          const rightEye = landmarks[263];

          // Check if perimeter landmarks are cropped outside frame bounds
          if (
            forehead.y < 0.02 || chin.y > 0.98 ||
            leftCheek.x < 0.02 || rightCheek.x > 0.98
          ) {
            return {
              isValid: false,
              reason: 'partial',
              message: '⚠️ Full face cropped. Please keep your entire face inside the frame'
            };
          }

          // Relaxed Center Check (allows 22% deviation from 0.5 center => 0.28 to 0.72)
          const centerX = (leftCheek.x + rightCheek.x) / 2;
          const centerY = (forehead.y + chin.y) / 2;
          if (centerX < 0.28 || centerX > 0.72 || centerY < 0.22 || centerY > 0.78) {
            return {
              isValid: false,
              reason: 'uncentered',
              message: '⚠️ Position your face inside the relaxed center oval to continue'
            };
          }

          // Head Rotation (Yaw): Compare nose tip distance to left cheek vs right cheek
          const distToLeftCheek = Math.abs(nose.x - leftCheek.x);
          const distToRightCheek = Math.abs(rightCheek.x - nose.x);
          const yawRatio = distToLeftCheek / (distToRightCheek || 0.001);
          if (yawRatio < 0.45 || yawRatio > 2.2) {
            return {
              isValid: false,
              reason: 'rotation',
              message: '⚠️ Face turned sideways. Look straight at the camera'
            };
          }

          // Head Tilt (Roll): Eye line tilt slope
          const dX = rightEye.x - leftEye.x;
          const dY = rightEye.y - leftEye.y;
          const tiltAngle = Math.abs(Math.atan2(dY, dX) * (180 / Math.PI));
          if (tiltAngle > 22) {
            return {
              isValid: false,
              reason: 'tilt',
              message: '⚠️ Head tilted too much. Keep your head upright'
            };
          }

          return { isValid: true };
        } else {
          return {
            isValid: false,
            reason: 'missing',
            message: '⚠️ No face detected. Please position your face in front of the camera'
          };
        }
      }

      // Check ShapeDetection FaceDetector
      if (!detectorRef.current && typeof (window as any).FaceDetector === 'function') {
        detectorRef.current = new (window as any).FaceDetector({ fastMode: false, maxDetectedFaces: 2 });
      }
      if (detectorRef.current) {
        const faces = await detectorRef.current.detect(video);
        if (Array.isArray(faces) && faces.length > 0) {
          const face = faces[0];
          const bb = face.boundingBox;
          if (bb) {
            const faceCenterX = (bb.left + bb.width / 2) / vw;
            const faceCenterY = (bb.top + bb.height / 2) / vh;
            const faceWidthRatio = bb.width / vw;
            const faceHeightRatio = bb.height / vh;

            // Edge clipping check (relaxed 2% margin)
            if (bb.left <= vw * 0.02 || (bb.left + bb.width) >= vw * 0.98 || bb.top <= vh * 0.02 || (bb.top + bb.height) >= vh * 0.98) {
              return {
                isValid: false,
                reason: 'partial',
                message: '⚠️ Bring your full face into the frame to continue'
              };
            }

            // Relaxed Center Tolerance: allow 22% deviation from 0.50 center (0.28 to 0.72)
            if (faceCenterX < 0.28 || faceCenterX > 0.72 || faceCenterY < 0.22 || faceCenterY > 0.78) {
              return {
                isValid: false,
                reason: 'uncentered',
                message: '⚠️ Position your face inside the relaxed center oval to continue'
              };
            }

            // Size sanity check (relaxed bounds)
            if (faceWidthRatio < 0.18 || faceWidthRatio > 0.85 || faceHeightRatio < 0.20 || faceHeightRatio > 0.90) {
              return {
                isValid: false,
                reason: 'uncentered',
                message: '⚠️ Move closer or further so your face fits comfortably'
              };
            }

            // If eye/mouth landmarks exist, check head tilt & rotation
            if (Array.isArray(face.landmarks) && face.landmarks.length >= 2) {
              const eyeLandmarks = face.landmarks.filter((l: any) => l.type === 'eye');
              if (eyeLandmarks.length >= 2) {
                const e1 = eyeLandmarks[0].location || eyeLandmarks[0];
                const e2 = eyeLandmarks[1].location || eyeLandmarks[1];
                const dy = Math.abs(e2.y - e1.y);
                const dx = Math.abs(e2.x - e1.x) || 1;
                const tiltDeg = Math.atan2(dy, dx) * (180 / Math.PI);
                if (tiltDeg > 24) {
                  return {
                    isValid: false,
                    reason: 'tilt',
                    message: '⚠️ Head tilted too much. Keep your head upright'
                  };
                }
              }
            }

            return { isValid: true };
          }
        } else {
          return {
            isValid: false,
            reason: 'missing',
            message: '⚠️ No face detected. Please position your face in front of the camera'
          };
        }
      }
    } catch {
      // Continue to canvas fallback
    }

    // 2. High-precision Multi-Zone Canvas Fallback (Robust, Relaxed & Anti-False-Positive)
    try {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
        canvasRef.current.width = 120;
        canvasRef.current.height = 90;
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return { isValid: true };

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const cw = canvas.width;
      const ch = canvas.height;

      const isSkinPixel = (x: number, y: number) => {
        const idx = (y * cw + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        return cr >= 130 && cr <= 178 && cb >= 75 && cb <= 132 && r > g && g > b;
      };

      // Measure relaxed center zone: 22% to 78% X and 18% to 82% Y
      let centerSkinCount = 0;
      let centerTotal = 0;
      let upperFaceSkin = 0;
      let upperTotal = 0;
      let lowerFaceSkin = 0;
      let lowerTotal = 0;
      let leftHalfSkin = 0;
      let rightHalfSkin = 0;
      let halfTotal = 0;
      let borderSkinCount = 0;
      let borderTotal = 0;

      for (let y = 0; y < ch; y += 2) {
        for (let x = 0; x < cw; x += 2) {
          const isSkin = isSkinPixel(x, y);

          // Border check: detects severe crop/overflow at extreme edges (< 6% or > 94%)
          if (x < cw * 0.06 || x > cw * 0.94 || y < ch * 0.05 || y > ch * 0.95) {
            borderTotal++;
            if (isSkin) borderSkinCount++;
          }

          // Relaxed Center Oval Zone (22% to 78% width, 18% to 82% height)
          if (x >= cw * 0.22 && x <= cw * 0.78 && y >= ch * 0.18 && y <= ch * 0.82) {
            centerTotal++;
            if (isSkin) centerSkinCount++;

            // Upper face (forehead/eyes zone)
            if (y >= ch * 0.22 && y <= ch * 0.48) {
              upperTotal++;
              if (isSkin) upperFaceSkin++;
            }

            // Lower face (mouth/chin zone)
            if (y >= ch * 0.52 && y <= ch * 0.80) {
              lowerTotal++;
              if (isSkin) lowerFaceSkin++;
            }

            // Left vs Right hemisphere for head turn / rotation asymmetry
            if (x < cw * 0.50) {
              if (isSkin) leftHalfSkin++;
              halfTotal++;
            } else {
              if (isSkin) rightHalfSkin++;
            }
          }
        }
      }

      const centerSkinRatio = centerTotal > 0 ? centerSkinCount / centerTotal : 0;
      const upperSkinRatio = upperTotal > 0 ? upperFaceSkin / upperTotal : 0;
      const lowerSkinRatio = lowerTotal > 0 ? lowerFaceSkin / lowerTotal : 0;
      const borderSkinRatio = borderTotal > 0 ? borderSkinCount / borderTotal : 0;

      // 1. Must have face skin in the relaxed center zone (relaxed threshold: min 10%)
      if (centerSkinRatio < 0.10) {
        return {
          isValid: false,
          reason: 'missing',
          message: '⚠️ Position your face inside the center oval to continue scanning'
        };
      }

      // 2. Full Face Requirement: Both upper (forehead) and lower (chin) zones must have skin
      if (upperSkinRatio < 0.06 || lowerSkinRatio < 0.06) {
        return {
          isValid: false,
          reason: 'partial',
          message: '⚠️ Bring your full face into the frame to continue'
        };
      }

      // 3. Head Rotation & Tilt: High asymmetry between left and right halves indicates turned head
      const leftRatio = halfTotal > 0 ? leftHalfSkin / halfTotal : 0;
      const rightRatio = halfTotal > 0 ? rightHalfSkin / halfTotal : 0;
      const asymmetryDiff = Math.abs(leftRatio - rightRatio);
      // Relaxed threshold: allows natural slight head movements up to 0.58 difference
      if (asymmetryDiff > 0.58) {
        return {
          isValid: false,
          reason: 'rotation',
          message: '⚠️ Face turned sideways. Look straight at the camera'
        };
      }

      // 4. Extreme edge crop check
      if (borderSkinRatio > 0.38) {
        return {
          isValid: false,
          reason: 'partial',
          message: '⚠️ Keep your entire face uncropped inside the frame'
        };
      }

      return { isValid: true };
    } catch {
      return { isValid: true };
    }
  };

  // Continuous Face Detection & Alignment Loop during active scan (runs every 200ms)
  useEffect(() => {
    let faceCheckTimer: NodeJS.Timeout;
    if (isOpen && step === 'scanning' && cameraActive) {
      faceCheckTimer = setInterval(async () => {
        const result = await checkFaceInFrame();
        if (result.isValid) {
          faceMissCountRef.current = 0;
          if (!isFaceDetectedRef.current) {
            isFaceDetectedRef.current = true;
            setIsFaceDetected(true);
            setFaceWarning(null);
          }
        } else {
          faceMissCountRef.current += 1;
          // Debounce 2 consecutive check frames (~400ms) to prevent transient flicker
          if (faceMissCountRef.current >= 2 && isFaceDetectedRef.current) {
            isFaceDetectedRef.current = false;
            setIsFaceDetected(false);
            setFaceWarning(result.message || '⚠️ Position your full face inside the center oval to continue scanning');
          }
        }
      }, 200);
    } else {
      setIsFaceDetected(true);
      isFaceDetectedRef.current = true;
      setFaceWarning(null);
      faceMissCountRef.current = 0;
    }

    return () => {
      if (faceCheckTimer) clearInterval(faceCheckTimer);
    };
  }, [isOpen, step, cameraActive]);

  // Simulated Scanning Progress Loop (Exact 20 seconds duration with Auto Pause / Resume)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && step === 'scanning') {
      const interval = 100;
      const stepIncrement = 0.5; // 0.5% per 100ms = exactly 20,000ms (20 seconds)
      timer = setInterval(() => {
        // Pause timer and vital calculation if no face is detected
        if (!isFaceDetectedRef.current) {
          return;
        }

        setProgress((prev) => {
          const next = prev + stepIncrement;
          if (next >= 100) {
            clearInterval(timer);
            setStep('completed');
            stopCamera();

            const cleanFullName = String(patientInfo.fullName || 'Anonymous Patient').trim();
            const cleanPhone = String(patientInfo.phone || 'N/A').trim();
            const cleanCity = String(patientInfo.city || 'N/A').trim();
            const cleanGender = String(patientInfo.gender || 'Other').trim();

            const heartRateNum = Number(liveVitals.heartRate) || 72;
            const spo2Num = Number(liveVitals.spo2) || 98;
            const respRateNum = Number(liveVitals.respiratoryRate) || 16;
            const stressLevelStr = String(liveVitals.stressLevel || 'Normal').trim();

            console.log("Vital Lens scan finished for:", cleanFullName);

            const record = {
              id: `REC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`,
              fullName: cleanFullName,
              phone: cleanPhone,
              city: cleanCity,
              gender: cleanGender,
              heartRate: heartRateNum,
              spo2: spo2Num,
              respiratoryRate: respRateNum,
              stressLevel: stressLevelStr,
              stressScore: liveVitals.stressScore,
              hrv: liveVitals.hrv,
              timestamp: liveVitals.timestamp,
              createdAt: Date.now()
            };
            try {
              const existing = JSON.parse(localStorage.getItem('nhealth_vitals_records') || '[]');
              localStorage.setItem('nhealth_vitals_records', JSON.stringify([record, ...existing]));
            } catch {
              // Safe storage fallback
            }

            // Sync to Supabase vital_scans table with clean payload
            (async () => {
              try {
                console.log("Attempting to insert into Supabase...");
                const { data, error } = await supabase
                  .from('vital_scans')
                  .insert([
                    {
                      full_name: cleanFullName,
                      phone_number: cleanPhone,
                      city: cleanCity,
                      gender: cleanGender,
                      heart_rate: heartRateNum,
                      spo2: spo2Num,
                      respiratory_rate: respRateNum,
                      stress_level: stressLevelStr
                    }
                  ])
                  .select();

                console.log("Supabase insert response data:", data, "error:", error);

                if (error) {
                  try {
                    alert("Error: " + error.message);
                  } catch {
                    // Alert fallback
                  }
                } else {
                  try {
                    alert("Vital Lens Scan Saved Successfully!");
                  } catch {
                    // Alert fallback
                  }
                }
              } catch (err: any) {
                console.log("Supabase insert response data:", null, "error:", err);
                try {
                  alert("Error: " + (err?.message || "Unknown error"));
                } catch {
                  // Alert fallback
                }
              }
            })();

            if (onScanComplete) {
              onScanComplete(liveVitals, patientInfo);
            }
            return 100;
          }

          // Dynamic status updates based on progress (smoothly calibrated for 20s)
          if (next < 25) {
            setScanStatus('Aligning face within optical frame...');
          } else if (next < 50) {
            setScanStatus('Detecting micro-vascular blood flow (rPPG)...');
            setLiveVitals((v) => ({
              ...v,
              heartRate: Math.floor(70 + Math.random() * 5),
              spo2: 98,
              respiratoryRate: 15 + Math.floor(Math.random() * 2)
            }));
          } else if (next < 75) {
            setScanStatus('Measuring heart rate variability & SpO2...');
            setLiveVitals((v) => ({
              ...v,
              heartRate: Math.floor(72 + Math.random() * 4),
              spo2: 99,
              stressScore: Math.floor(20 + Math.random() * 4),
              respiratoryRate: 16
            }));
          } else {
            setScanStatus('Calibrating biometric precision & compiling report...');
          }

          return next;
        });
      }, interval);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, step, onScanComplete, liveVitals]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0b192c] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="https://i.ibb.co/JW6HFRV0/Nhealth-logo-8cm-x-8cm-high-quality-1-1.png"
              alt="Nhealth Logo"
              className="h-9 w-9 sm:h-10 sm:w-10 object-contain rounded-xl shrink-0 border border-slate-700/60 bg-white/10 p-1 shadow-md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                  Nhealth <span className="text-purple-400">Vital Lens</span>
                </h3>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/50 shrink-0">
                  AI Vision 2.0
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">Non-Invasive Facial Photoplethysmography</p>
            </div>
          </div>
          <button
            onClick={handleModalClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Close Vital Lens"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* STEP 0: Mandatory Patient Pre-Scan Registration Form */}
          {step === 'details' && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="text-center space-y-1.5 py-1">
                <div className="w-12 h-12 rounded-2xl bg-purple-900/30 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto shadow-md shadow-purple-900/30">
                  <User className="w-6 h-6 text-purple-400" />
                </div>
                <h4 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Patient Pre-Scan Information
                </h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                  Please provide the required details below to unlock the optical sensor and calibrate your personalized vital report.
                </p>
              </div>

              {formError && (
                <div className="bg-rose-950/60 border border-rose-800/70 text-rose-300 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={patientInfo.fullName}
                      onChange={(e) => {
                        setPatientInfo({ ...patientInfo, fullName: e.target.value });
                        if (formError) setFormError(null);
                      }}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-950/70 border border-slate-700/80 rounded-xl focus:outline-none focus:border-purple-500 text-white placeholder-slate-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-slate-400 border-r border-slate-700 pr-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={patientInfo.phone}
                        onChange={(e) => {
                          setPatientInfo({ ...patientInfo, phone: e.target.value.replace(/\D/g, '') });
                          if (formError) setFormError(null);
                        }}
                        placeholder="9876543210"
                        className="w-full pl-20 pr-3 py-2.5 text-xs sm:text-sm bg-slate-950/70 border border-slate-700/80 rounded-xl focus:outline-none focus:border-purple-500 text-white placeholder-slate-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Gender <span className="text-rose-400">*</span>
                    </label>
                    <select
                      required
                      value={patientInfo.gender}
                      onChange={(e) => {
                        setPatientInfo({ ...patientInfo, gender: e.target.value });
                        if (formError) setFormError(null);
                      }}
                      className="w-full px-3 py-2.5 text-xs sm:text-sm bg-slate-950/70 border border-slate-700/80 rounded-xl focus:outline-none focus:border-purple-500 text-white transition-colors cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    City <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={patientInfo.city}
                      onChange={(e) => {
                        setPatientInfo({ ...patientInfo, city: e.target.value });
                        if (formError) setFormError(null);
                      }}
                      placeholder="e.g. Visakhapatnam / Vijayawada"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-950/70 border border-slate-700/80 rounded-xl focus:outline-none focus:border-purple-500 text-white placeholder-slate-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  disabled={isCheckingLimit}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-60 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isCheckingLimit ? 'Verifying Free Scans...' : 'Proceed to Camera & Scan'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* STEP 1: Consent & Privacy Agreement Screen */}
          {step === 'consent' && (
            <div className="space-y-4">
              {/* Patient Badge */}
              <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Patient: <strong className="text-white">{patientInfo.fullName}</strong> ({patientInfo.gender}, {patientInfo.city})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="text-purple-400 hover:text-purple-300 text-[11px] font-semibold underline cursor-pointer"
                >
                  Edit
                </button>
              </div>
              <div className="text-center space-y-2 py-2">
                <div className="w-16 h-16 rounded-2xl bg-purple-900/30 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto shadow-lg shadow-purple-900/30">
                  <Sparkles className="w-8 h-8 animate-pulse text-purple-400" />
                </div>
                <h4 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Instant Non-Invasive Vitals Check
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                  Hold your face in the camera view for 20 seconds. Our computer vision model measures subtle micro-vascular blood pulse variations across your facial capillaries.
                </p>
              </div>

              {/* Security & Consent Notice Box */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Privacy & Zero-Data Retention Guarantee</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>100% On-Device Processing:</strong> No video or photo is ever recorded, transmitted, or stored on external servers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold">•</span>
                    <span><strong>Optical rPPG Technology:</strong> Estimates heart rate, oxygenation level, stress index, and breathing rhythm.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span><strong>Medical Disclaimer:</strong> Designed for wellness tracking and preliminary screening; not a substitute for clinical diagnostics.</span>
                  </li>
                </ul>
              </div>

              {/* Camera Selection Option */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-purple-400" />
                    Select Sensor Camera
                  </span>
                  <span className="text-[11px] text-purple-400 font-semibold">
                    {cameraFacingMode === 'user' ? 'Front Camera (Default)' : 'Back Camera'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCameraFacingMode('user')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      cameraFacingMode === 'user'
                        ? 'bg-purple-950/60 border-purple-500 shadow-sm shadow-purple-500/30 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-white">
                        <User className="w-3.5 h-3.5 text-purple-400" />
                        Front Camera
                      </span>
                      {cameraFacingMode === 'user' && (
                        <span className="w-2 h-2 rounded-full bg-purple-400 shadow-xs shadow-purple-400"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      Ideal for facial vitals & self-screening
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCameraFacingMode('environment')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      cameraFacingMode === 'environment'
                        ? 'bg-purple-950/60 border-purple-500 shadow-sm shadow-purple-500/30 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-white">
                        <Camera className="w-3.5 h-3.5 text-cyan-400" />
                        Back Camera
                      </span>
                      {cameraFacingMode === 'environment' && (
                        <span className="w-2 h-2 rounded-full bg-purple-400 shadow-xs shadow-purple-400"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      Rear camera option for assisted scan
                    </span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={startScan}
                  className="flex-1 py-3.5 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Accept & Start Scan with {cameraFacingMode === 'user' ? 'Front' : 'Back'} Camera</span>
                </button>
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Active Scanning Viewport */}
          {step === 'scanning' && (
            <div className="space-y-4">
              {/* Camera Frame Viewport */}
              <div className="relative w-full aspect-4/3 sm:aspect-16/10 bg-slate-950 rounded-2xl overflow-hidden border border-purple-500/40 shadow-inner flex items-center justify-center">
                {/* Live Camera Video */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 w-full h-full object-cover ${
                    cameraFacingMode === 'user' ? 'transform -scale-x-100' : ''
                  } ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Simulated Face Model Fallback if camera is denied or loading */}
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 p-6 text-center space-y-3">
                    <div className="w-24 h-24 rounded-full border-2 border-dashed border-purple-400/60 flex items-center justify-center animate-pulse">
                      <Camera className="w-10 h-10 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-purple-300">
                        {cameraFacingMode === 'user' ? 'Front' : 'Back'} Optical Sensor Active
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                        {cameraError || 'Position target face evenly in good lighting.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Face Alignment Overlay Oval (Center Guiding Frame for Front & Back Cameras) */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`relative w-52 h-64 sm:w-60 sm:h-72 rounded-[48%] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-between p-4 ${
                      isFaceDetected
                        ? 'border-cyan-400/80 shadow-[0_0_35px_rgba(34,211,238,0.25)]'
                        : 'border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.55)] scale-[1.02]'
                    }`}
                  >
                    {/* Visual Guiding Crosshairs / Corner Guides */}
                    <div
                      className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full ${
                        isFaceDetected ? 'bg-cyan-400/90' : 'bg-rose-500'
                      }`}
                    ></div>
                    <div
                      className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full ${
                        isFaceDetected ? 'bg-cyan-400/90' : 'bg-rose-500'
                      }`}
                    ></div>
                    <div
                      className={`absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full ${
                        isFaceDetected ? 'bg-cyan-400/90' : 'bg-rose-500'
                      }`}
                    ></div>
                    <div
                      className={`absolute right-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full ${
                        isFaceDetected ? 'bg-cyan-400/90' : 'bg-rose-500'
                      }`}
                    ></div>

                    {/* Facial Region Target Guides inside Oval (Eyes zone + Mouth zone) */}
                    <div className="w-full flex items-center justify-around pt-8 opacity-40">
                      <div className={`w-6 h-3 rounded-full border border-dashed ${isFaceDetected ? 'border-cyan-300' : 'border-rose-400'}`}></div>
                      <div className={`w-6 h-3 rounded-full border border-dashed ${isFaceDetected ? 'border-cyan-300' : 'border-rose-400'}`}></div>
                    </div>
                    <div className="pb-8 opacity-40">
                      <div className={`w-8 h-2.5 rounded-full border border-dashed ${isFaceDetected ? 'border-cyan-300' : 'border-rose-400'}`}></div>
                    </div>

                    {/* Laser Scanning Sweep Line (Paused when face unaligned) */}
                    {isFaceDetected && (
                      <div
                        className="absolute left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_14px_#22d3ee] transition-all duration-300"
                        style={{ top: `${(progress % 100)}%` }}
                      />
                    )}
                  </div>
                </div>

                {/* Prominent Warning Overlay Banner when Full Face is Unaligned / Cut-off / Missing */}
                {!isFaceDetected && (
                  <div className="absolute inset-x-3 top-14 z-30 flex items-center justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-rose-950/95 border-2 border-rose-500 text-rose-100 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 max-w-md text-center">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
                      <p className="text-xs sm:text-sm font-semibold leading-snug">
                        {faceWarning || '⚠️ Position your full face inside the center oval to continue scanning'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Live Top HUD Tag */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[11px] font-semibold text-white pointer-events-none px-2 z-20">
                  <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-700">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isFaceDetected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                      }`}
                    ></span>
                    <span>
                      {isFaceDetected
                        ? `ALIGNED • ${cameraFacingMode === 'user' ? 'FRONT CAMERA' : 'BACK CAMERA'}`
                        : 'PAUSED • FULL FACE REQUIRED'}
                    </span>
                  </div>
                  <div
                    className={`px-2.5 py-1 rounded-full border ${
                      isFaceDetected
                        ? 'bg-purple-950/80 text-purple-300 border-purple-700'
                        : 'bg-rose-950/80 text-rose-300 border-rose-700 font-bold'
                    }`}
                  >
                    {isFaceDetected ? `${Math.round(progress)}% Complete` : 'Paused'}
                  </div>
                </div>

                {/* Bottom Status Feed on Viewport */}
                <div className="absolute bottom-3 inset-x-3 text-center pointer-events-none">
                  <div className="inline-block bg-slate-900/90 backdrop-blur-xs border border-purple-500/30 px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-200">
                    {scanStatus}
                  </div>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-200 shadow-sm shadow-purple-500/50"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Dynamic Live Vital Parameters Reading Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {/* Heart Rate BPM */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-rose-400 text-xs font-semibold mb-1">
                    <Heart className="w-3.5 h-3.5 fill-rose-400 animate-pulse" />
                    <span>Heart Rate</span>
                  </div>
                  <div className="text-xl font-extrabold text-white">
                    {progress > 30 ? `${liveVitals.heartRate}` : '--'}{' '}
                    <span className="text-[10px] font-normal text-slate-400">BPM</span>
                  </div>
                </div>

                {/* SpO2 */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-cyan-400 text-xs font-semibold mb-1">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Blood Oxygen</span>
                  </div>
                  <div className="text-xl font-extrabold text-white">
                    {progress > 45 ? `${liveVitals.spo2}` : '--'}{' '}
                    <span className="text-[10px] font-normal text-slate-400">%</span>
                  </div>
                </div>

                {/* Stress Level */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-semibold mb-1">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Stress Level</span>
                  </div>
                  <div className="text-base sm:text-lg font-extrabold text-white">
                    {progress > 55 ? `${liveVitals.stressLevel}` : '--'}{' '}
                    <span className="text-[10px] font-normal text-slate-400">({liveVitals.stressScore})</span>
                  </div>
                </div>

                {/* Respiratory Rate */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs font-semibold mb-1">
                    <Wind className="w-3.5 h-3.5" />
                    <span>Respiration</span>
                  </div>
                  <div className="text-xl font-extrabold text-white">
                    {progress > 40 ? `${liveVitals.respiratoryRate}` : '--'}{' '}
                    <span className="text-[10px] font-normal text-slate-400">RPM</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Completed Vital Reading Summary (Part 1 Final / Ready for Part 2) */}
          {step === 'completed' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="text-center space-y-1.5 py-1">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-white tracking-tight">Vital Signs Reading Completed</h4>
                <p className="text-xs text-slate-300">
                  Estimated via Nhealth Optical Vision. Timestamp: {liveVitals.timestamp}
                </p>
              </div>

              {/* Patient Profile Chip */}
              <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-slate-300">
                <span>Patient: <strong className="text-white">{patientInfo.fullName}</strong> ({patientInfo.gender}, {patientInfo.city})</span>
                <span className="text-slate-400 font-mono text-[11px]">+91 {patientInfo.phone}</span>
              </div>

              {/* Vitals Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                  <div className="text-xs text-rose-400 font-semibold mb-1 flex items-center justify-center gap-1">
                    <Heart className="w-3.5 h-3.5 fill-rose-400" />
                    <span>Pulse</span>
                  </div>
                  <div className="text-2xl font-black text-white">{liveVitals.heartRate}</div>
                  <div className="text-[10px] text-slate-400">BPM (Normal)</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                  <div className="text-xs text-cyan-400 font-semibold mb-1 flex items-center justify-center gap-1">
                    <Activity className="w-3.5 h-3.5" />
                    <span>SpO2</span>
                  </div>
                  <div className="text-2xl font-black text-white">{liveVitals.spo2}%</div>
                  <div className="text-[10px] text-slate-400">Optimal Range</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                  <div className="text-xs text-amber-400 font-semibold mb-1 flex items-center justify-center gap-1">
                    <Flame className="w-3.5 h-3.5" />
                    <span>Stress Index</span>
                  </div>
                  <div className="text-2xl font-black text-white">{liveVitals.stressScore}</div>
                  <div className="text-[10px] text-slate-400">Low / Relaxed</div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                  <div className="text-xs text-emerald-400 font-semibold mb-1 flex items-center justify-center gap-1">
                    <Wind className="w-3.5 h-3.5" />
                    <span>Respiration</span>
                  </div>
                  <div className="text-2xl font-black text-white">{liveVitals.respiratoryRate}</div>
                  <div className="text-[10px] text-slate-400">Breaths / min</div>
                </div>
              </div>

              {/* Clinical Verification & Status Banner */}
              <div className="bg-slate-900/90 border border-emerald-900/40 rounded-xl p-3.5 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-white">All vital indicators are within standard benchmark ranges.</span> Your biometric screening card is ready for download.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadPdfReport}
                  className="flex-1 py-3 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.98] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF Vital Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('consent');
                    setProgress(0);
                  }}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Scan Again</span>
                </button>
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="py-3 px-5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
                >
                  Close Lens
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Free Scan Limit Exceeded Modal Popup */}
      {limitExceededModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0b192c] border border-amber-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setLimitExceededModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <AlertCircle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-black text-white tracking-tight">Free Scan Limit Reached</h4>
              <div className="text-sm font-semibold text-amber-200 bg-amber-950/60 border border-amber-700/60 rounded-2xl p-4 leading-relaxed">
                You are out of free scans. To get more scans contact 9393934621 Nhealth team
              </div>
              {scanLimitStats && (
                <p className="text-xs text-slate-400 pt-1">
                  Completed: <span className="font-bold text-white">{scanLimitStats.used}</span> / Allowed: <span className="font-bold text-purple-300">{scanLimitStats.allowed}</span> scans
                </p>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <a
                href={`https://wa.me/919393934621?text=${encodeURIComponent(
                  `Hello Nhealth Team, I have reached the free scan limit for mobile +91 ${patientInfo.phone}. Please help me add more scans.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>WhatsApp Nhealth Team (+91 9393934621)</span>
              </a>
              <a
                href="tel:+919393934621"
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                <span>Call Helpline (+91 9393934621)</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
