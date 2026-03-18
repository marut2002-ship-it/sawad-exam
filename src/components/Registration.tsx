import { useState, useEffect } from "react";
import { Search, User, Mail, ArrowRight, Loader2, Briefcase, Layers, CheckCircle2 } from "lucide-react";
import { Employee, Question } from "../types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RegistrationProps {
  onNext: (employee: Employee, email: string, questionSet: string) => void;
  questions: Question[];
}

import { fetchAPI } from "../lib/api";

export function Registration({ onNext, questions }: RegistrationProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSet, setSelectedSet] = useState("");

  // Manual form state
  const [formData, setFormData] = useState<Partial<Employee>>({
    prefix: "นาย",
    firstName: "",
    lastName: "",
    nickname: "",
    position: "",
    branch: "",
    zone: "",
    region: "",
    id: ""
  });

  // Auto-select question set based on position
  useEffect(() => {
    const pos = formData.position || "";
    if (pos.includes("ผู้จัดการเขต")) {
      setSelectedSet("ชุดเขต");
    } else if (pos.includes("ผู้จัดการภาค")) {
      setSelectedSet("ชุดภาค");
    } else if (pos) {
      setSelectedSet("ชุดสาขา");
    } else {
      setSelectedSet("");
    }
  }, [formData.position]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setIsOffline(true);
    }, 30000); // Increased safety timeout to 30s for slow GAS cold starts
    
    fetchAPI("/api/employees")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setEmployees(data);
          setIsOffline(false);
        } else if (data.data && Array.isArray(data.data)) {
          setEmployees(data.data);
          setIsOffline(false);
        } else {
          setIsOffline(true);
        }
        setLoading(false);
        clearTimeout(timer);
      })
      .catch((err) => {
        console.error("Fetch employees failed:", err);
        setLoading(false);
        setIsOffline(true);
        clearTimeout(timer);
      });
    return () => clearTimeout(timer);
  }, []);

  // Get unique question sets (levels)
  const questionSets = Array.from(new Set(questions.map(q => q.level))).filter(Boolean);

  const suggestions = employees.filter(
    (emp) => {
      const empId = String(emp.id || "").toLowerCase();
      const search = searchTerm.toLowerCase();
      return empId.includes(search) || 
             empId.replace(/^0+/, '').includes(search.replace(/^0+/, '')) ||
             `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(search);
    }
  ).slice(0, 5);

  const handleSelect = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      ...emp,
      id: String(emp.id)
    });
    setSearchTerm(String(emp.id));
    setShowSuggestions(false);
  };

  const handleInputChange = (field: keyof Employee, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'id') {
      setSearchTerm(value);
      setShowSuggestions(true);
      if (selectedEmployee && value !== String(selectedEmployee.id)) {
        setSelectedEmployee(null);
      }
    }
  };

  const isComplete = 
    formData.id && 
    formData.firstName && 
    formData.lastName && 
    formData.position && 
    formData.branch && 
    formData.zone && 
    formData.region && 
    email.includes("@") &&
    selectedSet;

  return (
    <div className="max-w-3xl mx-auto space-y-8 relative">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-bold text-stone-900">กำลังโหลดข้อมูล...</h4>
              <p className="text-stone-500 text-sm">กรุณารอสักครู่ ระบบกำลังดึงข้อมูลพนักงานและข้อสอบ</p>
            </div>
          </div>
        </div>
      )}

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-stone-900">แบบฟอร์มลงทะเบียน</h2>
        <p className="text-stone-500">กรุณากรอกข้อมูลให้ครบถ้วนเพื่อยืนยันสิทธิ์</p>
        {isOffline && (
          <div className="inline-flex flex-col items-center gap-2 px-6 py-3 bg-amber-50 text-amber-700 rounded-2xl text-xs font-bold border border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>โหมดออฟไลน์: ไม่สามารถเชื่อมต่อฐานข้อมูลพนักงานได้</span>
            </div>
            <p className="text-[10px] font-medium opacity-80">คุณยังสามารถทำข้อสอบได้ตามปกติ โดยการกรอกข้อมูลส่วนตัวด้วยตนเองด้านล่างนี้ครับ</p>
          </div>
        )}
      </div>

      <div className="bg-white p-8 md:p-10 rounded-3xl border border-stone-200 shadow-sm space-y-8">
        {/* Section: Personal Info */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-emerald-600">
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <User size={20} />
            </div>
            <h3 className="font-bold text-xl">ข้อมูลส่วนตัว</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ID Field with Autocomplete */}
            <div className="space-y-2 relative">
              <label className="text-sm font-bold text-stone-700">
                รหัสพนักงาน <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => handleInputChange('id', e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="ระบุรหัสพนักงาน"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400">
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                </div>
              </div>

              {showSuggestions && formData.id && !selectedEmployee && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-stone-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                  {suggestions.length > 0 ? (
                    suggestions.map((emp, index) => (
                      <button
                        key={`${emp.id}-${index}`}
                        onClick={() => handleSelect(emp)}
                        className="w-full px-4 py-4 text-left hover:bg-stone-50 flex flex-col border-b border-stone-100 last:border-0 transition-colors"
                      >
                        <span className="font-bold text-stone-900">{emp.id}</span>
                        <span className="text-xs text-stone-500">{emp.prefix}{emp.firstName} {emp.lastName}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-stone-400 text-sm italic">ไม่พบข้อมูลในระบบ (กรุณากรอกข้อมูลเอง)</div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700">
                ชื่อเล่น
              </label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => handleInputChange('nickname', e.target.value)}
                placeholder="ชื่อเล่น"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">
                  คำนำหน้า <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.prefix}
                  onChange={(e) => handleInputChange('prefix', e.target.value)}
                  className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                >
                  <option>นาย</option>
                  <option>นาง</option>
                  <option>นางสาว</option>
                </select>
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-bold text-stone-700">
                  ชื่อ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="ชื่อจริง"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700">
                นามสกุล <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="นามสกุล"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section: Work Info */}
        <div className="space-y-6 pt-6 border-t border-stone-100">
          <div className="flex items-center gap-3 text-blue-600">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <Briefcase size={20} />
            </div>
            <h3 className="font-bold text-xl">ข้อมูลการทำงาน</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700">
                ตำแหน่ง <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => handleInputChange('position', e.target.value)}
                placeholder="ระบุตำแหน่งงาน"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">
                  สาขา <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.branch}
                  onChange={(e) => handleInputChange('branch', e.target.value)}
                  placeholder="สาขา"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">
                  เขต <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.zone}
                  onChange={(e) => handleInputChange('zone', e.target.value)}
                  placeholder="เขต"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-stone-700">
                  ภาค <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                  placeholder="ภาค"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Exam Config */}
        <div className="space-y-6 pt-6 border-t border-stone-100">
          <div className="flex items-center gap-3 text-purple-600">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
              <Layers size={20} />
            </div>
            <h3 className="font-bold text-xl">การตั้งค่าการสอบ</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700">
                อีเมลสำหรับส่งผลการสอบ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="w-full px-4 py-3 pl-10 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700">
                ชุดคำถาม (เลือกให้อัตโนมัติตามตำแหน่ง)
              </label>
              <div className="px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl font-bold text-emerald-700 flex items-center justify-between">
                <span>{selectedSet || "กรุณาระบุตำแหน่งก่อน"}</span>
                {selectedSet && <CheckCircle2 size={18} className="text-emerald-500" />}
              </div>
              <p className="text-[10px] text-stone-400 italic">
                * ระบบจะเลือกชุดข้อสอบที่เหมาะสมกับตำแหน่งของคุณโดยอัตโนมัติ
              </p>
            </div>
          </div>
        </div>

        <button
          disabled={!isComplete}
          onClick={() => onNext(formData as Employee, email, selectedSet)}
          className={cn(
            "w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]",
            isComplete 
              ? "bg-stone-900 text-white hover:bg-stone-800" 
              : "bg-stone-100 text-stone-400 cursor-not-allowed shadow-none"
          )}
        >
          ยืนยันข้อมูลและถ่ายรูป <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
