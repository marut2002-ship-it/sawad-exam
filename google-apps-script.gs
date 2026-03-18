/**
 * Google Apps Script API for ExamPro
 * VERSION: 2.1.2 (Project Spyglass - Official Edition)
 * 
 * วิธีแก้ไขข้อผิดพลาด "存取遭拒：DriveApp" (Access denied: DriveApp):
 * 1. ตรวจสอบว่าได้เปิดใช้งาน Google Drive API ใน Google Cloud Project แล้วหรือยัง
 * 2. ตรวจสอบไฟล์ appsscript.json ว่ามี scopes ต่อไปนี้หรือไม่:
 *    - https://www.googleapis.com/auth/drive
 *    - https://www.googleapis.com/auth/drive.file
 * 3. ทำการ Deploy ใหม่ (New Deployment) และเลือก "Execute as: Me" และ "Who has access: Anyone"
 * 4. ตรวจสอบว่า Folder ID ที่ระบุในฟังก์ชัน savePhoto และ createPdf นั้นคุณมีสิทธิ์เข้าถึง (Owner หรือ Editor)
 *    หากไม่มีสิทธิ์ ระบบจะพยายามบันทึกไฟล์ลงใน Root Folder ของคุณแทน
 */

var VERSION = "2.1.2";

// --- Helper Functions ---

function checkDriveAccess() {
  try {
    DriveApp.getRootFolder();
    return true;
  } catch (e) {
    console.error("DriveApp Access Denied: " + e.toString());
    return false;
  }
}

function cleanValue(val) {
  var s = String(val || "").trim();
  return s === "" ? "-" : s;
}

