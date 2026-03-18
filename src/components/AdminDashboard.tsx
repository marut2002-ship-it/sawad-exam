import { useState, useMemo, useEffect } from "react";
import { 
  Users, CheckCircle, AlertTriangle, Search, Filter, 
  Download, RefreshCw, Eye, EyeOff, BarChart3, 
  TrendingUp, ShieldAlert, LogOut, Settings,
  ChevronDown, ChevronUp, FileSpreadsheet, FileText,
  X, User, MapPin, Calendar, Clock as ClockIcon,
  ShieldCheck, AlertCircle, ChevronLeft, ChevronRight,
  LayoutDashboard, List
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell
} from "recharts";
import { cn } from "../lib/utils";
import { AdminResult, QuestionStat, SystemStatus, AdminOverview, PaginatedEmployees, EmployeeRecord } from "../types";
import { fetchAPI } from "../lib/api";

interface AdminDashboardProps {
  pin: string;
  systemStatus: SystemStatus;
  role: "admin" | "facilitator";
  onLogout: () => void;
  onResetExam: (employeeId: string) => Promise<void>;
  onToggleRegistration: (status: "OPEN" | "CLOSED") => Promise<void>;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onUpdateAnnouncement: (text: string) => Promise<void>;
  theme?: "light" | "dark";
}

