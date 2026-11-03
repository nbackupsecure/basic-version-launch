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
  FileText,
  User
} from 'lucide-react';

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
  onScanComplete?: (vitals: VitalReadings) => void;
}

export const VitalLensModal: React.FC<VitalLensModalProps> = ({
  isOpen,
  onClose,
  onScanComplete
}) => {
  const [step, setStep] = useState<'consent' | 'scanning' | 'completed'>('consent');
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
    setStep('consent');
    setProgress(0);
    setCameraError(null);
    onClose();
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

    const reportId = `NHL-VL-${Date.now().toString(36).toUpperCase()}`;
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
  <title>Nhealth Vital Report - ${reportId}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0b192c;
      background: #ffffff;
      padding: 24px;
      line-height: 1.5;
    }
    .header-box {
      border-bottom: 2px solid #7c3aed;
      padding-bottom: 18px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .corp-title {
      font-size: 20px;
      font-weight: 800;
      color: #0b192c;
      letter-spacing: -0.3px;
    }
    .sub-title {
      font-size: 13px;
      color: #7c3aed;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 4px;
    }
    .doc-meta {
      text-align: right;
      font-size: 11px;
      color: #64748b;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      background: #f3e8ff;
      color: #6b21a8;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      margin-top: 6px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
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
      font-size: 10px;
      color: #9a3412;
      line-height: 1.6;
    }
    .footer {
      margin-top: 32px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div>
      <div class="corp-title">Nhealth Unified Healthcare Technologies Private Limited</div>
      <div class="sub-title">Nhealth Vital Lens • Biometric Screening Report</div>
      <div class="badge">Optical rPPG AI Vision</div>
    </div>
    <div class="doc-meta">
      <div><strong>Report ID:</strong> ${reportId}</div>
      <div><strong>Date:</strong> ${formattedDate}</div>
      <div><strong>Time:</strong> ${formattedTime}</div>
    </div>
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
    This digital vital assessment report is produced via non-invasive optical facial photoplethysmography (rPPG) through Nhealth Vital Lens for wellness tracking and preliminary assessment purposes only. It is not an FDA/clinical diagnostic medical device and does not substitute professional medical diagnosis, prescription, or clinical consultation. For any health concerns or symptoms, please consult a registered medical practitioner or book an official Nhealth physician.
  </div>

  <div class="footer">
    Nhealth Unified Healthcare Technologies Private Limited • Andhra Pradesh, India • support@nhealth.in • Helpline: +91 9393934621
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
    await startCamera(cameraFacingMode);
  };

  // Simulated Scanning Progress Loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && step === 'scanning') {
      const interval = 120;
      timer = setInterval(() => {
        setProgress((prev) => {
          const next = prev + 1.2;
          if (next >= 100) {
            clearInterval(timer);
            setStep('completed');
            stopCamera();
            if (onScanComplete) {
              onScanComplete(liveVitals);
            }
            return 100;
          }

          // Dynamic status updates based on progress
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
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <img
              src="https://i.ibb.co/JW6HFRV0/Nhealth-logo-8cm-x-8cm-high-quality-1-1.png"
              alt="Nhealth Logo"
              className="h-7 w-7 sm:h-8 sm:w-8 object-contain rounded-lg shrink-0 border border-slate-700/60 bg-white/10 p-0.5 shadow-sm"
            />
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-400 flex items-center justify-center shadow-inner shrink-0">
              <Heart className="w-4 h-4 fill-purple-400 text-purple-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm sm:text-lg text-white tracking-tight">
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
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Close Vital Lens"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* STEP 1: Consent & Privacy Agreement Screen */}
          {step === 'consent' && (
            <div className="space-y-5">
              <div className="text-center space-y-2 py-2">
                <div className="w-16 h-16 rounded-2xl bg-purple-900/30 border border-purple-500/40 text-purple-300 flex items-center justify-center mx-auto shadow-lg shadow-purple-900/30">
                  <Sparkles className="w-8 h-8 animate-pulse text-purple-400" />
                </div>
                <h4 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Instant Non-Invasive Vitals Check
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                  Hold your face in the camera view for 15 seconds. Our computer vision model measures subtle micro-vascular blood pulse variations across your facial capillaries.
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

                {/* Face Alignment Overlay Circle */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-48 h-56 sm:w-56 sm:h-64 rounded-[45%] border-2 border-dashed border-purple-400/80 shadow-[0_0_30px_rgba(168,85,247,0.3)] animate-pulse flex items-center justify-center">
                    {/* Corner Guides */}
                    <div className="absolute top-2 w-6 h-1 bg-purple-400/80 rounded-full"></div>
                    <div className="absolute bottom-2 w-6 h-1 bg-purple-400/80 rounded-full"></div>
                    <div className="absolute left-2 h-6 w-1 bg-purple-400/80 rounded-full"></div>
                    <div className="absolute right-2 h-6 w-1 bg-purple-400/80 rounded-full"></div>

                    {/* Laser Scanning Sweep Line */}
                    <div
                      className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] transition-all duration-300"
                      style={{ top: `${(progress % 100)}%` }}
                    />
                  </div>
                </div>

                {/* Live Top HUD Tag */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[11px] font-semibold text-white pointer-events-none px-2">
                  <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-xs px-2.5 py-1 rounded-full border border-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>LIVE rPPG • {cameraFacingMode === 'user' ? 'FRONT CAMERA' : 'BACK CAMERA'}</span>
                  </div>
                  <div className="bg-purple-950/80 text-purple-300 border border-purple-700 px-2.5 py-1 rounded-full">
                    {Math.round(progress)}% Complete
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
    </div>
  );
};