function getConfigMap() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Config');
  if (!sheet) return { 'REG_STATUS': 'OPEN' }; // Default to OPEN if no config sheet
  var data = sheet.getDataRange().getValues();
  var config = { 'REG_STATUS': 'OPEN' }; // Default to OPEN
  for (var i = 1; i < data.length; i++) {
    config[data[i][0]] = data[i][1];
  }
  return config;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- Main Functions ---

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss) {
    return createJsonResponse({ success: false, error: "ไม่พบ Spreadsheet กรุณาตรวจสอบว่าสคริปต์ถูกผูกไว้กับ Sheet หรือไม่ (Bound Script)" });
  }
  
  var config = getConfigMap();
  
  // 1. ดึงเวอร์ชัน
  if (action == 'getVersion') {
    return createJsonResponse({ version: VERSION, driveAccess: checkDriveAccess() });
  }

  // 2. ดึงสถานะระบบ (สำหรับหน้าแรก)
  if (action == 'getSystemStatus') {
    return createJsonResponse({
      version: VERSION,
      regStatus: config['REG_STATUS'] || 'OPEN',
      announcement: config['ANNOUNCEMENT'] || '-'
    });
  }

  // 2. ดึงข้อมูลพนักงาน (ดึงทั้งหมด - ใช้สำหรับ Cache ในบางกรณี)
  if (action == 'getEmployees') {
    var sheet = ss.getSheetByName('DB');
    if (!sheet) return createJsonResponse({ error: 'Sheet DB not found' });
    var data = sheet.getDataRange().getValues();
    var rows = data.slice(1);
    var result = rows.map(function(row) {
      return {
        id: cleanValue(row[0]), 
        prefix: cleanValue(row[1]), 
        firstName: cleanValue(row[2]), 
        lastName: cleanValue(row[3]),
        nickname: cleanValue(row[4]), 
        position: cleanValue(row[5]), 
        branch: cleanValue(row[6]),
        branchShort: cleanValue(row[7]), 
        zone: cleanValue(row[9]), // Column J
        region: cleanValue(row[10]), // Column K
        isManager: cleanValue(row[11]) === 'Y'
      };
    });
    return createJsonResponse({ data: result });
  }
  
  // 3. ดึงข้อสอบ
  if (action == 'getQuestions') {
    var sheet = ss.getSheetByName('ข้อสอบ');
    if (!sheet) return createJsonResponse({ error: 'Sheet ข้อสอบ not found' });
    var data = sheet.getDataRange().getValues();
    var rows = data.slice(1);
    var result = rows.map(function(row) {
      return {
        id: row[0], category: cleanValue(row[1]), level: cleanValue(row[3]),
        topic: cleanValue(row[4]), text: cleanValue(row[5]),
        options: { A: cleanValue(row[6]), B: cleanValue(row[7]), C: cleanValue(row[8]), D: cleanValue(row[9]) },
        answer: cleanValue(row[10]), explanation: cleanValue(row[11]),
        image: cleanValue(row[12]), explanationImage: cleanValue(row[13])
      };
    });
    return createJsonResponse({ data: result });
  }

  // 4. Admin Overview (โหลดเฉพาะสถิติสรุป - เร็วมาก)
  if (action == 'getAdminOverview') {
    var pin = e.parameter.pin;
    if (String(pin) !== String(config['PIN_ADMIN']) && String(pin) !== String(config['PIN_FACILITATOR'])) {
      return createJsonResponse({ success: false, message: 'Unauthorized' });
    }

    var resSheet = ss.getSheetByName('ผลการสอบ');
    var resData = resSheet ? resSheet.getDataRange().getValues() : [];
    var totalCompleted = Math.max(0, resData.length - 1);
    
    var totalScore = 0;
    if (totalCompleted > 0) {
      resData.slice(1).forEach(function(row) { totalScore += Number(row[1] || 0); });
    }

    var dbSheet = ss.getSheetByName('DB');
    var totalEmployees = dbSheet ? dbSheet.getLastRow() - 1 : 0;

    return createJsonResponse({
      success: true,
      stats: {
        totalEmployees: totalEmployees,
        completed: totalCompleted,
        avgScore: totalCompleted > 0 ? (totalScore / totalCompleted) : 0
      },
      questionStats: getQuestionStats()
    });
  }

  // 5. Employee List with Pagination & Search (ดึงทีละ 20 คน - ประหยัดทรัพยากร)
  if (action == 'getEmployeeList') {
    var pin = e.parameter.pin;
    if (String(pin) !== String(config['PIN_ADMIN']) && String(pin) !== String(config['PIN_FACILITATOR'])) {
      return createJsonResponse({ success: false, message: 'Unauthorized' });
    }

    var page = parseInt(e.parameter.page || 1);
    var pageSize = parseInt(e.parameter.pageSize || 20);
    var search = (e.parameter.search || "").toLowerCase();
    
    var dbSheet = ss.getSheetByName('DB');
    var dbData = dbSheet.getDataRange().getValues().slice(1);
    
    // กรองข้อมูลตามคำค้นหา
    var filtered = dbData.filter(function(row) {
      if (!search) return true;
      var fullName = (row[2] + " " + row[3]).toLowerCase();
      var id = String(row[0]).toLowerCase();
      return fullName.indexOf(search) > -1 || id.indexOf(search) > -1;
    });

    var totalFiltered = filtered.length;
    var start = (page - 1) * pageSize;
    var pagedData = filtered.slice(start, start + pageSize);

    // ดึงข้อมูลผลสอบมาเช็คสถานะ (เฉพาะคนที่อยู่ในหน้านี้)
    var resSheet = ss.getSheetByName('ผลการสอบ');
    var resData = resSheet ? resSheet.getDataRange().getValues() : [];
    var resultMap = {};
    if (resData.length > 1) {
      resData.slice(1).forEach(function(row) {
        resultMap[String(row[2])] = {
          score: row[1],
          timestamp: row[0],
          pdfUrl: row[12],
          photoUrl: row[13],
          tabSwitches: row[15],
          timeSpent: row[16],
          status: row[17] || "Completed"
        };
      });
    }

    var finalData = pagedData.map(function(row) {
      var empId = String(row[0]);
      var examInfo = resultMap[empId] || null;
      return {
        employeeId: empId,
        name: row[1] + row[2] + " " + row[3],
        nickname: row[4],
        position: row[5],
        branch: row[6],
        zone: row[9], // Column J
        region: row[10], // Column K
        isManager: row[11] === 'Y',
        examInfo: examInfo // ถ้าเป็น null แปลว่ายังไม่ได้สอบ
      };
    });

    return createJsonResponse({
      success: true,
      data: finalData,
      pagination: {
        currentPage: page,
        pageSize: pageSize,
        totalItems: totalFiltered,
        totalPages: Math.ceil(totalFiltered / pageSize)
      }
    });
  }

  // 6. Export
  if (action == 'exportExcel' || action == 'exportPdf') {
    return createJsonResponse({ status: 'success', url: ss.getUrl() });
  }
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!ss) {
    return createJsonResponse({ success: false, error: "ไม่พบ Spreadsheet กรุณาตรวจสอบว่าสคริปต์ถูกผูกไว้กับ Sheet หรือไม่ (Bound Script)" });
  }
  
  var config = getConfigMap();
  
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    // --- Admin Data Fetching (New: Support POST for reliability) ---
    
    if (action === 'getAdminOverview') {
      var pin = data.pin;
      if (String(pin) !== String(config['PIN_ADMIN']) && String(pin) !== String(config['PIN_FACILITATOR'])) {
        return createJsonResponse({ success: false, message: 'Unauthorized' });
      }
      return createJsonResponse(getAdminOverviewData(ss));
    }

    if (action === 'getEmployeeList') {
      var pin = data.pin;
      if (String(pin) !== String(config['PIN_ADMIN']) && String(pin) !== String(config['PIN_FACILITATOR'])) {
        return createJsonResponse({ success: false, message: 'Unauthorized' });
      }
      return createJsonResponse(getEmployeeListData(ss, data.page, data.pageSize, data.search, data.region, data.zone));
    }

    if (action === 'adminLogin') {
      var pin = data.pin;
      var role = "";
      if (String(pin) === String(config['PIN_ADMIN'])) {
        role = "ADMIN";
      } else if (String(pin) === String(config['PIN_FACILITATOR'])) {
        role = "FACILITATOR";
      } else {
        return createJsonResponse({ success: false, message: 'Invalid PIN' });
      }

      // Fast login: just return role, let dashboard fetch data separately
      return createJsonResponse({
        success: true,
        role: role,
        results: [],
        stats: []
      });
    }

    // 3. คำสั่งเปลี่ยนสถานะลงทะเบียน
    if (action === 'toggleRegistration') {
      var pin = data.pin;
      if (String(pin) !== String(config['PIN_ADMIN'])) {
        return createJsonResponse({ status: 'error', message: 'Unauthorized' });
      }
      var status = data.status;
      var confSheet = ss.getSheetByName('Config');
      var confData = confSheet.getDataRange().getValues();
      for (var i = 1; i < confData.length; i++) {
        if (confData[i][0] === 'REG_STATUS') {
          confSheet.getRange(i + 1, 2).setValue(status);
          break;
        }
      }
      return createJsonResponse({ status: 'success', registrationStatus: status });
    }

    // 4. อัปเดตประกาศ
    if (action === 'updateAnnouncement') {
      var pin = data.pin;
      if (String(pin) !== String(config['PIN_ADMIN'])) {
        return createJsonResponse({ status: 'error', message: 'Unauthorized' });
      }
      var text = data.announcement;
      var confSheet = ss.getSheetByName('Config');
      var confData = confSheet.getDataRange().getValues();
      for (var i = 1; i < confData.length; i++) {
        if (confData[i][0] === 'ANNOUNCEMENT') {
          confSheet.getRange(i + 1, 2).setValue(text);
          break;
        }
      }
      return createJsonResponse({ status: 'success', announcement: text });
    }

    // 1. คำสั่ง Submit ข้อสอบ (พนักงาน)
    if (action === 'submitExam') {
      var sheetName = 'ผลการสอบ';
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        try {
          sheet = ss.insertSheet(sheetName);
          sheet.appendRow(['Timestamp', 'Score', 'EmployeeID', 'Prefix', 'FirstName', 'LastName', 'Nickname', 'Position', 'Branch', 'Zone', 'Region', 'Email', 'PDF', 'Photo', 'PDPA', 'TabSwitches', 'TimeSpent', 'Status', 'DeviceLog', 'RawData']);
        } catch (e) {
          return createJsonResponse({ success: false, error: "ไม่สามารถสร้าง Sheet '" + sheetName + "' ได้: " + e.toString() });
        }
      }
      
      var fileNameBase = "Result_" + data.employeeId + "_" + data.firstName + "_" + new Date().getTime();
      
      var photoUrl = "";
      if (data.photo) {
        photoUrl = savePhoto(data.photo, fileNameBase + ".jpg");
      }

      var pdfUrl = createPdf(data, fileNameBase + ".pdf");
      
      var rowData = [
        data.timestamp, data.score, data.employeeId, data.prefix, data.firstName, 
        data.lastName, data.nickname, data.position, data.branch, data.zone, 
        data.region, data.email, pdfUrl, photoUrl, data.pdpaConsent,
        data.tabSwitches || 0,    // P: TabSwitches
        data.timeSpent || "-",    // Q: TimeSpent
        "Completed",              // R: ExamStatus
        data.deviceLog || "-",    // S: DeviceLog
        JSON.stringify(data.results || []) // T: RawData
      ];
      
      try {
        sheet.appendRow(rowData);
      } catch (e) {
        return createJsonResponse({ success: false, error: "ไม่สามารถบันทึกข้อมูลลง Sheet ได้: " + e.toString() });
      }
      
      try {
        if (data.results) updateQuestionStats(data.results);
      } catch (e) {
        console.error("Error updating stats: " + e.toString());
      }
      
      return createJsonResponse({ 
        success: true, 
        pdfUrl: pdfUrl, 
        photoUrl: photoUrl,
        message: (pdfUrl === "" || photoUrl === "") ? "บันทึกข้อมูลสำเร็จ แต่ไม่สามารถสร้างไฟล์ PDF หรือรูปภาพได้เนื่องจากสิทธิ์การเข้าถึง Drive" : "บันทึกข้อมูลสำเร็จ"
      });
    }
    
    // 2. คำสั่ง Reset การสอบ (Admin เท่านั้น)
    if (data.action === 'resetExam') {
      var resSheet = ss.getSheetByName('ผลการสอบ');
      var empId = data.employeeId;
      var rows = resSheet.getDataRange().getValues();
      // ค้นหาและลบ (หรือเปลี่ยนสถานะ)
      for (var i = rows.length - 1; i >= 1; i--) {
        if (String(rows[i][2]) === String(empId)) {
          resSheet.deleteRow(i + 1); // ลบแถวทิ้งเพื่อให้สอบใหม่ได้
        }
      }
      return createJsonResponse({ success: true });
    }

  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

