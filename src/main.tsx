import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

window.onerror = function(message, source, lineno, colno, error) {
  console.error("Runtime Error:", message, error);
  const root = document.getElementById('root');
  if (root && root.innerHTML.includes('Loading')) {
    root.innerHTML = `<div style="padding: 40px; text-align: center; font-family: sans-serif;">
      <h1 style="color: #ef4444;">ขออภัย เกิดข้อผิดพลาด</h1>
      <p style="color: #71717a;">ระบบไม่สามารถเริ่มต้นได้ กรุณาลองรีเฟรชหน้าจอ</p>
      <button onclick="localStorage.clear(); location.reload();" style="margin-top: 20px; padding: 10px 20px; background: #18181b; color: white; border: none; border-radius: 8px; cursor: pointer;">
        ล้างข้อมูลและเริ่มใหม่
      </button>
      <div style="margin-top: 40px; font-size: 10px; color: #a1a1aa; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto; overflow: auto;">
        ${message}<br/>${error?.stack}
      </div>
    </div>`;
  }
};

createRoot(document.getElementById('root')!).render(
  <App />
);
