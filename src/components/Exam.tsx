import { useState, useEffect, useCallback } from "react";
import { Clock, ChevronRight, ChevronLeft, Send, AlertCircle, CheckCircle2, XCircle, Layers } from "lucide-react";
import { Question, QuestionResult } from "../types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ExamProps {
  questions: Question[];
  onComplete: (score: number, total: number, results: QuestionResult[], tabSwitches: number, timeSpent: string) => void;
  employeeName: string;
  fontSize: "normal" | "large" | "extra";
  onFontSizeChange: (size: "normal" | "large" | "extra") => void;
}

// Helper to handle Google Drive links and IDs
const getImageUrl = (input: string) => {
  if (!input) return "";
  const trimmed = input.trim();
  let id = trimmed;
  
  if (trimmed.startsWith('http')) {
    const idMatch = trimmed.match(/\/d\/([^/]+)/) || trimmed.match(/id=([^&]+)/);
    if (idMatch) id = idMatch[1];
    else return trimmed; // Return as is if not a drive link
  }
  
  // Use the most reliable direct link format for Google Drive
  return `https://lh3.googleusercontent.com/d/${id}`;
};

export function Exam({ questions, onComplete, employeeName, fontSize, onFontSizeChange }: ExamProps) {
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    const saved = localStorage.getItem("exam_answers");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return {};
      }
    }
    return {};
  });
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [startTime] = useState(Date.now());
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [delayTimer, setDelayTimer] = useState(0);

  // Initialize Questions and Timer
  useEffect(() => {
    // 1. Restore or Shuffle Questions
    const savedQuestions = localStorage.getItem("exam_questions");
    if (savedQuestions) {
      try {
        setShuffledQuestions(JSON.parse(savedQuestions));
      } catch (e) {
        const shuffled = [...questions].sort(() => Math.random() - 0.5);
        setShuffledQuestions(shuffled);
        localStorage.setItem("exam_questions", JSON.stringify(shuffled));
      }
    } else {
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      setShuffledQuestions(shuffled);
      localStorage.setItem("exam_questions", JSON.stringify(shuffled));
    }

    // 2. Absolute Timer Logic
    let startTimeStr = localStorage.getItem("exam_start_time");
    let startTime = startTimeStr ? Number(startTimeStr) : 0;
    
    if (!startTime) {
      startTime = Date.now();
      localStorage.setItem("exam_start_time", String(startTime));
    }

    const duration = 45 * 60 * 1000; // 45 minutes
    
    const updateTimer = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const remaining = Math.max(0, Math.floor((duration - elapsed) / 1000));
      
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        handleSubmit();
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [questions]);

  // Save answers whenever they change
  useEffect(() => {
    localStorage.setItem("exam_answers", JSON.stringify(answers));
  }, [answers]);

  // Tab switching detection (Spy Logic)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setTabSwitches(prev => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleSubmit = useCallback(() => {
    let score = 0;
    
    // Calculate time spent
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const timeSpent = `${minutes}:${seconds.toString().padStart(2, '0')} นาที`;

    const mapToKey = (val: string): string => {
      const v = String(val || "").trim().toUpperCase().replace(/[\.\)]/g, "");
      if (["A", "B", "C", "D"].includes(v)) return v;
      if (v === "1" || v === "ก") return "A";
      if (v === "2" || v === "ข") return "B";
      if (v === "3" || v === "ค") return "C";
      if (v === "4" || v === "ง") return "D";
      return v;
    };

    const detailedResults: QuestionResult[] = shuffledQuestions.map((q) => {
      const userAnswerKey = (answers[q.id] || answers[String(q.id)] || "").trim().toUpperCase();
      const correctAnswerRaw = String(q.answer || "").trim().toUpperCase();
      const correctAnswerKey = mapToKey(correctAnswerRaw);
      
      const isCorrect = userAnswerKey === correctAnswerKey && correctAnswerKey !== "";
      if (isCorrect) score++;

      return {
        questionId: q.id,
        topic: q.topic,
        questionText: q.text,
        selectedAnswer: userAnswerKey,
        selectedText: q.options[userAnswerKey as keyof typeof q.options] || "ไม่ได้ระบุ",
        correctAnswer: correctAnswerKey,
        correctText: q.options[correctAnswerKey as keyof typeof q.options] || correctAnswerRaw,
        isCorrect,
        explanation: q.explanation || "ไม่มีคำอธิบาย",
        explanationImage: q.explanationImage,
        questionImage: q.image
      };
    });
    
    onComplete(score, shuffledQuestions.length, detailedResults, tabSwitches, timeSpent);
  }, [shuffledQuestions, answers, onComplete, tabSwitches, startTime]);

  useEffect(() => {
    if (delayTimer > 0) {
      const timer = setTimeout(() => setDelayTimer(delayTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [delayTimer]);

  useEffect(() => {
    if (shuffledQuestions.length > 0) {
      // Check elapsed time from start
      const startTimeStr = localStorage.getItem("exam_start_time");
      const startTime = startTimeStr ? Number(startTimeStr) : Date.now();
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const twentyMinutesInSeconds = 20 * 60;

      if (elapsedSeconds < twentyMinutesInSeconds) {
        setDelayTimer(5);
      } else {
        setDelayTimer(0);
      }
    }
  }, [currentIndex, shuffledQuestions.length]);

  const handleTestMode = () => {
    const testAnswers: Record<number, string> = {};
    shuffledQuestions.forEach(q => {
      const keys = ["A", "B", "C", "D"];
      testAnswers[q.id] = keys[Math.floor(Math.random() * keys.length)];
    });
    setAnswers(testAnswers);
    setTimeout(() => {
      setShowConfirmSubmit(true);
    }, 500);
  };

  const handleNext = () => {
    const currentQ = shuffledQuestions[currentIndex];
    if (!answers[currentQ.id]) {
      alert("กรุณาเลือกคำตอบก่อนไปข้อถัดไป");
      return;
    }
    if (currentIndex < shuffledQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleTrySubmit = () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < shuffledQuestions.length) {
      setShowStatusPopup(true);
      return;
    }
    setShowConfirmSubmit(true);
  };

  useEffect(() => {
    // Timer is handled in the main initialization useEffect above
  }, [handleSubmit]);

  const getFontSizeClasses = () => {
    switch (fontSize) {
      case "large":
        return {
          question: "text-4xl",
          option: "text-2xl",
          optionNum: "w-14 h-14 text-2xl"
        };
      case "extra":
        return {
          question: "text-5xl",
          option: "text-3xl",
          optionNum: "w-16 h-16 text-3xl"
        };
      default:
        return {
          question: "text-3xl",
          option: "text-xl",
          optionNum: "w-12 h-12 text-xl"
        };
    }
  };

  const fs = getFontSizeClasses();

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const currentQuestion = shuffledQuestions[currentIndex];
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / shuffledQuestions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === shuffledQuestions.length;

  const StatusGrid = ({ className }: { className?: string }) => (
    <div className={cn("bg-white p-6 rounded-3xl border border-stone-200 shadow-sm space-y-4", className)}>
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-2">
        <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">ขนาดตัวอักษร</span>
        <div className="flex items-center gap-1 bg-stone-50 p-1 rounded-lg border border-stone-100">
          <button 
            onClick={() => onFontSizeChange("normal")}
            className={cn("px-2 py-1 rounded-md text-[10px] font-bold transition-all", fontSize === "normal" ? "bg-white text-stone-900 shadow-sm border border-stone-200" : "text-stone-400 hover:text-stone-600")}
          >
            ก
          </button>
          <button 
            onClick={() => onFontSizeChange("large")}
            className={cn("px-2 py-1 rounded-md text-xs font-bold transition-all", fontSize === "large" ? "bg-white text-stone-900 shadow-sm border border-stone-200" : "text-stone-400 hover:text-stone-600")}
          >
            ก+
          </button>
          <button 
            onClick={() => onFontSizeChange("extra")}
            className={cn("px-2 py-1 rounded-md text-sm font-bold transition-all", fontSize === "extra" ? "bg-white text-stone-900 shadow-sm border border-stone-200" : "text-stone-400 hover:text-stone-600")}
          >
            ก++
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-stone-700 flex items-center gap-2">
          <Layers size={18} className="text-emerald-500" /> สถานะการตอบ
        </h4>
        <span className="text-xs font-medium text-stone-400">
          {answeredCount} / {shuffledQuestions.length}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {shuffledQuestions.map((q, idx) => {
          const isAnswered = !!answers[q.id];
          return (
            <button
              key={q.id}
              onClick={() => {
                setCurrentIndex(idx);
                setShowStatusPopup(false);
              }}
              className={cn(
                "w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all relative",
                currentIndex === idx ? "ring-2 ring-offset-2 ring-stone-900" : "",
                isAnswered 
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                  : "bg-red-50 text-red-600 border border-red-100"
              )}
            >
              {idx + 1}
              <div className="absolute -top-1 -right-1">
                {isAnswered ? (
                  <CheckCircle2 size={12} className="fill-emerald-500 text-white" />
                ) : (
                  <XCircle size={12} className="fill-red-500 text-white" />
                )}
              </div>
            </button>
          );
        })}
      </div>
      {!allAnswered && (
        <div className="pt-2 flex items-center gap-2 text-[10px] text-red-500 font-bold uppercase">
          <AlertCircle size={12} /> กรุณาตอบให้ครบทุกข้อ
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar Status Grid (Desktop) */}
        <aside className="hidden lg:block w-[280px] sticky top-4 space-y-4">
          <StatusGrid />
          <div className="p-6 bg-stone-900 rounded-3xl text-white space-y-4">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-emerald-400" />
              <div>
                <p className="text-[10px] font-bold uppercase text-stone-400">เวลาที่เหลือ</p>
                <p className={cn("text-xl font-mono font-bold", timeLeft < 300 ? "text-red-400" : "text-white")}>
                  {formatTime(timeLeft)}
                </p>
              </div>
            </div>
            <button
              onClick={handleTrySubmit}
              className={cn(
                "w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                allAnswered 
                  ? "bg-emerald-500 text-white hover:bg-emerald-600" 
                  : "bg-stone-800 text-stone-500 hover:bg-stone-700"
              )}
            >
              <Send size={16} /> ส่งคำตอบ
            </button>
            <button
              onClick={handleTestMode}
              className="w-full py-2 rounded-xl border border-stone-700 text-stone-400 text-[10px] font-bold hover:bg-stone-800 transition-all"
            >
              [TEST MODE] สุ่มคำตอบทั้งหมด
            </button>
          </div>
        </aside>

        <div className="flex-1 w-full space-y-8">
          {/* Mobile Status Grid (Top) */}
          <div className="lg:hidden">
            <StatusGrid />
          </div>

          {/* Header with Timer and Progress */}
          <div className="sticky top-4 z-20 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between gap-4 lg:hidden">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                timeLeft < 300 ? "bg-red-100 text-red-600 animate-pulse" : "bg-stone-100 text-stone-600"
              )}>
                <Clock size={20} />
              </div>
              <p className={cn("text-lg font-mono font-bold", timeLeft < 300 ? "text-red-600" : "text-stone-900")}>
                {formatTime(timeLeft)}
              </p>
            </div>

            <button
              onClick={handleTrySubmit}
              className={cn(
                "px-4 py-2 rounded-full font-bold text-xs transition-all flex items-center gap-2",
                allAnswered 
                  ? "bg-stone-900 text-white" 
                  : "bg-stone-100 text-stone-600"
              )}
            >
              <Send size={14} /> ส่ง
            </button>
          </div>

          {/* Question Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 bg-stone-100 text-stone-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
              หัวข้อ: {currentQuestion.topic || currentQuestion.category} • ชุดคำถาม: {currentQuestion.level}
            </span>
          </div>

          <h3 className={cn("font-bold leading-snug transition-all", fs.question)}>
            {currentIndex + 1}. {currentQuestion.text}
          </h3>

          {currentQuestion.image && (currentQuestion.image.length > 5) && (
            <div className="rounded-2xl overflow-hidden border border-stone-100 bg-stone-50">
              <img 
                src={getImageUrl(currentQuestion.image)} 
                alt="Question Illustration" 
                className="w-full max-h-80 object-contain mx-auto" 
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 relative">
            {delayTimer > 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/10 backdrop-blur-[1px] rounded-2xl">
                <div className="bg-stone-900/90 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl animate-bounce">
                  <Clock size={20} className="animate-spin-slow" />
                  กรุณาอ่านโจทย์และคิดก่อนตอบ ({delayTimer}ว.)
                </div>
              </div>
            )}
            {(["A", "B", "C", "D"] as const).map((key) => (
              <button
                key={key}
                onClick={() => {
                  if (delayTimer > 0) return;
                  if (answers[currentQuestion.id] !== key) {
                    setAnswers({ ...answers, [currentQuestion.id]: key });
                  }
                }}
                disabled={delayTimer > 0}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all group",
                  delayTimer > 0 ? "opacity-50 cursor-not-allowed" : "",
                  answers[currentQuestion.id] === key
                    ? "bg-emerald-50 border-emerald-500 shadow-sm"
                    : "bg-white border-stone-100 hover:border-stone-200"
                )}
              >
                <span className={cn(
                  "rounded-xl flex items-center justify-center font-bold transition-all",
                  fs.optionNum,
                  answers[currentQuestion.id] === key
                    ? "bg-emerald-500 text-white"
                    : "bg-stone-100 text-stone-400 group-hover:bg-stone-200"
                )}>
                  {key}
                </span>
                <span className={cn(
                  "flex-1 font-bold transition-all",
                  fs.option,
                  answers[currentQuestion.id] === key ? "text-emerald-900" : "text-stone-600"
                )}>
                  {currentQuestion.options[key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-stone-50 p-4 flex justify-between items-center border-t border-stone-100">
          <button
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(currentIndex - 1)}
            className="px-6 py-2 text-stone-500 text-sm font-bold flex items-center gap-2 disabled:opacity-30"
          >
            <ChevronLeft size={20} /> ก่อนหน้า
          </button>
          
          <div className="text-xs text-stone-400 font-bold">
            ตอบแล้ว {answeredCount} จาก {shuffledQuestions.length} ข้อ
          </div>
 
          <button
            disabled={currentIndex === shuffledQuestions.length - 1 || delayTimer > 0}
            onClick={handleNext}
            className="px-6 py-2 text-stone-900 text-sm font-bold flex items-center gap-2 disabled:opacity-30"
          >
            {delayTimer > 0 ? `รอ ${delayTimer}ว.` : "ถัดไป"} <ChevronRight size={20} />
          </button>
        </div>
      </div>

        </div>
      </div>

      {/* Last Question Status Popup */}
      {showStatusPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xl font-bold text-stone-900">ตรวจสอบสถานะ</h4>
              <button 
                onClick={() => setShowStatusPopup(false)}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <p className="text-stone-500 text-sm">
              คุณทำถึงข้อสุดท้ายแล้ว กรุณาตรวจสอบว่าตอบครบทุกข้อหรือไม่ก่อนส่งคำตอบ
            </p>

            <StatusGrid className="border-0 shadow-none p-0" />

            <button
              onClick={() => setShowStatusPopup(false)}
              className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-bold">ยืนยันการส่งคำตอบ?</h4>
              <p className="text-stone-500 text-sm">
                คุณตอบไปแล้ว {answeredCount} จาก {shuffledQuestions.length} ข้อ
                เมื่อส่งแล้วจะไม่สามารถกลับมาแก้ไขได้อีก
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-all"
              >
                ยืนยันการส่ง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