// --- สถิติและ PDF (คงเดิมแต่ปรับปรุงเล็กน้อย) ---

function getQuestionStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('สถิติข้อสอบ');
  if (!sheet) return [];
  return sheet.getDataRange().getValues().slice(1);
}

function savePhoto(base64, name) {
  var folderId = "1DIEXDgAN_jx3zOQrnGbRApUJpFtQbsTJ";
  var folder;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (e) {
    try {
      folder = DriveApp.getRootFolder();
    } catch (err) {
      console.error("Drive Access Denied (savePhoto): " + err.toString());
      return "";
    }
  }
  
  try {
    var blob = Utilities.newBlob(Utilities.base64Decode(base64.split(',')[1]), "image/jpeg", name);
    var file = folder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      console.warn("Could not set sharing for photo: " + e.toString());
    }
    return "https://lh3.googleusercontent.com/d/" + file.getId();
  } catch (e) {
    console.error("Error saving photo file: " + e.toString());
    return "";
  }
}

function createPdf(data, fileName) {
  var folderId = "1Sci9q0TrpNc-bsZCqYSzOvSjPLCBIgyW";
  var folder;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (e) {
    try {
      folder = DriveApp.getRootFolder();
    } catch (err) {
      console.error("Drive Access Denied (createPdf): " + err.toString());
      return "";
    }
  }
  
  // คำนวณเกรด
  var percent = (data.score / data.totalQuestions) * 100;
  var grade = percent >= 80 ? "A" : percent >= 70 ? "B" : percent >= 60 ? "C" : percent >= 50 ? "D" : "E";
  var gradeColor = grade === "A" ? "#27ae60" : grade === "B" ? "#2ecc71" : grade === "C" ? "#f1c40f" : grade === "D" ? "#e67e22" : "#e74c3c";

  var logoData = "";
  try {
    var logoId = "1DZsYNfZZuXvoOb2l0GVmVugLmKzgWDtu";
    var logoBlob = DriveApp.getFileById(logoId).getBlob();
    logoData = "data:" + logoBlob.getContentType() + ";base64," + Utilities.base64Encode(logoBlob.getBytes());
  } catch (e) {
    // Fallback if logo not found
    logoData = "";
  }
  
  var resultsHtml = "";
  if (data.results) {
    data.results.forEach(function(res, idx) {
      var statusColor = res.isCorrect ? "#27ae60" : "#e74c3c";
      var statusText = res.isCorrect ? "ผ่าน" : "ผิด";
      
      var qImgLink = (res.questionImage && res.questionImage !== "-") ? '<div style="margin-top: 8px;"><a href="' + getDriveViewUrl(res.questionImage) + '" style="color: #3498db; text-decoration: none; font-weight: bold; font-size: 14px;">🖼️ คลิกเพื่อดูรูปประกอบโจทย์</a></div>' : "";
      var expImgLink = (res.explanationImage && res.explanationImage !== "-") ? '<div style="margin-top: 8px;"><a href="' + getDriveViewUrl(res.explanationImage) + '" style="color: #e67e22; text-decoration: none; font-weight: bold; font-size: 14px;">💡 คลิกเพื่อดูรูปคำอธิบายเฉลย</a></div>' : "";

      resultsHtml += '<tr style="border-bottom: 1px solid #eee;">' +
        '<td style="padding: 15px; text-align: center; vertical-align: top; font-size: 18px; font-weight: bold; border-right: 1px solid #eee; background-color: #fcfcfc;">' + (idx + 1) + '</td>' +
        '<td style="padding: 15px; vertical-align: top;">' +
          '<div style="font-weight: bold; font-size: 18px; color: #000; margin-bottom: 10px; line-height: 1.4;">' + res.questionText + '</div>' +
          qImgLink +
          '<div style="font-size: 16px; color: #444; margin-bottom: 10px; background-color: #f9f9f9; padding: 12px; border-radius: 8px;">' +
            'คำตอบของคุณ: <span style="font-weight: bold; color: ' + (res.isCorrect ? "#27ae60" : "#e74c3c") + ';">' + res.selectedAnswer + '. ' + res.selectedText + '</span><br>' +
            'คำตอบที่ถูกต้อง: <span style="color: #27ae60; font-weight: bold;">' + res.correctAnswer + '. ' + res.correctText + '</span>' +
          '</div>' +
          '<div style="font-size: 15px; color: #555; border-left: 4px solid #3498db; padding-left: 12px; margin-top: 10px;">' +
            '<b>คำอธิบาย:</b> ' + (res.explanation || "-") +
            expImgLink +
          '</div>' +
        '</td>' +
        '<td style="padding: 15px; text-align: center; vertical-align: middle; font-weight: bold; color: ' + statusColor + '; font-size: 16px;">' + statusText + '</td>' +
      '</tr>';
    });
  }

  var htmlContent = 
    '<html><body style="font-family: \'Sarabun\', sans-serif; color: #000; line-height: 1.6; padding: 0; margin: 0;">' +
    '<div style="width: 100%; height: 15px; background-color: #3498db; margin-bottom: 50px; opacity: 0.2;"></div>' +
    '<div style="padding: 0 50px 50px 50px;">' +
      
      // Header Section
      '<table style="width: 100%; margin-bottom: 40px;"><tr>' +
        '<td style="vertical-align: top;">' +
          '<img src="' + logoData + '" style="height: 80px; margin-bottom: 10px;"><br>' +
          '<span style="font-size: 18px; font-weight: bold; color: #444; letter-spacing: 1px;">Srisawad Leadership Academy</span>' +
        '</td>' +
        '<td style="text-align: right; vertical-align: top;">' +
          '<h1 style="margin: 0; font-size: 32px; color: #2c3e50; font-weight: 900;">รายงานผลการทดสอบ</h1>' +
          '<p style="margin: 8px 0 0; color: #666; font-size: 18px; font-weight: bold;">ID: ' + data.employeeId + ' | วันที่: ' + data.timestamp.split(' ')[0] + '</p>' +
        '</td>' +
      '</tr></table>' +

      '<hr style="border: 0; border-top: 2px solid #3498db; margin-bottom: 40px; opacity: 0.2;">' +

      // Info Section
      '<table style="width: 100%; margin-bottom: 50px; border-collapse: separate; border-spacing: 20px 0;"><tr>' +
        '<td style="width: 62%; vertical-align: top; padding: 0;">' +
          '<div style="border: 1px solid #eee; border-radius: 20px; padding: 35px; background-color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">' +
            '<h3 style="margin: 0 0 25px 0; font-size: 22px; color: #3498db; border-bottom: 2px solid #3498db; padding-bottom: 12px; font-weight: 900;">ข้อมูลผู้เข้าทดสอบ</h3>' +
            '<table style="width: 100%; font-size: 18px; border-collapse: collapse;">' +
              '<tr><td style="padding: 10px 0; color: #666; width: 150px; font-weight: bold;">ชื่อ-นามสกุล:</td><td style="padding: 10px 0; font-weight: 900; color: #000;">' + data.prefix + data.firstName + ' ' + data.lastName + ' (' + data.nickname + ')</td></tr>' +
              '<tr><td style="padding: 10px 0; color: #666; font-weight: bold;">ตำแหน่ง:</td><td style="padding: 10px 0; font-weight: 900; color: #000;">' + data.position + '</td></tr>' +
              '<tr><td style="padding: 10px 0; color: #666; font-weight: bold;">สังกัด:</td><td style="padding: 10px 0; font-weight: 900; color: #000;">' + data.branch + '</td></tr>' +
              '<tr><td style="padding: 10px 0; color: #666; font-weight: bold;">อีเมล:</td><td style="padding: 10px 0; font-weight: 900; color: #000;">' + data.email + '</td></tr>' +
            '</table>' +
          '</div>' +
        '</td>' +
        '<td style="width: 38%; text-align: center; vertical-align: middle; background-color: #fff; border-radius: 20px; padding: 35px; border: 1px solid #eee; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">' +
          '<div style="font-size: 18px; color: #666; margin-bottom: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">คะแนนรวม</div>' +
          '<div style="font-size: 84px; font-weight: 900; color: #000; line-height: 1; margin-bottom: 15px;">' + data.score + '<span style="font-size: 28px; color: #ccc;">/' + data.totalQuestions + '</span></div>' +
          '<div style="margin-top: 40px;">' +
            '<div style="font-size: 18px; color: #666; margin-bottom: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">เกรดที่ได้รับ</div>' +
            '<div style="font-size: 72px; font-weight: 900; color: ' + gradeColor + ';">' + grade + '</div>' +
          '</div>' +
        '</td>' +
      '</tr></table>' +

      // Results Table Header
      '<h2 style="font-size: 24px; color: #2c3e50; margin-bottom: 30px; font-weight: 900; border-left: 10px solid #3498db; padding-left: 20px;">รายละเอียดการตอบคำถามรายข้อ</h2>' +
      
      '<table style="width: 100%; border-collapse: collapse; border: 1px solid #eee;">' +
        '<tr style="background-color: #fff; color: #999; border-bottom: 2px solid #3498db;">' +
          '<th style="padding: 15px; text-align: center; font-size: 16px; font-weight: bold; width: 50px;">#</th>' +
          '<th style="padding: 15px; text-align: left; font-size: 16px; font-weight: bold;">คำถาม และ คำอธิบายคำตอบ</th>' +
          '<th style="padding: 15px; text-align: center; font-size: 16px; font-weight: bold; width: 100px;">ผลลัพธ์</th>' +
        '</tr>' +
        resultsHtml +
      '</table>' +

      // Footer
      '<div style="margin-top: 60px; text-align: center; font-size: 11px; color: #bbb;">' +
        'เอกสารนี้สร้างขึ้นโดยระบบอัตโนมัติ | GAS Version ' + VERSION +
      '</div>' +

    '</div>' +
    '</body></html>';

  var htmlOutput = HtmlService.createHtmlOutput(htmlContent);
  var pdfBlob = htmlOutput.getAs('application/pdf');
  pdfBlob.setName(fileName);
  
  try {
    var file = folder.createFile(pdfBlob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {
      console.warn("Could not set sharing for PDF: " + e.toString());
    }
    return file.getUrl();
  } catch (e) {
    console.error("Error saving PDF file: " + e.toString());
    return "";
  }
}

function getDirectImageUrl(input) {
  if (!input || input.length < 5 || input === "-") return "";
  var id = "";
  if (input.indexOf('lh3.googleusercontent.com') > -1) return input;
  var match = input.match(/\/d\/([^/]+)/) || input.match(/id=([^&]+)/);
  if (match) id = match[1]; else id = input.trim();
  return "https://lh3.googleusercontent.com/d/" + id;
}

function getDriveViewUrl(input) {
  if (!input || input.length < 5 || input === "-") return "";
  var id = input.trim();
  if (input.indexOf('http') > -1) {
    var match = input.match(/\/d\/([^/]+)/) || input.match(/id=([^&]+)/);
    if (match) id = match[1]; else return input;
  }
  return "https://drive.google.com/file/d/" + id + "/view";
}

function updateQuestionStats(results) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('สถิติข้อสอบ') || ss.insertSheet('สถิติข้อสอบ');
  if (sheet.getLastRow() === 0) sheet.appendRow(['รหัส','หัวข้อ','ทำ','ถูก','ผิด','A','B','C','D']);
  var data = sheet.getDataRange().getValues();
  var idMap = {}; for (var i=1; i<data.length; i++) idMap[String(data[i][0])] = i+1;
  results.forEach(function(res) {
    var row = idMap[String(res.questionId)];
    if (!row) { sheet.appendRow([res.questionId, res.topic, 0, 0, 0, 0, 0, 0, 0]); row = sheet.getLastRow(); }
    var range = sheet.getRange(row, 1, 1, 9);
    var vals = range.getValues()[0];
    vals[2]++; if (res.isCorrect) vals[3]++; else vals[4]++;
    var c = String(res.selectedAnswer).toUpperCase();
    if (c==='A') vals[5]++; else if (c==='B') vals[6]++; else if (c==='C') vals[7]++; else if (c==='D') vals[8]++;
    range.setValues([vals]);
  });
}

