/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from "react";
import { Welcome } from "./components/Welcome";
import { Registration } from "./components/Registration";
import { FaceCapture } from "./components/FaceCapture";
import { PDPAConsent } from "./components/PDPAConsent";
import { ExamIntro } from "./components/ExamIntro";
import { Exam } from "./components/Exam";
import { Result } from "./components/Result";
import { AdminDashboard } from "./components/AdminDashboard";
import { Employee, Question, ExamResult, QuestionResult, SystemStatus, AdminResult, QuestionStat } from "./types";
import { fetchAPI } from "./lib/api";
import { AlertCircle } from "lucide-react";
import { cn } from "./lib/utils";

type Step = "welcome" | "registration" | "face-capture" | "pdpa-consent" | "exam-intro" | "exam" | "result" | "admin-login" | "admin-dashboard";

export default function App() {
  const [step, setStep] = useState<Step>("welcome");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [pdpaConsent, setPdpaConsent] = useState<"ยินยอม" | "ไม่ยินยอม" | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedSet, setSelectedSet] = useState("");
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const APP_VERSION = "2.1.2";
  const [gasVersion, setGasVersion] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "online" | "offline">("connecting");
  const [fontSize, setFontSize] = useState<"normal" | "large" | "extra">("normal");
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    registrationStatus: "OPEN",
    announcement: "ยินดีต้อนรับสู่ระบบทดสอบความรู้"
  });
  const [adminResults, setAdminResults] = useState<AdminResult[]>([]);
  const [questionStats, setQuestionStats] = useState<QuestionStat[]>([]);
  const [adminRole, setAdminRole] = useState<"admin" | "facilitator" | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("exam_theme");
    return (saved as "light" | "dark") || "light";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  // Persistence Logic
  useEffect(() => {
    const savedSession = localStorage.getItem("exam_session");
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        const validSteps: Step[] = ["welcome", "registration", "face-capture", "pdpa-consent", "exam-intro", "exam", "result", "admin-login", "admin-dashboard"];
        
        if (session.step && validSteps.includes(session.step) && session.step !== "result") {
          const savedQuestions = localStorage.getItem("exam_questions");
          if (savedQuestions) {
            setQuestions(JSON.parse(savedQuestions));
          }
          
          setStep(session.step);
          setEmployee(session.employee);
          setEmail(session.email);
          setPhoto(session.photo);
          setPdpaConsent(session.pdpaConsent);
          setSelectedSet(session.selectedSet);
          if (session.fontSize) setFontSize(session.fontSize);
        }
      } catch (e) {
        console.error("Failed to restore session", e);
        localStorage.removeItem("exam_session");
      }
    }
  }, []);

  useEffect(() => {
    if (step === "exam" && questions.length > 0) {
      localStorage.setItem("exam_questions", JSON.stringify(questions));
    }
  }, [step, questions]);

  useEffect(() => {
    if (step !== "result" && step !== "welcome") {
      localStorage.setItem("exam_session", JSON.stringify({
        step,
        employee,
        email,
        photo,
        pdpaConsent,
        selectedSet,
        fontSize
      }));
    } else if (step === "result") {
      localStorage.removeItem("exam_session");
      localStorage.removeItem("exam_answers");
      localStorage.removeItem("exam_start_time");
      localStorage.removeItem("exam_questions");
    }
  }, [step, employee, email, photo, pdpaConsent, selectedSet]);

  useEffect(() => {
    localStorage.setItem("exam_theme", theme);
  }, [theme]);

  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 30000);

    // Check GAS connection and version
    setConnectionStatus("connecting");
    fetchAPI("/api/version")
      .then(data => {
        if (data && data.version) {
          setGasVersion(data.version);
          setConnectionStatus("online");
        } else {
          setConnectionStatus("offline");
        }
      })
      .catch(err => {
        console.error("Failed to fetch version", err);
        setConnectionStatus("offline");
      });

    setIsQuestionsLoading(true);
    fetchAPI("/api/questions")
      .then(data => {
        setQuestions(Array.isArray(data) ? data : []);
        setIsQuestionsLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch questions", err);
        setIsQuestionsLoading(false);
      });

    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const data = await fetchAPI("/api/status");
      setSystemStatus({
        registrationStatus: data.regStatus || "OPEN",
        announcement: data.announcement || "ยินดีต้อนรับสู่ระบบทดสอบความรู้"
      });
    } catch (e) {
      console.error("Failed to fetch system status, using default:", e);
    }
  };

  const handleStart = () => {
    if (systemStatus.registrationStatus === "CLOSED") {
      alert("ระบบปิดรับลงทะเบียนชั่วคราว กรุณารอวิทยากรเปิดระบบ");
      return;
    }
    setStep("registration");
  };

  const handleSecretEntry = () => {
    setStep("admin-login");
  };

  const handleAdminLogin = async (pin: string) => {
    setIsLoading(true);
    try {
      const data = await fetchAPI("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin })
      });
      if (data.status === "success") {
        setAdminRole(data.role.toLowerCase() as "admin" | "facilitator");
        setAdminPin(pin);
        setStep("admin-dashboard");
      } else {
        alert("รหัส PIN ไม่ถูกต้อง");
      }
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetExam = async (employeeId: string) => {
    try {
      const data = await fetchAPI("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, pin: adminPin })
      });
      if (data.status === "success") {
        handleAdminLogin(adminPin);
      }
    } catch (e) {
      console.error("Reset failed", e);
    }
  };

  const handleToggleRegistration = async (status: "OPEN" | "CLOSED") => {
    try {
      const data = await fetchAPI("/api/admin/toggle-reg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, pin: adminPin })
      });
      if (data.status === "success") {
        setSystemStatus(prev => ({ ...prev, registrationStatus: status }));
      }
    } catch (e) {
      console.error("Toggle failed", e);
    }
  };

  const handleUpdateAnnouncement = async (announcement: string) => {
    try {
      const data = await fetchAPI("/api/admin/update-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcement, pin: adminPin })
      });
      if (data.status === "success") {
        setSystemStatus(prev => ({ ...prev, announcement }));
      }
    } catch (e) {
      console.error("Update announcement failed", e);
    }
  };

  const handleRegister = (emp: Employee, mail: string, qSet: string) => {
    if (systemStatus.registrationStatus === "CLOSED") {
      alert("ระบบปิดรับลงทะเบียนแล้ว");
      setStep("welcome");
      return;
    }
    setEmployee(emp);
    setEmail(mail);
    setSelectedSet(qSet);
    setStep("face-capture");
  };

  const handlePhotoCaptured = (img: string) => {
    setPhoto(img);
    setStep("pdpa-consent");
  };

  const handlePDPAConsent = (consent: "ยินยอม" | "ไม่ยินยอม") => {
    setPdpaConsent(consent);
    setStep("exam-intro");
  };

  const handleStartExam = () => {
    setStep("exam");
  };

  const filteredQuestions = useMemo(() => {
    if (!questions.length || !selectedSet) return [];
    
    const setQuestions = questions.filter(q => {
      const level = String(q.level || "").trim();
      
      if (selectedSet === "ชุดเขต") {
        return level.includes("ชุดเขต") || level.includes("ทุกตำแหน่ง");
      }
      if (selectedSet === "ชุดภาค") {
        return level.includes("ชุดภาค") || level.includes("ทุกตำแหน่ง");
      }
      if (selectedSet === "ชุดสาขา") {
        return level.includes("ชุดสาขา") || level.includes("ทุกตำแหน่ง");
      }
      return level.includes(selectedSet);
    });

    if (setQuestions.length === 0) return [];
    if (setQuestions.length <= 30) return setQuestions.sort(() => Math.random() - 0.5);

    const topicsMap: Record<string, Question[]> = {};
    setQuestions.forEach(q => {
      const topic = q.topic || "General";
      if (!topicsMap[topic]) topicsMap[topic] = [];
      topicsMap[topic].push(q);
    });

    const topics = Object.keys(topicsMap);
    const totalTarget = 30;
    const selected: Question[] = [];
    const shuffledTopics = [...topics].sort(() => Math.random() - 0.5);
    topics.forEach(t => topicsMap[t].sort(() => Math.random() - 0.5));

    let count = 0;
    while (count < totalTarget) {
      let addedInThisRound = false;
      for (const topic of shuffledTopics) {
        if (count >= totalTarget) break;
        if (topicsMap[topic].length > 0) {
          selected.push(topicsMap[topic].pop()!);
          count++;
          addedInThisRound = true;
        }
      }
      if (!addedInThisRound) break;
    }

    return selected.sort(() => Math.random() - 0.5);
  }, [questions, selectedSet]);

  const handleExamComplete = (score: number, total: number, results: QuestionResult[], tabSwitches: number, timeSpent: string) => {
    if (!employee) return;
    
    setIsLoading(true);
    const result: ExamResult = {
      timestamp: new Date().toLocaleString("th-TH"),
      score,
      totalQuestions: total,
      employeeId: employee.id,
      prefix: employee.prefix,
      firstName: employee.firstName,
      lastName: employee.lastName,
      nickname: employee.nickname,
      position: employee.position,
      branch: employee.branch,
      zone: employee.zone,
      region: employee.region,
      email: email,
      photo: photo || "",
      pdpaConsent: pdpaConsent || "ไม่ยินยอม",
      results: results,
      tabSwitches,
      timeSpent,
      deviceLog: navigator.userAgent,
      rawData: JSON.stringify({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        screen: `${window.screen.width}x${window.screen.height}`,
        timestamp: new Date().toISOString()
      })
    };

    setExamResult(result);
    setStep("result");

    fetchAPI("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    })
    .then(async (data) => {
      if (!data.success) {
        console.error("GAS Error:", data.error);
        alert("บันทึกข้อมูลลง Google Sheets ไม่สำเร็จ: " + (data.error || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"));
      } else if (data.message && (data.pdfUrl === "" || data.photoUrl === "")) {
        alert(data.message);
      }
    })
    .catch(err => {
      console.error("Failed to save results", err);
      alert("ไม่สามารถเชื่อมต่อกับระบบบันทึกข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
    })
    .finally(() => setIsLoading(false));
  };

  return (
    <div className={cn(
      "min-h-screen font-sans selection:bg-emerald-100 transition-colors duration-300",
      theme === "dark" ? "bg-stone-950 text-stone-100" : "bg-stone-50 text-stone-900"
    )}>
      <div className={cn(
        "mx-auto px-4 py-8 md:py-16 transition-all duration-500",
        step === "admin-dashboard" ? "max-w-full" : "max-w-4xl"
      )}>
        <button 
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className={cn(
            "fixed top-4 right-4 p-3 rounded-2xl border transition-all z-[60]",
            theme === "dark" 
              ? "bg-stone-900 border-stone-800 text-stone-400 hover:text-white" 
              : "bg-white border-stone-200 text-stone-500 hover:text-stone-900 shadow-sm"
          )}
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        {step === "welcome" && (
          <Welcome 
            onStart={handleStart} 
            onSecretEntry={handleSecretEntry} 
            status={systemStatus} 
            version={gasVersion}
            theme={theme}
          />
        )}

        {step === "admin-login" && (
          <div className="max-w-md mx-auto mt-20">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-stone-200 text-center space-y-6">
              <div className="w-16 h-16 bg-stone-900 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                <span className="text-2xl">🛡️</span>
              </div>
              <h2 className="text-2xl font-bold">Admin Access</h2>
              <p className="text-stone-500 text-sm">กรุณาใส่รหัส PIN 6 หลักเพื่อเข้าสู่ระบบ</p>
              
              <div className="relative">
                <input 
                  type={showPin ? "text" : "password"} 
                  maxLength={6}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  placeholder="••••••"
                  className="w-full text-center text-3xl tracking-[0.5em] py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all pr-12"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdminLogin(loginPin);
                  }}
                />
                <button 
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showPin ? <span>🙈</span> : <span>👁️</span>}
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => {
                  setStep("welcome");
                  setLoginPin("");
                  setShowPin(false);
                }} className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold">ยกเลิก</button>
                <button 
                  onClick={() => handleAdminLogin(loginPin)}
                  disabled={isLoading || loginPin.length < 4}
                  className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold disabled:opacity-50"
                >
                  {isLoading ? "กำลังตรวจสอบ..." : "ยืนยัน"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "admin-dashboard" && adminRole && (
          <AdminDashboard 
            pin={adminPin}
            systemStatus={systemStatus}
            role={adminRole}
            onLogout={() => setStep("welcome")}
            onResetExam={handleResetExam}
            onToggleRegistration={handleToggleRegistration}
            onExportExcel={() => window.open(`/api/admin/export/excel?pin=${adminPin}`)}
            onExportPdf={() => window.open(`/api/admin/export/pdf?pin=${adminPin}`)}
            onUpdateAnnouncement={handleUpdateAnnouncement}
            theme={theme}
          />
        )}
        {step === "registration" && (
          systemStatus.registrationStatus === "CLOSED" ? (
            <div className="text-center p-12 bg-white rounded-[2.5rem] border border-stone-200 shadow-sm max-w-md mx-auto animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h2 className="text-2xl font-bold text-stone-900 mb-2">ระบบปิดรับลงทะเบียนแล้ว</h2>
              <p className="text-stone-500 mb-8">กรุณารอวิทยากรเปิดระบบเพื่อเริ่มการทดสอบรอบถัดไป</p>
              <button 
                onClick={() => setStep("welcome")} 
                className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all"
              >
                กลับหน้าแรก
              </button>
            </div>
          ) : (
            <Registration onNext={handleRegister} questions={questions} />
          )
        )}
        {step === "face-capture" && <FaceCapture onCapture={handlePhotoCaptured} />}
        {step === "pdpa-consent" && <PDPAConsent onConfirm={handlePDPAConsent} />}
        {step === "exam-intro" && <ExamIntro onStart={handleStartExam} timeLimitMinutes={45} />}
        {step === "exam" && (
          (isQuestionsLoading || (questions.length === 0 && step === "exam")) ? (
            <div className="text-center p-12 bg-white rounded-[2.5rem] border border-stone-200 shadow-sm max-w-md mx-auto">
              <div className="w-16 h-16 border-4 border-stone-100 border-t-stone-900 rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">กำลังเตรียมข้อสอบ...</h2>
              <p className="text-stone-500">กรุณารอสักครู่ ระบบกำลังดึงข้อมูลและจัดเตรียมชุดข้อสอบให้คุณ</p>
            </div>
          ) : filteredQuestions.length > 0 ? (
            <Exam 
              questions={filteredQuestions} 
              onComplete={handleExamComplete} 
              employeeName={`${employee?.firstName} ${employee?.lastName}`}
              fontSize={fontSize}
              onFontSizeChange={setFontSize}
            />
          ) : (
            <div className="text-center p-12 bg-white rounded-[2.5rem] border border-stone-200 shadow-sm max-w-md mx-auto">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h2 className="text-2xl font-bold text-stone-900 mb-2">ไม่พบข้อสอบ</h2>
              <p className="text-stone-500 mb-8">
                ไม่พบข้อสอบที่ตรงกับชุด <span className="font-bold text-stone-900">"{selectedSet}"</span> <br/>
                หรือระบบกำลังประมวลผลข้อมูลอยู่ หากรอเกิน 10 วินาทีแล้วยังไม่ขึ้น <br/>
                กรุณาตรวจสอบคอลัมน์ "ระดับ/ชุดคำถาม" ใน Google Sheet
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => window.location.reload()} 
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all"
                >
                  ลองโหลดใหม่อีกครั้ง
                </button>
                <button 
                  onClick={() => setStep("registration")} 
                  className="w-full py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all"
                >
                  กลับไปแก้ไขข้อมูล
                </button>
              </div>
            </div>
          )
        )}
        {step === "result" && examResult && <Result result={examResult} />}
        
        {!["welcome", "registration", "face-capture", "pdpa-consent", "exam-intro", "exam", "result", "admin-login", "admin-dashboard"].includes(step) && (
          <div className="text-center p-12 bg-white rounded-[2.5rem] border border-stone-200 shadow-sm max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-stone-900 mb-2">เกิดข้อผิดพลาด</h2>
            <p className="text-stone-500 mb-8">ไม่พบหน้าที่คุณต้องการ หรือเซสชันอาจหมดอายุ</p>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }} 
              className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all"
            >
              กลับไปหน้าแรก
            </button>
          </div>
        )}
      </div>

      <button 
        onClick={() => {
          localStorage.clear();
          window.location.reload();
        }}
        className="fixed bottom-2 left-2 opacity-0 hover:opacity-20 text-[8px] bg-stone-200 p-1 rounded"
      >
        Reset App
      </button>

      {isLoading && (
        <div className={cn(
          "fixed inset-0 backdrop-blur-sm z-[100] flex items-center justify-center transition-all duration-300",
          theme === "dark" ? "bg-black/60" : "bg-white/60"
        )}>
          <div className={cn(
            "p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 transition-all duration-300",
            theme === "dark" ? "bg-stone-900 border border-stone-800" : "bg-white"
          )}>
            <span className={cn("animate-spin text-4xl", theme === "dark" ? "text-emerald-500" : "text-stone-900")}>⏳</span>
            <p className={cn("font-bold", theme === "dark" ? "text-white" : "text-stone-900")}>กำลังประมวลผล...</p>
          </div>
        </div>
      )}

      {/* Connection Status Indicator */}
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-stone-200 shadow-sm text-[10px] font-bold">
        <div className={cn(
          "w-2 h-2 rounded-full",
          connectionStatus === "online" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
          connectionStatus === "connecting" ? "bg-amber-500 animate-pulse" : "bg-rose-500"
        )} />
        <span className="text-stone-600 uppercase tracking-wider">
          v{APP_VERSION} {connectionStatus === "online" ? `(GAS CONNECTED)` : 
           connectionStatus === "connecting" ? "(Connecting...)" : "(GAS Offline)"}
        </span>
      </div>
    </div>
  );
}
