import { Play, Clock, AlertCircle } from "lucide-react";

interface ExamIntroProps {
  onStart: () => void;
  timeLimitMinutes: number;
}

export function ExamIntro({ onStart, timeLimitMinutes }: ExamIntroProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
          <Clock size={32} />
        </div>
        <h2 className="text-3xl font-bold">เตรียมตัวเริ่มทำข้อสอบ</h2>
        <p className="text-stone-500">กรุณาตรวจสอบความพร้อมก่อนเริ่มการทดสอบ</p>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-3xl border border-stone-200 shadow-sm space-y-8">
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
            <Clock className="text-blue-600 mt-1 shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-blue-900 text-lg">เวลาในการทำข้อสอบ</h4>
              <p className="text-blue-800">คุณมีเวลาทั้งหมด <span className="font-bold text-xl">{timeLimitMinutes}</span> นาที ในการทำข้อสอบชุดนี้</p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <AlertCircle className="text-amber-600 mt-1 shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-amber-900 text-lg">การส่งคำตอบอัตโนมัติ</h4>
              <p className="text-amber-800">หากหมดเวลา ระบบจะทำการส่งคำตอบที่เลือกไว้ทั้งหมดให้โดยอัตโนมัติทันที</p>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={onStart}
            className="w-full flex items-center justify-center gap-3 py-5 bg-stone-900 text-white rounded-2xl font-bold text-xl hover:bg-stone-800 transition-all shadow-lg shadow-stone-200 active:scale-95 group"
          >
            <Play size={24} className="group-hover:translate-x-1 transition-transform" /> 
            เริ่มทำข้อสอบ
          </button>
        </div>

        <p className="text-center text-stone-400 text-sm">
          เมื่อกดปุ่ม "เริ่มทำข้อสอบ" เวลาจะเริ่มนับถอยหลังทันที
        </p>
      </div>
    </div>
  );
}