// --- Helper functions for Data Fetching ---

function getAdminOverviewData(ss) {
  var resSheet = ss.getSheetByName('ผลการสอบ');
  var lastRow = resSheet ? resSheet.getLastRow() : 0;
  var totalCompleted = Math.max(0, lastRow - 1);
  
  var totalScore = 0;
  var distribution = {
    "0-20%": 0,
    "21-40%": 0,
    "41-60%": 0,
    "61-80%": 0,
    "81-100%": 0
  };

  if (totalCompleted > 0) {
    // Only fetch the score column (Column B) to save memory and time
    var scores = resSheet.getRange(2, 2, totalCompleted, 1).getValues();
    scores.forEach(function(row) { 
      var score = Number(row[0] || 0);
      totalScore += score;
      
      // Calculate distribution (assuming max score is 20)
      var percent = (score / 20) * 100;
      if (percent <= 20) distribution["0-20%"]++;
      else if (percent <= 40) distribution["21-40%"]++;
      else if (percent <= 60) distribution["41-60%"]++;
      else if (percent <= 80) distribution["61-80%"]++;
      else distribution["81-100%"]++;
    });
  }

  var dbSheet = ss.getSheetByName('DB');
  var totalEmployees = dbSheet ? dbSheet.getLastRow() - 1 : 0;

  return {
    success: true,
    stats: {
      totalEmployees: totalEmployees,
      completed: totalCompleted,
      avgScore: totalCompleted > 0 ? (totalScore / totalCompleted) : 0
    },
    scoreDistribution: distribution,
    questionStats: getQuestionStats()
  };
}

