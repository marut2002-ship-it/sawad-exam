import { Shield, Check, X } from "lucide-react";

interface PDPAConsentProps {
  onConfirm: (consent: "ยินยอม" | "ไม่ยินยอม") => void;
}

export function PDPAConsent({ onConfirm }: PDPAConsentProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mb-4">
          <Shield size={32} />
        </div>
        <h2 className="text-3xl font-bold">คำยินยอมการเปิดเผยผลสอบ PDPA</h2>
        <p className="text-stone-500">โปรดอ่านและทำความเข้าใจนโยบายการคุ้มครองข้อมูลส่วนบุคคล</p>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-3xl border border-stone-200 shadow-sm space-y-6">
        <div className="prose prose-stone max-w-none">
          <p className="text-lg leading-relaxed text-stone-700 whitespace-pre-line">
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;เพื่อให้เป็นไปตามนโยบาย คุ้มครองข้อมูลส่วนบุคคล บริษัทขออนุญาต ประกาศผลการทดสอบผ่านห้องเรียนทันใจ เพื่อประกาศผลสอบให้ผู้ทดสอบทราบ ลดปัญหาข้อมูลตกหล่นจากการส่งข้อมูลผ่านอีเมลส่วนตัวของผู้เข้าสอบ และอำนวยความสะดวก ให้ผู้มีส่วนเกี่ยวข้อง เช่น ผู้จัดการภาค ผู้จัดการเขต ฝ่ายฝึกอบรม และวิทยากรประจำพื้นที่ สามารถเข้าถึงผลการทดสอบ เพื่อนำไปใช้วางแผนพัฒนาพนักงานในพื้นที่ต่อไป
            {"\n\n"}
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;เมื่อผู้เข้าทดสอบ รับรู้ข้อมูลดังกล่าว เรียบร้อยแล้ว ขอให้กด "ยินยอม" เพื่อทีมฝึกอบรม จะได้ประกาศผลการทดสอบผ่านห้องเรียนทันใจ ต่อไป
            {"\n\n"}
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;กรณี "ไม่ยินยอม" บริษัท จะส่งข้อมูลไปยังอีเมลส่วนตัวที่ลงทะเบียนไว้ ซึ่งอาจทำให้ข้อมูล ตกหล่น หรืออาจเกิดข้อผิดพลาด ไปไม่ถึง ผู้เข้ารับการทดสอบ ดังนั้นทีมฝึกอบรม จะส่ง ข้อมูลภาพรวมไปยังผู้จัดการภาค ซึ่งพนักงานสามารถขอผลการทดสอบ จากผู้จัดการภาค ได้โดยตรง
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
          <button
            onClick={() => onConfirm("ไม่ยินยอม")}
            className="flex items-center justify-center gap-2 py-4 px-6 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all active:scale-95"
          >
            <X size={20} /> ไม่ยินยอม
          </button>
          <button
            onClick={() => onConfirm("ยินยอม")}
            className="flex items-center justify-center gap-2 py-4 px-6 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 active:scale-95"
          >
            <Check size={20} /> ยินยอม
          </button>
        </div>
      </div>
    </div>
  );
}
