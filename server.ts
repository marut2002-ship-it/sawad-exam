import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log(`Starting server in ${process.env.NODE_ENV || 'development'} mode`);
  app.use(express.json({ limit: '50mb' }));

  // Google Sheets Auth
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || "1tUuhWn3LSqx1wWDS2YDuc8HEYB5ekX55_XDp6z3gLK0";
  const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby5GMhFqzQrXxTPpoVXTc9YH383XHtCiyZMhKePjTAXx9-4lm1H4rbeorJc_rzgTeWI/exec";

  const fetchGAS = async (url: string, options: any = {}) => {
    try {
      const response = await fetch(url, {
        ...options,
        redirect: 'follow'
      });
      
      const text = await response.text();
      
      if (!response.ok) {
        throw new Error(`GAS Error (${response.status})`);
      }

      // Check for HTML (indicates error/login page)
      if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
        throw new Error("GAS_RETURNED_HTML");
      }

      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error("INVALID_JSON_RESPONSE");
      }
    } catch (error) {
      console.error("fetchGAS failed:", error);
      throw error;
    }
  };

  // API Routes
  app.get("/api/version", async (req, res) => {
    try {
      const SCRIPT_URL = process.env.VITE_GAS_URL || DEFAULT_SCRIPT_URL;
      if (SCRIPT_URL) {
        const data = await fetchGAS(`${SCRIPT_URL}?action=getVersion`);
        return res.json(data);
      }
      res.json({ version: "1.1.0" });
    } catch (error) {
      res.json({ version: "1.1.0 (Error)" });
    }
  });

  app.get("/api/status", async (req, res) => {
    try {
      const SCRIPT_URL = process.env.VITE_GAS_URL || DEFAULT_SCRIPT_URL;
      if (SCRIPT_URL) {
        const data = await fetchGAS(`${SCRIPT_URL}?action=getSystemStatus`);
        return res.json(data);
      }
      res.json({ regStatus: "OPEN", announcement: "ยินดีต้อนรับสู่ระบบทดสอบความรู้" });
    } catch (error) {
      res.json({ regStatus: "OPEN", announcement: "ยินดีต้อนรับสู่ระบบทดสอบความรู้" });
    }
  });

  app.get("/api/employees", async (req, res) => {
    try {
      const SCRIPT_URL = process.env.VITE_GAS_URL || DEFAULT_SCRIPT_URL;
      console.log("Fetching employees...");
      if (SCRIPT_URL) {
        const data = await fetchGAS(`${SCRIPT_URL}?action=getEmployees`);
        console.log(`Fetched ${data.data?.length || 0} employees from GAS`);
        return res.json(data.data || []);
      }

      if (SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: 'DB!A2:J',
        });
        const rows = response.data.values || [];
        const employees = rows.map(row => ({
          id: row[0],
          prefix: row[1],
          firstName: row[2],
          lastName: row[3],
          nickname: row[4],
          position: row[5],
          branch: row[6],
          branchShort: row[7],
          zone: row[8],
          region: row[9],
        }));
        return res.json(employees);
      }
      
      // Fallback to mock data if no config
      res.json([
        { id: "EMP001", prefix: "นาย", firstName: "สมชาย", lastName: "ใจดี", nickname: "ชาย", position: "พนักงานขาย", branch: "กรุงเทพ", branchShort: "BKK", zone: "1", region: "กลาง" },
        { id: "EMP002", prefix: "นางสาว", firstName: "สมศรี", lastName: "มีสุข", nickname: "ศรี", position: "แคชเชียร์", branch: "เชียงใหม่", branchShort: "CNX", zone: "2", region: "เหนือ" },
      ]);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.json([
        { id: "EMP001", prefix: "นาย", firstName: "สมชาย", lastName: "ใจดี", nickname: "ชาย", position: "พนักงานขาย", branch: "กรุงเทพ", branchShort: "BKK", zone: "1", region: "กลาง" },
      ]);
    }
  });

  app.get("/api/questions", async (req, res) => {
    try {
      const SCRIPT_URL = process.env.VITE_GAS_URL || DEFAULT_SCRIPT_URL;
      console.log("Fetching questions...");
      if (SCRIPT_URL) {
        const data = await fetchGAS(`${SCRIPT_URL}?action=getQuestions`);
        console.log(`Fetched ${data.data?.length || 0} questions from GAS`);
        return res.json(data.data || []);
      }

      if (SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: 'ข้อสอบ!A2:M',
        });
        const rows = response.data.values || [];
        const questions = rows.map(row => ({
          id: row[0],
          category: row[1],
          level: String(row[3]), // Column D
          topic: String(row[4]), // Column E
          text: String(row[5]),  // Column F
          options: {
            A: String(row[6]),   // Column G
            B: String(row[7]),   // Column H
            C: String(row[8]),   // Column I
            D: String(row[9]),   // Column J
          },
          answer: String(row[10]),      // Column K
          explanation: String(row[11]), // Column L
          image: String(row[12]),        // Column M
          explanationImage: String(row[13] || ""), // Column N
        }));
        return res.json(questions);
      }

      // Fallback to mock data
      res.json([
        { id: 1, category: "ทั่วไป", level: "ง่าย", text: "1 + 1 เท่ากับเท่าไหร่?", options: { A: "1", B: "2", C: "3", D: "4" }, answer: "B", explanation: "พื้นฐานคณิตศาสตร์" },
        { id: 2, category: "ทั่วไป", level: "ง่าย", text: "สีของท้องฟ้าในวันสดใสคือสีอะไร?", options: { A: "แดง", B: "เขียว", C: "ฟ้า", D: "เหลือง" }, answer: "C", explanation: "ความรู้รอบตัว" },
      ]);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.json([
        { id: 1, category: "ทั่วไป", level: "ง่าย", text: "1 + 1 เท่ากับเท่าไหร่?", options: { A: "1", B: "2", C: "3", D: "4" }, answer: "B", explanation: "พื้นฐานคณิตศาสตร์" },
      ]);
    }
  });

  app.post("/api/results", async (req, res) => {
    try {
      const result = req.body;
      const SCRIPT_URL = process.env.VITE_GAS_URL || DEFAULT_SCRIPT_URL;
      
      console.log(`Saving results for ${result.employeeId}...`);

      if (SCRIPT_URL) {
        const payload = {
          action: 'submitExam',
          ...result
        };
        const data = await fetchGAS(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        console.log("GAS Response:", data);
        return res.json(data);
      }

      if (SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: 'ผลการสอบ!A2',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              result.timestamp,
              result.score,
              result.employeeId,
              result.prefix,
              result.firstName,
              result.lastName,
              result.nickname,
              result.position,
              result.branch,
              result.zone,
              result.region,
              result.email
            ]]
          }
        });
        return res.json({ success: true });
      }
      
      console.log("No Google Sheets config found, result logged to console only.");
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving results:", error);
      res.status(500).json({ success: false });
    }
  });

  // Admin Routes
  app.get("/api/admin/overview", async (req, res) => {
    try {
      const { pin } = req.query;
      const SCRIPT_URL = process.env.VITE_GAS_URL || DEFAULT_SCRIPT_URL;
      if (SCRIPT_URL) {
        // Use POST for admin data to avoid query string issues and improve reliability
        const data = await fetchGAS(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'getAdminOverview', pin })
        });
        return res.json(data);
      }
      res.status(404).json({ success: false, message: "GAS not configured" });
    } catch (error) {
      console.error("Admin overview error:", error);
      res.status(500).json({ success: false });
    }
  });

  app.get("/api/admin/employee-list", async (req, res) => {
    try {
      const { pin, page, pageSize, search, region, zone } = req.query;
      const SCRIPT_URL = process.env.VITE_GAS_URL || DEFAULT_SCRIPT_URL;
      if (SCRIPT_URL) {
        // Use POST for admin data to avoid query string issues and improve reliability
        const data = await fetchGAS(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ 
            action: 'getEmployeeList', 
            pin, 
            page: Number(page || 1), 
            pageSize: Number(pageSize || 20), 
            search: String(search || ""),
            region: String(region || ""),
            zone: String(zone || "")
          })
        });
        return res.json(data);
      }
      res.status(404).json({ success: false, message: "GAS not configured" });
    } catch (error) {
      console.error("Admin employee list error:", error);
      res.status(500).json({ success: false });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { pin } = req.body;
      const SCRIPT_URL = process.env.VITE_GAS_URL || DEFAULT_SCRIPT_URL;
      
      // Try to verify via GAS first
      if (SCRIPT_URL) {
        // Use POST for login to avoid query string issues and improve reliability
        const data = await fetchGAS(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'adminLogin', pin })
        });
        // GAS returns { success: true, role: '...', results: [], stats: [] }
        if (data.success) {
          return res.json({
            status: "success",
            role: data.role,
            results: data.results || [],
            questionStats: data.stats || []
          });
        }
      }

      // Fallback: Check hardcoded PINs or Env vars
      const ADMIN_PIN = process.env.ADMIN_PIN || "123456";
      const FACILITATOR_PIN = process.env.FACILITATOR_PIN || "111111";

      if (pin === ADMIN_PIN) {
        // Mock data for admin
        return res.json({
          status: "success",
          role: "admin",
          results: [], // In a real app, fetch from Sheets
          questionStats: []
        });
      } else if (pin === FACILITATOR_PIN) {
        return res.json({
          status: "success",
          role: "facilitator",
          results: [],
          questionStats: []
        });
      }

      res.status(401).json({ status: "error", message: "Invalid PIN" });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ status: "error" });
    }
  });

  app.post("/api/admin/reset", async (req, res) => {
    try {
      const { employeeId, pin } = req.body;
      // Verification logic...
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error" });
    }
  });

  app.post("/api/admin/toggle-reg", async (req, res) => {
    try {
      const { status, pin } = req.body;
      const SCRIPT_URL = process.env.VITE_GAS_URL || DEFAULT_SCRIPT_URL;
      
      if (SCRIPT_URL) {
        const data = await fetchGAS(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'toggleRegistration', status, pin })
        });
        return res.json(data);
      }
      
      res.json({ status: "success", registrationStatus: status });
    } catch (error) {
      console.error("Toggle registration error:", error);
      res.status(500).json({ status: "error", message: error instanceof Error ? error.message : "Internal Server Error" });
    }
  });

  app.post("/api/admin/update-announcement", async (req, res) => {
    try {
      const { announcement, pin } = req.body;
      const SCRIPT_URL = process.env.VITE_GAS_URL || DEFAULT_SCRIPT_URL;
      
      if (SCRIPT_URL) {
        const data = await fetchGAS(SCRIPT_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'updateAnnouncement', announcement, pin })
        });
        return res.json(data);
      }
      
      res.json({ status: "success", announcement });
    } catch (error) {
      console.error("Update announcement error:", error);
      res.status(500).json({ status: "error", message: error instanceof Error ? error.message : "Internal Server Error" });
    }
  });

  app.get("/api/admin/export/excel", async (req, res) => {
    try {
      const SCRIPT_URL = process.env.VITE_GAS_URL || DEFAULT_SCRIPT_URL;
      if (SCRIPT_URL) {
        // Redirect to GAS export URL
        return res.redirect(`${SCRIPT_URL}?action=exportExcel`);
      }
      res.status(404).send("Export service not configured");
    } catch (error) {
      res.status(500).send("Export failed");
    }
  });

  app.get("/api/admin/export/pdf", async (req, res) => {
    try {
      const SCRIPT_URL = process.env.VITE_GAS_URL || DEFAULT_SCRIPT_URL;
      if (SCRIPT_URL) {
        // Redirect to GAS export URL
        return res.redirect(`${SCRIPT_URL}?action=exportPdf`);
      }
      res.status(404).send("Export service not configured");
    } catch (error) {
      res.status(500).send("Export failed");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