function getEmployeeListData(ss, page, pageSize, search, region, zone) {
  page = parseInt(page || 1);
  pageSize = parseInt(pageSize || 20);
  search = (search || "").toLowerCase();
  region = (region || "").toLowerCase();
  zone = (zone || "").toLowerCase();
  
  var resSheet = ss.getSheetByName('ผลการสอบ');
  var resData = resSheet ? resSheet.getDataRange().getValues().slice(1) : [];
  
  // Create a map of unique employee IDs who took the exam
  // We take the latest result for each employee
  var uniqueResults = {};
  resData.forEach(function(row) {
    var empId = String(row[2]);
    uniqueResults[empId] = {
      score: row[1],
      timestamp: row[0],
      employeeId: empId,
      prefix: row[3],
      firstName: row[4],
      lastName: row[5],
      nickname: row[6],
      position: row[7],
      branch: row[8],
      zone: row[9],
      region: row[10],
      email: row[11],
      pdfUrl: row[12],
      photoUrl: row[13],
      tabSwitches: row[15],
      timeSpent: row[16],
      status: row[17] || "Completed"
    };
  });

  var examTakers = Object.values(uniqueResults);
  
  var filtered = examTakers.filter(function(r) {
    // Search filter
    if (search) {
      var fullName = (r.firstName + " " + r.lastName).toLowerCase();
      var id = String(r.employeeId).toLowerCase();
      if (fullName.indexOf(search) === -1 && id.indexOf(search) === -1) return false;
    }
    
    // Region filter
    if (region && String(r.region).toLowerCase() !== region) return false;
    
    // Zone filter
    if (zone && String(r.zone).toLowerCase() !== zone) return false;
    
    return true;
  });

  var totalFiltered = filtered.length;
  var start = (page - 1) * pageSize;
  var pagedData = filtered.slice(start, start + pageSize);

  var finalData = pagedData.map(function(r) {
    return {
      employeeId: r.employeeId,
      name: r.prefix + r.firstName + " " + r.lastName,
      nickname: r.nickname,
      position: r.position,
      branch: r.branch,
      zone: r.zone,
      region: r.region,
      isManager: false, // We don't have this in Results sheet easily, but we can assume false or fetch if needed
      examInfo: {
        score: r.score,
        timestamp: r.timestamp,
        pdfUrl: r.pdfUrl,
        photoUrl: getDirectImageUrl(r.photoUrl),
        tabSwitches: r.tabSwitches,
        timeSpent: r.timeSpent,
        status: r.status
      }
    };
  });

  return {
    success: true,
    data: finalData,
    pagination: {
      currentPage: page,
      pageSize: pageSize,
      totalItems: totalFiltered,
      totalPages: Math.ceil(totalFiltered / pageSize)
    }
  };
}
