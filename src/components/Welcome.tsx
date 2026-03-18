import { BookOpen, CheckCircle, Clock, Shield, ShieldAlert, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { SystemStatus } from "../types";
import { cn } from "../lib/utils";

interface WelcomeProps {
  onStart: () => void;
  onSecretEntry: () => void;
  status: SystemStatus;
  version?: string | null;
  theme?: "light" | "dark";
}

export function Welcome({ onStart, onSecretEntry, status, version, theme = "light" }: WelcomeProps) {
  const [clickCount, setClickCount] = useState(0);
  const isDark = theme === "dark";

  const handleTitleClick = () => {
    const newCount = clickCount + 1;
    if (newCount >= 5) {
      onSecretEntry();
      setClickCount(0);
    } else {
      setClickCount(newCount);
      setTimeout(() => setClickCount(0), 2000);
    }
  };

  const isClosed = status.registrationStatus === 'CLOSED';

  return (
    <div className={cn("text-center space-y-12", isDark ? "text-stone-100" : "text-stone-900")}>
      {version && (
        <div className={cn(
          "fixed bottom-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
          isDark ? "bg-stone-800 text-stone-400" : "bg-stone-200 text-stone-500"
        )}>
          เวอร์ชันแอป: {version}
        </div>
      )}
      <div className="space-y-4">
        <h1 
          onClick={handleTitleClick}
          className={cn(
            "text-5xl font-bold tracking-tight md:text-6xl cursor-default select-none",
            isDark ? "text-white" : "text-stone-900"
          )}
        >
          การทดสอบความรู้ <span className="text-emerald-600 italic">ทั่วประเทศ</span>
        </h1>
        <p className={cn(
          "text-xl max-w-2xl mx-auto",
          isDark ? "text-stone-400" : "text-stone-500"
        )}>
          ยินดีต้อนรับเข้าสู่ระบบทดสอบมาตรฐานความรู้พนักงานประจำปี
          กรุณาอ่านคำแนะนำด้านล่างก่อนเริ่มทำข้อสอบ
        </p>
      </div>

      {status?.announcement && status.announcement !== '-' && (
        <div className={cn(
          "max-w-2xl mx-auto p-4 border rounded-2xl flex items-start gap-3 text-left",
          isDark ? "bg-blue-900/20 border-blue-800/50" : "bg-blue-50 border-blue-100"
        )}>
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className={isDark ? "text-blue-300 text-sm" : "text-blue-700 text-sm"}>{status.announcement}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-3xl mx-auto">
        {[
          { icon: Clock, title: "เวลาจำกัด 45 นาที", desc: "เมื่อเริ่มทำข้อสอบ ระบบจะเริ่มนับถอยหลังทันที และจะส่งคำตอบอัตโนมัติเมื่อหมดเวลา", color: "text-emerald-600", bg: "bg-emerald-100", darkBg: "bg-emerald-900/20" },
          { icon: Shield, title: "ยืนยันตัวตนด้วยใบหน้า", desc: "ต้องเปิดกล้องเพื่อถ่ายรูปยืนยันตัวตนก่อนเริ่มทำข้อสอบ เพื่อความโปร่งใสในการทดสอบ", color: "text-blue-600", bg: "bg-blue-100", darkBg: "bg-blue-900/20" },
          { icon: Shield, title: "ยืนยัน PDPA", desc: "ต้องกดยินยอมนโยบายคุ้มครองข้อมูลส่วนบุคคล เพื่อความโปร่งใสและเป็นไปตามกฎหมาย", color: "text-purple-600", bg: "bg-purple-100", darkBg: "bg-purple-900/20" },
          { icon: CheckCircle, title: "ประกาศผลสอบ", desc: "สามารถดูผลสอบเบื้องต้นได้ทันที และจะมีการส่งผลสอบอย่างเป็นทางการในวันที่ 27 มีนาคม", color: "text-orange-600", bg: "bg-orange-100", darkBg: "bg-orange-900/20" },
        ].map((item, i) => (
          <div key={i} className={cn(
            "p-6 rounded-2xl border shadow-sm space-y-3",
            isDark ? "bg-stone-900/50 border-stone-800" : "bg-white border-stone-200"
          )}>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isDark ? item.darkBg : item.bg, item.color)}>
              <item.icon size={20} />
            </div>
            <h3 className={cn("font-bold text-lg", isDark ? "text-white" : "text-stone-900")}>{item.title}</h3>
            <p className={isDark ? "text-stone-400" : "text-stone-500"}>{item.desc}</p>
          </div>
        ))}
      </div>

      {isClosed ? (
        <div className={cn(
          "max-w-md mx-auto p-6 border rounded-3xl",
          isDark ? "bg-rose-900/20 border-rose-800" : "bg-rose-50 border-rose-100"
        )}>
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className={cn("font-bold mb-1", isDark ? "text-rose-300" : "text-rose-900")}>ปิดรับลงทะเบียนชั่วคราว</h3>
          <p className={isDark ? "text-rose-400 text-sm" : "text-rose-600 text-sm"}>กรุณารอวิทยากรเปิดระบบเพื่อเริ่มการทดสอบรอบถัดไป</p>
        </div>
      ) : (
        <button
          onClick={onStart}
          className={cn(
            "px-12 py-4 rounded-full font-bold text-xl transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50",
            isDark ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-stone-900 text-white hover:bg-stone-800"
          )}
        >
          เริ่มลงทะเบียนเข้าสอบ
        </button>
      )}
    </div>
  );
}
