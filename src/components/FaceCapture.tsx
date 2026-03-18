import { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { Camera, RefreshCw, Check, AlertCircle } from "lucide-react";

interface FaceCaptureProps {
  onCapture: (image: string) => void;
}

export function FaceCapture({ onCapture }: FaceCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImgSrc(imageSrc);
    }
  }, [webcamRef]);

  const retake = () => {
    setImgSrc(null);
  };

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error("Webcam error:", error);
    setError("ไม่สามารถเข้าถึงกล้องได้ กรุณาตรวจสอบการอนุญาตใช้งานกล้อง");
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">ยืนยันตัวตน</h2>
        <p className="text-stone-500">กรุณาถ่ายรูปหน้าตรงเพื่อยืนยันตัวตนก่อนเริ่มทำข้อสอบ</p>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6">
        <div className="relative aspect-[3/4] max-w-[320px] mx-auto bg-stone-100 rounded-2xl overflow-hidden border-2 border-stone-200">
          {!imgSrc ? (
            <>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ 
                  facingMode: "user",
                  width: { ideal: 720 },
                  height: { ideal: 960 }
                }}
                onUserMediaError={handleUserMediaError}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-4 border-dashed border-white/30 pointer-events-none m-12 rounded-[20%]"></div>
            </>
          ) : (
            <img src={imgSrc} alt="Captured" className="w-full h-full object-cover" />
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-900/80 p-8 text-center">
              <div className="space-y-4 text-white">
                <AlertCircle className="mx-auto text-red-400" size={48} />
                <p className="font-medium">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="px-6 py-2 bg-white text-stone-900 rounded-full font-bold text-sm"
                >
                  ลองใหม่อีกครั้ง
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          {!imgSrc ? (
            <button
              onClick={capture}
              disabled={!!error}
              className="flex-1 py-4 bg-stone-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Camera size={20} /> ถ่ายรูปยืนยันตัวตน
            </button>
          ) : (
            <>
              <button
                onClick={retake}
                className="flex-1 py-4 bg-stone-100 text-stone-600 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-200 transition-all"
              >
                <RefreshCw size={20} /> ถ่ายใหม่
              </button>
              <button
                onClick={() => onCapture(imgSrc)}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-md active:scale-95"
              >
                <Check size={20} /> ยืนยันและเริ่มสอบ
              </button>
            </>
          )}
        </div>

        <div className="text-xs text-stone-400 text-center flex items-center justify-center gap-2">
          <ShieldCheck size={14} className="text-emerald-500" /> ข้อมูลรูปถ่ายจะถูกเก็บรักษาเป็นความลับเพื่อใช้ในการยืนยันตัวตนเท่านั้น
        </div>
      </div>
    </div>
  );
}

function ShieldCheck({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