export function AdminDashboard({ 
  pin,
  systemStatus, 
  role, 
  onLogout,
  onResetExam,
  onToggleRegistration,
  onExportExcel,
  onExportPdf,
  onUpdateAnnouncement,
  theme = "dark"
}: AdminDashboardProps) {
  const isDark = theme === "dark";
  const [activeTab, setActiveTab] = useState<"overview" | "employees">("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [paginatedEmployees, setPaginatedEmployees] = useState<PaginatedEmployees | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedZone, setSelectedZone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<EmployeeRecord | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [announcementText, setAnnouncementText] = useState(systemStatus.announcement);

  // Fetch Overview Data
  const fetchOverview = async () => {
    try {
      setIsLoading(true);
      const data = await fetchAPI(`/api/admin/overview?pin=${pin}`);
      if (data.success) {
        setOverview(data);
      }
    } catch (err) {
      console.error("Failed to fetch overview:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Employee List
  const fetchEmployees = async (page: number, search: string, region: string, zone: string) => {
    try {
      setIsLoading(true);
      const data = await fetchAPI(`/api/admin/employee-list?pin=${pin}&page=${page}&search=${encodeURIComponent(search)}&region=${encodeURIComponent(region)}&zone=${encodeURIComponent(zone)}`);
      if (data.success) {
        setPaginatedEmployees(data);
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") {
      fetchOverview();
    } else {
      fetchEmployees(currentPage, searchTerm, selectedRegion, selectedZone);
    }
  }, [activeTab, pin]);

  useEffect(() => {
    if (activeTab === "employees") {
      const timer = setTimeout(() => {
        fetchEmployees(currentPage, searchTerm, selectedRegion, selectedZone);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [searchTerm, currentPage, selectedRegion, selectedZone]);

  // Score Distribution Data from Overview
  const scoreDistData = useMemo(() => {
    if (!overview || !overview.scoreDistribution) {
      return [
        { range: "0-20%", count: 0 },
        { range: "21-40%", count: 0 },
        { range: "41-60%", count: 0 },
        { range: "61-80%", count: 0 },
        { range: "81-100%", count: 0 }
      ];
    }
    
    return Object.entries(overview.scoreDistribution).map(([range, count]) => ({
      range,
      count
    }));
  }, [overview]);

  const handleReset = async (id: string) => {
    if (window.confirm(`ยืนยันการ Reset ข้อสอบของพนักงานรหัส ${id}? ข้อมูลเดิมจะถูกลบทั้งหมด`)) {
      setIsResetting(id);
      await onResetExam(id);
      setIsResetting(null);
      fetchEmployees(currentPage, searchTerm, selectedRegion, selectedZone);
    }
  };

  return (
    <div className={cn(
      "min-h-screen font-sans selection:bg-emerald-500/30 transition-colors duration-300",
      isDark ? "bg-[#0a0a0a] text-stone-300" : "bg-stone-50 text-stone-600"
    )}>
      {/* Top Navigation */}
      <nav className={cn(
        "border-b sticky top-0 z-50 backdrop-blur-xl transition-all",
        isDark ? "border-white/5 bg-black/40" : "border-stone-200 bg-white/80"
      )}>
        <div className="max-w-full mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <ShieldAlert className="text-black" size={24} />
            </div>
            <div>
              <h1 className={cn("text-xl font-bold tracking-tight", isDark ? "text-white" : "text-stone-900")}>
                Project Spyglass <span className="text-emerald-500 text-xs ml-2 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">v2.0</span>
              </h1>
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">ศูนย์ควบคุม • {role === "admin" ? "ผู้ดูแลระบบ" : "ผู้ช่วย"}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className={cn(
              "flex p-1 rounded-2xl border transition-all mr-4",
              isDark ? "bg-white/5 border-white/10" : "bg-stone-100 border-stone-200"
            )}>
              <button 
                onClick={() => setActiveTab("overview")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  activeTab === "overview" ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-stone-500 hover:text-stone-300"
                )}
              >
                <LayoutDashboard size={16} /> ภาพรวม
              </button>
              <button 
                onClick={() => setActiveTab("employees")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  activeTab === "employees" ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "text-stone-500 hover:text-stone-300"
                )}
              >
                <List size={16} /> รายชื่อผู้เข้าสอบ
              </button>
            </div>

            <div className={cn(
              "hidden md:flex items-center gap-3 px-4 py-2 rounded-xl border transition-all",
              isDark ? "bg-white/5 border-white/10" : "bg-stone-100 border-stone-200"
            )}>
              <div className={systemStatus.registrationStatus === "OPEN" ? "w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" : "w-2 h-2 bg-red-500 rounded-full"} />
              <span className="text-xs font-bold uppercase tracking-wider">การลงทะเบียน: {systemStatus.registrationStatus === "OPEN" ? "เปิด" : "ปิด"}</span>
              {role === "admin" && (
                <button 
                  onClick={() => onToggleRegistration(systemStatus.registrationStatus === "OPEN" ? "CLOSED" : "OPEN")}
                  className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Settings size={14} className="text-stone-500" />
                </button>
              )}
            </div>
            
            {role === "admin" && (
              <button 
                onClick={() => setShowSettings(true)}
                className={cn(
                  "p-3 rounded-2xl border transition-all",
                  isDark ? "bg-white/5 border-white/10 text-stone-400 hover:text-white" : "bg-stone-100 border-stone-200 text-stone-600 hover:text-stone-900"
                )}
                title="ตั้งค่าระบบ"
              >
                <Settings size={20} />
              </button>
            )}
            
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl border border-red-500/20 transition-all font-bold text-xs uppercase tracking-wider"
            >
              <LogOut size={16} /> ออกจากระบบ
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-full mx-auto p-8 space-y-8">
        {activeTab === "overview" ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "พนักงานทั้งหมด", value: overview?.stats.totalEmployees || 0, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
                { label: "ทำข้อสอบแล้ว", value: overview?.stats.completed || 0, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-400/10" },
                { label: "ยังไม่เข้าสอบ", value: (overview?.stats.totalEmployees || 0) - (overview?.stats.completed || 0), icon: TrendingUp, color: "text-orange-400", bg: "bg-orange-400/10" },
                { label: "คะแนนเฉลี่ย", value: `${(overview?.stats.avgScore || 0).toFixed(1)}%`, icon: BarChart3, color: "text-purple-400", bg: "bg-purple-400/10" },
              ].map((stat, i) => (
                <div 
                  key={stat.label} 
                  className={cn(
                    "border p-6 rounded-[2rem] transition-all group",
                    isDark ? "bg-white/5 border-white/10 hover:border-white/20" : "bg-white border-stone-200 hover:border-stone-300 shadow-sm"
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("p-3 rounded-2xl", stat.bg)}>
                      <stat.icon className={stat.color} size={24} />
                    </div>
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">เรียลไทม์</span>
                  </div>
                  <h3 className={cn("text-3xl font-bold mb-1 tracking-tight", isDark ? "text-white" : "text-stone-900")}>{stat.value}</h3>
                  <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Chart Section */}
              <div className={cn(
                "lg:col-span-2 border rounded-[2.5rem] p-8 transition-all",
                isDark ? "bg-white/5 border-white/10" : "bg-white border-stone-200 shadow-sm"
              )}>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className={cn("text-lg font-bold tracking-tight", isDark ? "text-white" : "text-stone-900")}>การกระจายคะแนน</h3>
                    <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">กราฟแสดงผลคะแนน</p>
                  </div>
                  <BarChart3 className="text-emerald-500/50" size={24} />
                </div>
                <div className="h-[300px] w-full">
                  {isLoading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <RefreshCw className="animate-spin text-emerald-500" size={32} />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scoreDistData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)"} vertical={false} />
                        <XAxis 
                          dataKey="range" 
                          stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)"} 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)"} 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <Tooltip 
                          cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                          contentStyle={{ 
                            backgroundColor: isDark ? '#1a1a1a' : '#ffffff', 
                            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: isDark ? '#ffffff' : '#000000'
                          }}
                        />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                          {scoreDistData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === scoreDistData.length - 1 ? '#10b981' : '#3b82f6'} fillOpacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Hardest Questions */}
              <div className={cn(
                "border rounded-[2.5rem] p-8",
                isDark ? "bg-white/5 border-white/10" : "bg-white border-stone-200 shadow-sm"
              )}>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className={cn("text-lg font-bold tracking-tight", isDark ? "text-white" : "text-stone-900")}>จุดที่ควรพัฒนา</h3>
                    <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">5 อันดับข้อที่ผิดมากที่สุด</p>
                  </div>
                  <AlertTriangle className="text-orange-500/50" size={24} />
                </div>
                <div className="space-y-4">
                  {overview?.questionStats.slice(0, 5).map((q, i) => (
                    <div key={q[0] || i} className={cn(
                      "p-4 rounded-2xl border transition-all",
                      isDark ? "bg-white/5 border-white/5 hover:border-white/10" : "bg-stone-50 border-stone-100 hover:border-stone-200"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">ข้อที่ {q[0] || i}</span>
                        <span className="text-xs font-bold text-red-400">อัตราการผิด: {Math.round((q[4]/q[2])*100) || 0}%</span>
                      </div>
                      <p className={cn("text-xs font-medium line-clamp-2 leading-relaxed", isDark ? "text-white" : "text-stone-800")}>{q[1]}</p>
                      <div className={cn("mt-3 h-1 w-full rounded-full overflow-hidden", isDark ? "bg-white/5" : "bg-stone-200")}>
                        <div className="h-full bg-red-500/50" style={{ width: `${(q[4]/q[2])*100 || 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className={cn(
            "border rounded-[2.5rem] overflow-hidden",
            isDark ? "bg-white/5 border-white/10" : "bg-white border-stone-200 shadow-sm"
          )}>
            <div className={cn(
              "p-8 border-b flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all",
              isDark ? "border-white/5" : "border-stone-100"
            )}>
              <div>
                <h3 className={cn("text-lg font-bold tracking-tight", isDark ? "text-white" : "text-stone-900")}>รายชื่อผู้เข้าสอบ</h3>
                <p className="text-xs text-stone-500 uppercase tracking-widest mt-1">
                  แสดง {paginatedEmployees?.data.length || 0} จากทั้งหมด {paginatedEmployees?.pagination.totalItems || 0} รายการ
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedRegion}
                    onChange={(e) => {
                      setSelectedRegion(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all",
                      isDark ? "bg-white/5 border-white/10 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                    )}
                  >
                    <option value="">ทุกภาค</option>
                    <option value="กลาง">กลาง</option>
                    <option value="เหนือ">เหนือ</option>
                    <option value="อีสาน">อีสาน</option>
                    <option value="ใต้">ใต้</option>
                    <option value="ตะวันออก">ตะวันออก</option>
                    <option value="ตะวันตก">ตะวันตก</option>
                  </select>

                  <select 
                    value={selectedZone}
                    onChange={(e) => {
                      setSelectedZone(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "px-4 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all",
                      isDark ? "bg-white/5 border-white/10 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                    )}
                  >
                    <option value="">ทุกเขต</option>
                    {Array.from({ length: 20 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="ค้นหา รหัส หรือ ชื่อ..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={cn(
                      "pl-12 pr-6 py-3 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all w-full md:w-64",
                      isDark ? "bg-white/5 border-white/10 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                    )}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={onExportExcel}
                    className={cn(
                      "p-3 rounded-2xl border transition-all",
                      isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white" : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"
                    )}
                    title="ส่งออก Excel"
                  >
                    <FileSpreadsheet size={20} />
                  </button>
                  <button 
                    onClick={onExportPdf}
                    className={cn(
                      "p-3 rounded-2xl border transition-all",
                      isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500 hover:text-white" : "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-600 hover:text-white"
                    )}
                    title="ส่งออก PDF"
                  >
                    <FileText size={20} />
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={isDark ? "bg-white/5" : "bg-stone-50"}>
                    <th className="px-8 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest">พนักงาน</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest">สาขา</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest text-center">คะแนน</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest text-center">การแจ้งเตือน</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest text-center">สถานะ</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-stone-500 uppercase tracking-widest text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-stone-100")}>
                  {isLoading && !paginatedEmployees ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <RefreshCw className="animate-spin text-emerald-500 mx-auto mb-4" size={32} />
                        <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">กำลังโหลดข้อมูล...</p>
                      </td>
                    </tr>
                  ) : paginatedEmployees?.data.map((r, index) => (
                    <tr key={`${r.employeeId}-${index}`} className={cn(
                      "transition-colors group",
                      isDark ? "hover:bg-white/[0.02]" : "hover:bg-stone-50"
                    )}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border overflow-hidden",
                            isDark ? "bg-white/5 border-white/10 text-stone-400" : "bg-stone-100 border-stone-200 text-stone-600"
                          )}>
                            {r.examInfo?.photoUrl ? (
                              <img 
                                src={r.examInfo.photoUrl} 
                                alt="รูปภาพ" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              String(r.employeeId || "").slice(-2)
                            )}
                          </div>
                          <div>
                            <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-stone-900")}>{r.name}</p>
                            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">{r.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn("text-xs font-bold uppercase tracking-wider", isDark ? "text-stone-400" : "text-stone-500")}>{r.branch}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        {r.examInfo ? (
                          <div className="inline-flex flex-col items-center">
                            <span className={cn("text-sm font-bold", r.examInfo.score >= 15 ? "text-emerald-400" : "text-red-400")}>
                              {r.examInfo.score}
                            </span>
                            <div className={cn("w-12 h-1 rounded-full mt-1 overflow-hidden", isDark ? "bg-white/5" : "bg-stone-200")}>
                              <div 
                                className={cn("h-full", r.examInfo.score >= 15 ? "bg-emerald-500" : "bg-red-500")} 
                                style={{ width: `${(r.examInfo.score / 20) * 100}%` }} 
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-stone-600 font-bold uppercase tracking-widest">-</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        {r.examInfo && Number(r.examInfo.tabSwitches) > 0 ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20 text-[10px] font-bold uppercase tracking-wider">
                            <AlertTriangle size={12} /> {r.examInfo.tabSwitches}
                          </div>
                        ) : (
                          <span className="text-[10px] text-stone-600 font-bold uppercase tracking-widest">ปกติ</span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          r.examInfo 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                            : (isDark ? "bg-stone-500/10 text-stone-500 border-white/5" : "bg-stone-100 text-stone-400 border-stone-200")
                        )}>
                          {r.examInfo ? "เสร็จสิ้น" : "ยังไม่เข้าสอบ"}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {r.examInfo && (
                            <button 
                              onClick={() => setSelectedUser(r)}
                              className={cn(
                                "p-2 rounded-lg transition-all",
                                isDark ? "hover:bg-white/10 text-stone-500 hover:text-white" : "hover:bg-stone-100 text-stone-400 hover:text-stone-900"
                              )}
                            >
                              <Eye size={18} />
                            </button>
                          )}
                          {role === "admin" && r.examInfo && (
                            <button 
                              onClick={() => handleReset(r.employeeId)}
                              disabled={isResetting === r.employeeId}
                              className={cn(
                                "p-2 rounded-lg transition-all disabled:opacity-50",
                                isDark ? "hover:bg-red-500/10 text-stone-500 hover:text-red-400" : "hover:bg-rose-50 text-stone-400 hover:text-rose-600"
                              )}
                            >
                              <RefreshCw size={18} className={isResetting === r.employeeId ? "animate-spin" : ""} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {paginatedEmployees && paginatedEmployees.pagination.totalPages > 1 && (
              <div className={cn(
                "p-8 border-t flex items-center justify-between",
                isDark ? "border-white/5" : "border-stone-100"
              )}>
                <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">
                  หน้า {paginatedEmployees.pagination.currentPage} จาก {paginatedEmployees.pagination.totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || isLoading}
                    className={cn(
                      "p-2 rounded-xl border disabled:opacity-30 transition-all",
                      isDark ? "bg-white/5 hover:bg-white/10 border-white/10" : "bg-white hover:bg-stone-50 border-stone-200 shadow-sm"
                    )}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, paginatedEmployees.pagination.totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (paginatedEmployees.pagination.totalPages > 5) {
                        if (currentPage > 3) pageNum = currentPage - 2 + i;
                        if (pageNum > paginatedEmployees.pagination.totalPages) pageNum = paginatedEmployees.pagination.totalPages - 4 + i;
                      }
                      if (pageNum <= 0) return null;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "w-10 h-10 rounded-xl text-xs font-bold transition-all border",
                            currentPage === pageNum 
                              ? (isDark ? "bg-emerald-500 text-black border-emerald-500" : "bg-emerald-600 text-white border-emerald-600 shadow-md") 
                              : (isDark ? "bg-white/5 text-stone-500 border-white/10 hover:border-white/20" : "bg-white text-stone-500 border-stone-200 hover:border-stone-300 shadow-sm")
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(paginatedEmployees.pagination.totalPages, prev + 1))}
                    disabled={currentPage === paginatedEmployees.pagination.totalPages || isLoading}
                    className={cn(
                      "p-2 rounded-xl border disabled:opacity-30 transition-all",
                      isDark ? "bg-white/5 hover:bg-white/10 border-white/10" : "bg-white hover:bg-stone-50 border-stone-200 shadow-sm"
                    )}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className={cn(
            "border rounded-[3rem] max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl",
            isDark ? "bg-[#1a1a1a] border-white/10" : "bg-white border-stone-200"
          )}>
            {/* Modal Header */}
            <div className={cn(
              "p-8 border-b flex items-center justify-between",
              isDark ? "border-white/5 bg-white/[0.02]" : "border-stone-100 bg-stone-50"
            )}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <User className={isDark ? "text-black" : "text-white"} size={24} />
                </div>
                <div>
                  <h3 className={cn("text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-stone-900")}>{selectedUser.name}</h3>
                  <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">รหัสพนักงาน: {selectedUser.employeeId}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  isDark ? "bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white" : "bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900"
                )}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: Photo & Score */}
                <div className="space-y-6">
                  <div className={cn(
                    "aspect-square rounded-[2rem] border overflow-hidden relative group",
                    isDark ? "bg-white/5 border-white/10" : "bg-stone-100 border-stone-200"
                  )}>
                    {selectedUser.examInfo?.photoUrl ? (
                      <img 
                        src={selectedUser.examInfo.photoUrl} 
                        alt="รูปภาพพนักงาน" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-stone-600">
                        <User size={64} strokeWidth={1} />
                        <p className="text-xs font-bold uppercase tracking-widest mt-4">ไม่พบรูปภาพ</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                      <p className="text-[10px] font-bold text-white uppercase tracking-widest">บันทึกภาพขณะลงทะเบียน</p>
                    </div>
                  </div>

                  <div className={cn(
                    "p-6 border rounded-[2rem] flex items-center justify-between",
                    isDark ? "bg-white/5 border-white/10" : "bg-stone-50 border-stone-200"
                  )}>
                    <div>
                      <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">คะแนนสุทธิ</p>
                      <h4 className={cn("text-4xl font-bold tracking-tighter", isDark ? "text-white" : "text-stone-900")}>
                        {selectedUser.examInfo?.score || 0} <span className="text-lg text-stone-500 font-medium">/ 20</span>
                      </h4>
                    </div>
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black border",
                      (selectedUser.examInfo?.score || 0) >= 15 
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                    )}>
                      {Math.round(((selectedUser.examInfo?.score || 0) / 20) * 100)}%
                    </div>
                  </div>
                </div>

                {/* Right: Details & Alerts */}
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className={cn(
                      "text-xs font-bold text-stone-500 uppercase tracking-widest border-b pb-2",
                      isDark ? "border-white/5" : "border-stone-100"
                    )}>ข้อมูลการจ้างงาน</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={cn("p-4 border rounded-2xl", isDark ? "bg-white/5 border-white/5" : "bg-stone-50 border-stone-100")}>
                        <p className="text-[10px] font-bold text-stone-600 uppercase mb-1">ภาค</p>
                        <p className={cn("text-sm font-bold flex items-center gap-2", isDark ? "text-white" : "text-stone-900")}>
                          <MapPin size={14} className="text-emerald-500" /> {selectedUser.region}
                        </p>
                      </div>
                      <div className={cn("p-4 border rounded-2xl", isDark ? "bg-white/5 border-white/5" : "bg-stone-50 border-stone-100")}>
                        <p className="text-[10px] font-bold text-stone-600 uppercase mb-1">สาขา</p>
                        <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-stone-900")}>{selectedUser.branch || "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className={cn(
                      "text-xs font-bold text-stone-500 uppercase tracking-widest border-b pb-2",
                      isDark ? "border-white/5" : "border-stone-100"
                    )}>ข้อมูลการสอบ</h4>
                    <div className="space-y-3">
                      <div className={cn("flex items-center justify-between p-4 border rounded-2xl", isDark ? "bg-white/5 border-white/5" : "bg-stone-50 border-stone-100")}>
                        <div className="flex items-center gap-3">
                          <Calendar size={16} className="text-blue-400" />
                          <span className="text-xs font-bold text-stone-400">วันที่</span>
                        </div>
                        <span className={cn("text-xs font-bold", isDark ? "text-white" : "text-stone-900")}>{selectedUser.examInfo?.timestamp || "-"}</span>
                      </div>
                      <div className={cn("flex items-center justify-between p-4 border rounded-2xl", isDark ? "bg-white/5 border-white/5" : "bg-stone-50 border-stone-100")}>
                        <div className="flex items-center gap-3">
                          <ClockIcon size={16} className="text-orange-400" />
                          <span className="text-xs font-bold text-stone-400">เวลาที่ใช้</span>
                        </div>
                        <span className={cn("text-xs font-bold", isDark ? "text-white" : "text-stone-900")}>{selectedUser.examInfo?.timeSpent || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className={cn(
                      "text-xs font-bold text-stone-500 uppercase tracking-widest border-b pb-2",
                      isDark ? "border-white/5" : "border-stone-100"
                    )}>การแจ้งเตือนจากระบบ</h4>
                    <div className={cn(
                      "p-6 rounded-[2rem] border flex items-center gap-4",
                      Number(selectedUser.examInfo?.tabSwitches || 0) > 0 
                        ? "bg-red-500/10 border-red-500/20 text-red-400" 
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    )}>
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        Number(selectedUser.examInfo?.tabSwitches || 0) > 0 ? "bg-red-500/20" : "bg-emerald-500/20"
                      )}>
                        {Number(selectedUser.examInfo?.tabSwitches || 0) > 0 ? <AlertCircle size={24} /> : <ShieldCheck size={24} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{Number(selectedUser.examInfo?.tabSwitches || 0) > 0 ? `ตรวจพบการสลับหน้าจอ ${selectedUser.examInfo?.tabSwitches} ครั้ง` : "ไม่พบพฤติกรรมน่าสงสัย"}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                          {Number(selectedUser.examInfo?.tabSwitches || 0) > 0 ? "อาจมีการทุจริต" : "ตรวจสอบความถูกต้องแล้ว"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={cn(
              "p-8 border-t flex justify-end gap-4",
              isDark ? "border-white/5 bg-white/[0.02]" : "border-stone-100 bg-stone-50"
            )}>
              <button 
                onClick={() => setSelectedUser(null)}
                className={cn(
                  "px-8 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all",
                  isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-stone-200 hover:bg-stone-300 text-stone-700"
                )}
              >
                ปิด
              </button>
              {selectedUser.examInfo?.pdfUrl && (
                <a 
                  href={selectedUser.examInfo.pdfUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-8 py-3 bg-emerald-500 text-black hover:bg-emerald-400 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <FileText size={16} /> ดูไฟล์ PDF
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className={cn(
            "border rounded-[3rem] max-w-lg w-full overflow-hidden flex flex-col shadow-2xl",
            isDark ? "bg-[#1a1a1a] border-white/10" : "bg-white border-stone-200"
          )}>
            <div className={cn(
              "p-8 border-b flex items-center justify-between",
              isDark ? "border-white/5 bg-white/[0.02]" : "border-stone-100 bg-stone-50"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all",
                  isDark ? "bg-stone-800 shadow-black/20" : "bg-stone-100 shadow-stone-200"
                )}>
                  <Settings className="text-black" size={24} />
                </div>
                <div>
                  <h3 className={cn("text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-stone-900")}>ตั้งค่าระบบ</h3>
                  <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">การกำหนดค่าส่วนกลาง</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                  isDark ? "bg-white/5 hover:bg-white/10 text-stone-400 hover:text-white" : "bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900"
                )}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Registration Status */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">สถานะการลงทะเบียน</label>
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => onToggleRegistration("OPEN")}
                    className={cn(
                      "py-4 rounded-2xl font-bold text-sm transition-all border",
                      systemStatus.registrationStatus === "OPEN" 
                        ? "bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20" 
                        : (isDark ? "bg-white/5 text-stone-500 border-white/5 hover:border-white/10" : "bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100")
                    )}
                  >
                    เปิด
                  </button>
                  <button 
                    onClick={() => onToggleRegistration("CLOSED")}
                    className={cn(
                      "py-4 rounded-2xl font-bold text-sm transition-all border",
                      systemStatus.registrationStatus === "CLOSED" 
                        ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20" 
                        : (isDark ? "bg-white/5 text-stone-500 border-white/5 hover:border-white/10" : "bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100")
                    )}
                  >
                    ปิด
                  </button>
                </div>
              </div>

              {/* Announcement */}
              <div className="space-y-4">
                <label className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">ประกาศส่วนกลาง</label>
                <textarea 
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder="กรอกข้อความประกาศ..."
                  className={cn(
                    "w-full h-32 p-6 border rounded-[2rem] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all resize-none",
                    isDark ? "bg-white/5 border-white/10 text-white" : "bg-stone-50 border-stone-200 text-stone-900"
                  )}
                />
                <button 
                  onClick={async () => {
                    await onUpdateAnnouncement(announcementText);
                    setShowSettings(false);
                  }}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg",
                    isDark ? "bg-white text-black hover:bg-stone-200 shadow-white/10" : "bg-stone-900 text-white hover:bg-stone-800 shadow-stone-900/20"
                  )}
                >
                  บันทึกประกาศ
                </button>
              </div>
            </div>

            <div className={cn(
              "p-8 border-t flex justify-center",
              isDark ? "border-white/5 bg-white/[0.02]" : "border-stone-100 bg-stone-50"
            )}>
              <p className="text-[10px] font-bold text-stone-600 uppercase tracking-widest">การเปลี่ยนแปลงจะมีผลทันทีสำหรับผู้ใช้ทุกคน</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
