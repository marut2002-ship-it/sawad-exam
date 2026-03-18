import { useRef, useState } from "react";
import { Download, CheckCircle2, FileText, Share2, Loader2, XCircle, AlertCircle } from "lucide-react";
import { ExamResult } from "../types";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getImageUrl = (input: string) => {
  if (!input) return "";
  const trimmed = input.trim();
  let id = trimmed;
  if (trimmed.startsWith('http')) {
    const idMatch = trimmed.match(/\/d\/([^/]+)/) || trimmed.match(/id=([^&]+)/);
    if (idMatch) id = idMatch[1];
    else return trimmed;
  }
  return `https://lh3.googleusercontent.com/d/${id}`;
};

interface ResultProps {
  result: ExamResult;
}

export function Result({ result }: ResultProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const percentage = Math.round((result.score / result.totalQuestions) * 100);

  const getGrade = (p: number) => {
    if (p >= 80) return { label: "A", color: "text-emerald-600", bg: "bg-emerald-50" };
    if (p >= 70) return { label: "B", color: "text-blue-600", bg: "bg-blue-50" };
    if (p >= 60) return { label: "C", color: "text-yellow-600", bg: "bg-yellow-50" };
    if (p >= 50) return { label: "D", color: "text-orange-600", bg: "bg-orange-50" };
    return { label: "E", color: "text-red-600", bg: "bg-red-50" };
  };

  const grade = getGrade(percentage);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
      pdf.save(`Proof_of_Submission_${result.employeeId}.pdf`);
    } catch (error) {
      console.error("Download failed", error);
      alert("เกิดข้อผิดพลาดในการดาวน์โหลด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-in zoom-in duration-500">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-stone-900">ส่งคำตอบเรียบร้อยแล้ว!</h2>
          <p className="text-stone-500">ขอบคุณสำหรับการเข้าทดสอบความรู้ในครั้งนี้</p>
        </div>
      </div>

      {/* Visual Result Card */}
      <div ref={cardRef} className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-8 md:p-12 text-center space-y-8">
          <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
            <div className="space-y-2">
              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">คะแนนของคุณ</p>
              <div className="text-6xl font-bold text-stone-900">
                {result.score}<span className="text-2xl text-stone-300">/{result.totalQuestions}</span>
              </div>
            </div>
            <div className="w-px h-16 bg-stone-100 hidden md:block" />
            <div className="space-y-2">
              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">เกรดที่ได้</p>
              <div className={`text-6xl font-bold ${grade.color}`}>
                {grade.label}
              </div>
            </div>
          </div>

          <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
            <p className="text-stone-600 font-medium">
              ระบบได้รับคำตอบของคุณเรียบร้อยแล้ว <br />
              <span className="text-emerald-600 font-bold">ผลการสอบแบบละเอียดถูกส่งไปยังระบบเรียบร้อยแล้ว</span> <br />
              <span className="text-stone-500 text-sm mt-2 block">และจะส่งเมลให้ในวันที่ 24 มีนาคม 2569 เวลา 15.00 น.</span>
            </p>
          </div>

          <div className="pt-4 text-stone-400 text-sm italic">
            คุณสามารถปิดหน้าต่างนี้ได้ทันที หรือดาวน์โหลดเก็บไว้เป็นหลักฐาน
          </div>
        </div>

        <div className="bg-stone-900 p-6 text-center text-xs text-stone-400">
          ID: {result.employeeId} • {result.firstName} {result.lastName} • {result.timestamp}
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-center gap-4">
        {result.pdfUrl && (
          <a
            href={result.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
          >
            <FileText size={20} /> ดูรายงานผลการสอบ (PDF)
          </a>
        )}
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center justify-center gap-2 px-8 py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          {isDownloading ? (
            <>
              <Loader2 size={20} className="animate-spin" /> กำลังเตรียมไฟล์...
            </>
          ) : (
            <>
              <Download size={20} /> ดาวน์โหลดหลักฐานการส่ง
            </>
          )}
        </button>
      </div>
    </div>
  );
}
