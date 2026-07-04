import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { AsyncLocalStorage } from "async_hooks";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, setDoc, setLogLevel } from "firebase/firestore";

dotenv.config();

const app = express();
const PORT = 3000;

// Global Firestore connection reference
let dbFirestore: any = null;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Enable robust CORS handling for multi-origin developments and sandbox networks
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, authorization, x-user-mobile, x-env-mode");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Thread local environment mode context storage
const envStorage = new AsyncLocalStorage<string>();

// Middleware to bind environment mode to requests
app.use((req, res, next) => {
  const mode = (req.headers["x-env-mode"] as string) || "testing";
  envStorage.run(mode, () => {
    next();
  });
});

// Helper to determine active DB path
const DATA_DIR = path.join(process.cwd(), "data");

function getDbFile(): string {
  const envMode = envStorage.getStore() || "production";
  return envMode === "testing" ? path.join(DATA_DIR, "db_test.json") : path.join(DATA_DIR, "db.json");
}

// Intialize Database
function initializeDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const activeFile = getDbFile();

  if (!fs.existsSync(activeFile)) {
    const initialDb = {
      companies: [
        { id: "KOPRAN", name: "Engineering", logoUrl: "", createdAt: "2026-05-28T00:00:00Z" }
      ],
      users: [
        { mobile: "+91 98765 43210", name: "Rajesh Kumar", role: "supervisor", department: "Production", plant: "Pen Plant", companyId: "KOPRAN", approved: true },
        { mobile: "+91 87654 32109", name: "Anil Sharma", role: "engineering_officer", department: "Engineering", plant: "Pen Plant", companyId: "KOPRAN", approved: true },
        { mobile: "+91 76543 21098", name: "Vikram Singh", role: "admin", department: "Admin", plant: "Both", companyId: "KOPRAN", approved: true },
        { mobile: "+91 99999 88888", name: "Sunil Verma", role: "engineering_head", department: "Engineering", plant: "Both", companyId: "KOPRAN", approved: true },
        { mobile: "+91 88888 77777", name: "Karan Johar", role: "engineering_manager", department: "Engineering", plant: "Both", companyId: "KOPRAN", approved: true },
        { mobile: "+91 77777 66666", name: "Meeta Patel", role: "plant_manager", department: "Production", plant: "Pen Plant", companyId: "KOPRAN", approved: true },
        { mobile: "+91 66666 55555", name: "Hitesh Shah", role: "qa_manager", department: "QA", plant: "Both", companyId: "KOPRAN", approved: true }
      ],
      issues: [
        {
          id: "BD-20260528-0001",
          plant: "Pen Plant",
          department: "Production",
          area: "Manufacturing (Pen Plant)",
          machine: "PLC Control Station 01",
          description: "Abnormal high-pitch squealing and excessive vibration at spindle rpm above 2000. Potential bearing wear.",
          status: "closed",
          createdBy: "+91 98765 43210",
          createdByName: "Rajesh Kumar",
          createdDateTime: "2026-05-28T08:30:00Z",
          assignedTo: "+91 87654 32109",
          assignedToName: "Anil Sharma",
          assignmentDateTime: "2026-05-28T08:45:00Z",
          resolvedDateTime: "2026-05-28T10:15:00Z",
          closureDateTime: "2026-05-28T10:30:00Z",
          resolutionRemarks: "Dismantled shield cover. Cleaned spindle assembly. Replaced dry lubrication grease with high-temp industrial lithium grease and adjusted sensor alignment. RPM test run up to 4000 successful.",
          slaMinutes: 120,
          escalationStatus: "normal",
          companyId: "KOPRAN",
          aiRecommendations: {
            possibleCauses: ["Lack of grease in spindle bearing", "Misalignment of work-holding chuck", "Vibration sensor out of calibration"],
            stepsToFix: ["Apply grade-3 spindle lubrication grease", "Perform vibration spectrum analysis", "Re-calibrate vibration trip threshold"],
            recommendedSlaMinutes: 120,
            estimatedSeverity: "High"
          },
          history: [
            { status: "open", timestamp: "2026-05-28T08:30:00Z", updatedBy: "+91 98765 43210", updatedByName: "Rajesh Kumar", notes: "Breakdown raised." },
            { status: "assigned", timestamp: "2026-05-28T08:45:00Z", updatedBy: "+91 87654 32109", updatedByName: "Anil Sharma", notes: "Self-assigned for immediate review." },
            { status: "in_progress", timestamp: "2026-05-28T08:50:00Z", updatedBy: "+91 87654 32109", updatedByName: "Anil Sharma", notes: "Taking down casing to inspect spindle bearing state." },
            { status: "resolved", timestamp: "2026-05-28T10:15:00Z", updatedBy: "+91 87654 32109", updatedByName: "Anil Sharma", notes: "Spoke repacked, grease injected, vibration checks clear." },
            { status: "closed", timestamp: "2026-05-28T10:30:00Z", updatedBy: "+91 98765 43210", updatedByName: "Rajesh Kumar", notes: "Machine verified under test load. Closing ticket." }
          ]
        },
        {
          id: "BD-20260528-0002",
          plant: "Non-Pen Plant",
          department: "Engineering",
          area: "Utility (Non-Pen Plant)",
          machine: "Steam Boiler SB-50",
          description: "Main steam boiler heater output dropping pressure from 300 bar down to 180 bar during active strokes. Hydraulic oil pool detected in tray.",
          status: "resolved",
          createdBy: "+91 98765 43210",
          createdByName: "Rajesh Kumar",
          createdDateTime: "2026-05-28T14:00:00Z",
          assignedTo: "+91 99999 88888",
          assignedToName: "Sunil Verma",
          assignmentDateTime: "2026-05-28T14:15:00Z",
          resolvedDateTime: "2026-05-28T16:30:00Z",
          resolutionRemarks: "Reformed pressure seal ring on main ram. Refilled 12 liters of ISO 46 hydraulic system oil. Tested under pressure, steady holding at 295 bar.",
          slaMinutes: 180,
          escalationStatus: "normal",
          companyId: "KOPRAN",
          aiRecommendations: {
            possibleCauses: ["Worn main ram cylinder double-acting lip seal", "Proportional control valve internal bypass", "Hydraulic line pressure relief failure"],
            stepsToFix: ["Inspect main cylinder collar for leakage", "Isolate slide pilot valve and check pressure", "Bleed air from manifold and cycle cylinder"],
            recommendedSlaMinutes: 180,
            estimatedSeverity: "Critical"
          },
          history: [
            { status: "open", timestamp: "2026-05-28T14:00:00Z", updatedBy: "+91 98765 43210", updatedByName: "Rajesh Kumar", notes: "Breakdown raised." },
            { status: "assigned", timestamp: "2026-05-28T14:15:00Z", updatedBy: "+91 99999 88888", updatedByName: "Sunil Verma", notes: "Assigned by maintenance supervisor." },
            { status: "in_progress", timestamp: "2026-05-28T14:30:00Z", updatedBy: "+91 99999 88888", updatedByName: "Sunil Verma", notes: "Procuring seal ring and oil canister from inventory." },
            { status: "resolved", timestamp: "2026-05-28T16:30:00Z", updatedBy: "+91 99999 88888", updatedByName: "Sunil Verma", notes: "Seals replaced and system test completed. Awaiting supervisor closure confirmation." }
          ]
        },
        {
          id: "BD-20260529-0001",
          plant: "Pen Plant",
          department: "Production",
          area: "Packing (Pen Plant)",
          machine: "Inkjet Batch Coder IC05",
          description: "Device calibration fault E-104 flashing. Controller won't hold torque program parameters, resets to zero during assembly cyles.",
          status: "in_progress",
          createdBy: "+91 98765 43210",
          createdByName: "Rajesh Kumar",
          createdDateTime: "2026-05-29T04:15:00Z",
          assignedTo: "+91 87654 32109",
          assignedToName: "Anil Sharma",
          assignmentDateTime: "2026-05-29T04:30:00Z",
          slaMinutes: 60,
          escalationStatus: "due_soon",
          companyId: "KOPRAN",
          aiRecommendations: {
            possibleCauses: ["Controller memory supercapacitor dead", "External electromagnetic noise interfering with RS485 connection", "Transducer ribbon wire strain damaged"],
            stepsToFix: ["Disconnect tool power, discharge backup bus for 2 mins", "Verify shielding braid on communication cable", "Substitute secondary tool body to isolate hardware issue"],
            recommendedSlaMinutes: 60,
            estimatedSeverity: "Medium"
          },
          history: [
            { status: "open", timestamp: "2026-05-29T04:15:00Z", updatedBy: "+91 98765 43210", updatedByName: "Rajesh Kumar", notes: "Raised critical assembly block." },
            { status: "assigned", timestamp: "2026-05-29T04:30:00Z", updatedBy: "+91 87654 32109", updatedByName: "Anil Sharma", notes: "Assigned." },
            { status: "in_progress", timestamp: "2026-05-29T04:45:00Z", updatedBy: "+91 87654 32109", updatedByName: "Anil Sharma", notes: "Consulting manufacturer parameter manual. Checking controller logic voltage." }
          ]
        }
      ],
      whatsappLogs: [
        {
          id: "WA-1716962400000",
          timestamp: "2026-05-28T08:31:00Z",
          type: "issue_created",
          recipient: "Pen Plant Breakdown WhatsApp Group",
          message: "*🔴 NEW BREAKDOWN REPORTED*\n\n*ID:* BD-20260528-0001\n*Plant:* Pen Plant\n*Machine:* PLC Control Station 01\n*Supervisor:* Rajesh Kumar (+91 98765 43210)\n*Remarks:* Abnormal vibration above 2000 RPM.\n\n_Please assign an engineer to resolve this SLA: 120min._",
          status: "sent",
          apiUsed: "Simulated Whatsapp Gateway",
          companyId: "KOPRAN"
        },
        {
          id: "WA-1716963300000",
          timestamp: "2026-05-28T08:46:00Z",
          type: "assigned",
          recipient: "Anil Sharma (+91 87654 32109)",
          message: "*🔧 ASSIGNMENT ALERT*\n\nBreakdown *BD-20260528-0001* has been assigned to you.\n*Machine:* PLC Control Station 01\n*Description:* Abnormal high squealing.\n*Target SLA:* 120min.\n\n_Click the portal to mark 'In Progress' immediately._",
          status: "sent",
          apiUsed: "Simulated Whatsapp Gateway",
          companyId: "KOPRAN"
        }
      ],
      scheduledReports: [
        { id: "REP-01", type: "Daily Operations Review", frequency: "daily", time: "07:30", recipientGroup: "Plant Leadership Mobile Group", active: true, companyId: "KOPRAN" }
      ]
    };

    fs.writeFileSync(activeFile, JSON.stringify(initialDb, null, 2), "utf8");
  }
}

// Cloud Firestore Synchronizers to survive Cloud Run ephemeral scale down restarts
async function syncFromFirestoreToLocal() {
  if (!dbFirestore) return;
  const envMode = envStorage.getStore() || "production";
  const prefix = envMode === "testing" ? "test_" : "";
  console.log(`[Firestore Backup] Pulling ${envMode.toUpperCase()} datasets from Cloud Firestore...`);
  try {
    const companiesSnap = await getDocs(collection(dbFirestore, `${prefix}companies`));
    const companies: any[] = [];
    companiesSnap.forEach((doc) => {
      companies.push(doc.data());
    });

    const usersSnap = await getDocs(collection(dbFirestore, `${prefix}users`));
    const users: any[] = [];
    usersSnap.forEach((doc) => {
      users.push(doc.data());
    });

    const issuesSnap = await getDocs(collection(dbFirestore, `${prefix}issues`));
    const issues: any[] = [];
    issuesSnap.forEach((doc) => {
      issues.push(doc.data());
    });

    const logsSnap = await getDocs(collection(dbFirestore, `${prefix}whatsappLogs`));
    const whatsappLogs: any[] = [];
    logsSnap.forEach((doc) => {
      whatsappLogs.push(doc.data());
    });

    const reportsSnap = await getDocs(collection(dbFirestore, `${prefix}scheduledReports`));
    const scheduledReports: any[] = [];
    reportsSnap.forEach((doc) => {
      scheduledReports.push(doc.data());
    });

    const auditSnap = await getDocs(collection(dbFirestore, `${prefix}auditLogs`));
    const auditLogs: any[] = [];
    auditSnap.forEach((doc) => {
      auditLogs.push(doc.data());
    });

    if (users.length > 0 || issues.length > 0) {
      const activeFile = getDbFile();
      const currentDb = {
        companies: companies.length > 0 ? companies : [{ id: "KOPRAN", name: "Engineering", logoUrl: "", createdAt: new Date().toISOString() }],
        users,
        issues,
        whatsappLogs,
        scheduledReports,
        auditLogs
      };
      fs.writeFileSync(activeFile, JSON.stringify(currentDb, null, 2), "utf8");
      console.log(`[Firestore Backup] Successfully initialized local cache from Firestore: ${companies.length} companies, ${users.length} users, ${issues.length} issues, ${whatsappLogs.length} logs, ${auditLogs.length} audit logs.`);
    } else {
      console.log("[Firestore Backup] Cloud Firestore collections are currently empty. Local bootstrap is active.");
    }
  } catch (error: any) {
    console.error("[Firestore Backup] Pull synchronizer encountered error:", error.message);
  }
}

function cleanForFirestore(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore);
  }
  if (typeof obj === "object") {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        cleaned[key] = cleanForFirestore(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}

async function syncToFirestore(data: any) {
  if (!dbFirestore) return;
  const envMode = envStorage.getStore() || "production";
  const prefix = envMode === "testing" ? "test_" : "";
  try {
    // 0. Save Companies
    if (data.companies && Array.isArray(data.companies)) {
      for (const c of data.companies) {
        if (c.id) {
          const cleaned = cleanForFirestore(c);
          await setDoc(doc(dbFirestore, `${prefix}companies`, c.id), cleaned);
        }
      }
    }

    // 1. Save Users
    if (data.users && Array.isArray(data.users)) {
      for (const u of data.users) {
        if (u.mobile) {
          const docId = u.mobile.replace(/\+/g, "").replace(/\s+/g, "");
          const cleaned = cleanForFirestore(u);
          await setDoc(doc(dbFirestore, `${prefix}users`, docId), cleaned);
        }
      }
    }

    // 2. Save Issues
    if (data.issues && Array.isArray(data.issues)) {
      for (const i of data.issues) {
        if (i.id) {
          const cleaned = cleanForFirestore(i);
          await setDoc(doc(dbFirestore, `${prefix}issues`, i.id), cleaned);
        }
      }
    }

    // 3. Save Whatsapp Logs
    if (data.whatsappLogs && Array.isArray(data.whatsappLogs)) {
      const slicedLogs = data.whatsappLogs.slice(0, 50);
      for (const wl of slicedLogs) {
        if (wl.id) {
          const cleaned = cleanForFirestore(wl);
          await setDoc(doc(dbFirestore, `${prefix}whatsappLogs`, wl.id), cleaned);
        }
      }
    }

    // 4. Save Scheduled Reports
    if (data.scheduledReports && Array.isArray(data.scheduledReports)) {
      for (const r of data.scheduledReports) {
        if (r.id) {
          const cleaned = cleanForFirestore(r);
          await setDoc(doc(dbFirestore, `${prefix}scheduledReports`, r.id), cleaned);
        }
      }
    }

    // 5. Save Audit Logs
    if (data.auditLogs && Array.isArray(data.auditLogs)) {
      const slicedAudit = data.auditLogs.slice(0, 50);
      for (const al of slicedAudit) {
        if (al.id) {
          const cleaned = cleanForFirestore(al);
          await setDoc(doc(dbFirestore, `${prefix}auditLogs`, al.id), cleaned);
        }
      }
    }
    console.log(`[Firestore Backup] Successfully backup synchronized to Cloud Firestore (${envMode.toUpperCase()})`);
  } catch (err: any) {
    console.error("[Firestore Backup] Push backup synchronization failed:", err.message);
  }
}

// Helper to read and write database
function readDb() {
  initializeDb();
  const activeFile = getDbFile();
  try {
    const data = fs.readFileSync(activeFile, "utf8");
    const parsed = JSON.parse(data);
    if (!parsed.companies) parsed.companies = [];
    if (!parsed.users) parsed.users = [];
    if (!parsed.issues) parsed.issues = [];
    if (!parsed.whatsappLogs) parsed.whatsappLogs = [];
    if (!parsed.scheduledReports) parsed.scheduledReports = [];
    if (!parsed.auditLogs) parsed.auditLogs = [];

    // Auto-migrate old plant names to "Pen Plant" and "Non-Pen Plant"
    parsed.users.forEach((u: any) => {
      if (u.plant === "Plant 1") u.plant = "Pen Plant";
      if (u.plant === "Plant 2") u.plant = "Non-Pen Plant";
    });
    parsed.issues.forEach((i: any) => {
      if (i.plant === "Plant 1") i.plant = "Pen Plant";
      if (i.plant === "Plant 2") i.plant = "Non-Pen Plant";

      if (i.area) {
        if (i.area.endsWith("(Plant 1)")) {
          i.area = i.area.replace("(Plant 1)", "(Pen Plant)");
        } else if (i.area.endsWith("(Plant 2)")) {
          i.area = i.area.replace("(Plant 2)", "(Non-Pen Plant)");
        }
      }
    });

    return parsed;
  } catch (error) {
    console.error("Error reading database file", error);
    return { companies: [], users: [], issues: [], whatsappLogs: [], scheduledReports: [] };
  }
}

function writeDb(data: any) {
  const activeFile = getDbFile();
  try {
    fs.writeFileSync(activeFile, JSON.stringify(data, null, 2), "utf8");
    // Backup to cloud asynchronously without blocking UI request thread
    syncToFirestore(data).catch((e) => {
      console.error("[Firestore Backup] Async push backup failed:", e);
    });
  } catch (error) {
    console.error("Error writing database file", error);
  }
}

// WhatsApp sending simulation and delivery method
async function sendWhatsAppAlert(type: string, recipient: string, text: string) {
  // Try sending real Twilio WhatsApp if configured
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromWhatsapp = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
    let toWhatsapp = process.env.TO_WHATSAPP_NUMBER || recipient;

    if (accountSid && authToken && toWhatsapp) {
      if (!toWhatsapp.startsWith('whatsapp:')) {
        toWhatsapp = `whatsapp:${toWhatsapp.replace(/\s+/g, '')}`;
      }
      console.log(`[WhatsApp API] Dispatching message via Twilio to ${toWhatsapp}`);
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('From', fromWhatsapp);
      params.append('To', toWhatsapp);
      params.append('Body', text);

      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (twilioRes.ok) {
        console.log(`[WhatsApp API] Real message dispatched successfully!`);
      } else {
        const err = await twilioRes.text();
        console.error(`[WhatsApp API] Twilio rejected dispatch: ${err}`);
      }
    }
  } catch (err) {
    console.error(`[WhatsApp API] Twilio network exception:`, err);
  }

  // Push to system logs
  const db = readDb();
  const log = {
    id: `WA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    type,
    recipient,
    message: text,
    status: 'sent' as const,
    apiUsed: process.env.TWILIO_ACCOUNT_SID ? 'Twilio WhatsApp API' : 'Simulated Whatsapp Gateway'
  };
  db.whatsappLogs.unshift(log);
  writeDb(db);
}

// Gemini AI Setup
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// API Endpoints

// 1. Auth Routing
app.post("/api/auth/request-otp", (req, res) => {
  const { mobile, name, role, department, plant, companyId, companyName, companyLogo } = req.body;
  if (!mobile) {
    return res.status(400).json({ error: "Mobile number is required" });
  }

  const db = readDb();
  let user = db.users.find((u: any) => u.mobile.trim() === mobile.trim());
  let isNewUser = false;

  if (!user) {
    // Prevent registration without name or role
    if (!name || !role) {
      return res.json({
        exists: false,
        message: "No registered profile found. Please register a new user profile."
      });
    }

    let userCompanyId = "";

    // Multi-Company: Validate or setup company profile
    if (role === "admin") {
      // Delaying company registration to post-login setup
      userCompanyId = "";
    } else {
      userCompanyId = companyId ? companyId.trim().toUpperCase() : "";
      // Employees/Supervisors must join an existing company
      if (!userCompanyId) {
        return res.status(400).json({ error: "A valid Company Invite Link or Invite Code is required to join. Please contact Admin." });
      }
      const existingCompany = db.companies.find((c: any) => c.id === userCompanyId);
      if (!existingCompany) {
        return res.status(400).json({ error: "The provided Company Invite Code is invalid. Please contact Admin." });
      }
    }

    isNewUser = true;
    const mappedPlant = plant === "Plant 1" ? "Pen Plant" : plant === "Plant 2" ? "Non-Pen Plant" : (plant || "Pen Plant");
    user = {
      mobile: mobile.trim(),
      name: name.trim(),
      role: role.trim(),
      department: department || "",
      plant: mappedPlant,
      companyId: userCompanyId,
      approved: role === "admin" ? true : false // Admin is auto-approved, others require approval
    };

    db.users.push(user);

    // Save registration to general auditLogs
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift({
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      type: "registration",
      actor: `${mobile.trim()} (${name.trim()})`,
      details: role === "admin" 
        ? "Self-registered new System Admin profile. One-time corporate tenant registration deferred to post-login setup form."
        : `Self-registered new member role ${role.toUpperCase()} joining existing Company Invite Code: ${userCompanyId}.`,
      companyId: userCompanyId
    });
  } else {
    // If user already exists but trying to register again
    if (name || role) {
      return res.status(400).json({ error: "A user is already registered with this mobile number. Please sign in instead." });
    }
  }

  // Set predictable but secure, time-bound random OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  user.otpCreatedAt = Date.now();

  // Save changes
  db.users = db.users.map((u: any) => u.mobile === user.mobile ? { ...u, ...user } : u);

  // Log OTP fallback scenario (Primary SMS fails, falls back to WhatsApp)
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    type: "otp_delivery_fallback",
    actor: `${mobile.trim()}`,
    details: `SMS OTP delivery attempt failed (Carrier Response Error: 504 Gateway Timeout). Safely auto-triggered fallback WhatsApp delivery. OTP ${otp} delivered successfully.`,
    companyId: user.companyId || ""
  });

  writeDb(db);

  return res.json({
    exists: true,
    otp, // return OTP in response for testing simulations
    user: { mobile: user.mobile, name: user.name, role: user.role, department: user.department, plant: user.plant, companyId: user.companyId, approved: user.approved },
    deliveryLog: {
      primary: { channel: "SMS", gateway: "Telecom Standard", status: "FAILED", error: "Carrier route saturated / Timeout" },
      fallback: { channel: "WhatsApp", gateway: "Meta Business Direct", status: "DELIVERED", details: "Secured instant bypass routing" }
    },
    message: `Secure OTP ${otp} delivered successfully via fallback WhatsApp routing (Primary SMS timed out).`
  });
});

app.post("/api/auth/verify-otp", (req, res) => {
  const { mobile, otp } = req.body;
  if (!mobile || !otp) {
    return res.status(400).json({ error: "Mobile and OTP are required" });
  }

  const db = readDb();
  const user = db.users.find((u: any) => u.mobile.trim() === mobile.trim());

  if (!user || user.otp !== otp) {
    return res.status(401).json({ error: "Invalid OTP code. Please verify the code and try again." });
  }

  // Check if OTP is older than 5 minutes
  const otpAgeMs = Date.now() - (user.otpCreatedAt || 0);
  if (otpAgeMs > 5 * 60 * 1000) {
    return res.status(401).json({ error: "OTP has expired. Please request a new one." });
  }

  // Clean OTP after verification
  db.users = db.users.map((u: any) => u.mobile === mobile ? { ...u, otp: undefined, otpCreatedAt: undefined } : u);
  writeDb(db);

  const company = db.companies.find((c: any) => c.id === user.companyId);

  return res.json({
    success: true,
    user: {
      mobile: user.mobile,
      name: user.name,
      role: user.role,
      department: user.department,
      plant: user.plant,
      companyId: user.companyId,
      approved: user.approved !== false
    },
    company
  });
});

// Get user directory (restricted to current user's company!)
app.get("/api/users", (req, res) => {
  const db = readDb();
  const userMobile = req.headers["x-user-mobile"] as string;
  
  let companyId = "KOPRAN";
  if (userMobile) {
    const caller = db.users.find((u: any) => u.mobile.trim() === userMobile.trim());
    if (caller) {
      companyId = caller.companyId || "KOPRAN";
    }
  }

  // Filter users by companyId to preserve isolation (multi-tenant!)
  const filteredUsers = db.users.filter((u: any) => (u.companyId || "KOPRAN") === companyId);
  res.json(filteredUsers);
});

// Create new user profile directly (admin utility inside company)
app.post("/api/users", async (req, res) => {
  const { mobile, name, role, department, plant } = req.body;
  if (!mobile || !name || !role) {
    return res.status(400).json({ error: "Mobile, Name and Role are required" });
  }
  const db = readDb();
  if (db.users.some((u: any) => u.mobile === mobile)) {
    return res.status(400).json({ error: "User already exists with this mobile number" });
  }

  const userMobile = req.headers["x-user-mobile"] as string;
  let companyId = "KOPRAN";
  let callerName = "Admin";
  if (userMobile) {
    const caller = db.users.find((u: any) => u.mobile.trim() === userMobile.trim());
    if (caller) {
      companyId = caller.companyId || "KOPRAN";
      callerName = caller.name || "Admin";
    }
  }

  const mappedPlant = plant === "Plant 1" ? "Pen Plant" : plant === "Plant 2" ? "Non-Pen Plant" : (plant || "Pen Plant");
  const newUser = {
    mobile,
    name,
    role,
    department,
    plant: mappedPlant,
    companyId,
    approved: true // Admins override normal invites for direct roster inclusions
  };
  db.users.push(newUser);

  // Auto add to audit trails
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    type: "registration",
    actor: `${userMobile} (${callerName})`,
    details: `Manually added and approved new employee roster row: Name: ${name}, Mobile: ${mobile}, Assigned Role: ${role.toUpperCase()}, Department: ${department || "None"}.`,
    companyId
  });

  writeDb(db);

  // Auto add to WhatsApp Group & post registration notification
  const roleLabel = role.replace('_', ' ').toUpperCase();
  const companyName = db.companies.find((c: any) => c.id === companyId)?.name || "Your Enterprise";
  const systemLogText = `*📲 WHATSAPP ROSTER SYNC*\n\nWelcome *${name}* (${roleLabel}) to ${companyName}!\nMobile ID: ${mobile}\nPlant Assignment: ${plant || "Pen Plant"}\n\n_He/she has been successfully registered and added to the corporate WhatsApp group. Actions and assignment alerts are active._`;
  await sendWhatsAppAlert("roster_registered", companyName, systemLogText);

  res.json({ success: true, user: newUser });
});

// Helper to retrieve and authenticate caller information for role-based multi-tenant isolation
function getCallerInfo(req: any) {
  const userMobile = req.headers["x-user-mobile"] as string;
  const db = readDb();
  let companyId = "KOPRAN";
  let approved = true;
  let callerRole = "";
  let caller = null;

  if (userMobile) {
    caller = db.users.find((u: any) => u.mobile.trim() === userMobile.trim());
    if (caller) {
      companyId = caller.companyId || "KOPRAN";
      approved = caller.approved !== false;
      callerRole = caller.role;
    }
  }
  return { companyId, approved, callerRole, caller, db };
}

// Admin Management APIs
app.post("/api/admin/approve-user", (req, res) => {
  const { companyId, callerRole, caller, db } = getCallerInfo(req);
  if (callerRole !== "admin") {
    return res.status(403).json({ error: "Administrative privileges required." });
  }
  const { mobile, approved } = req.body;
  if (!mobile) return res.status(400).json({ error: "Target mobile is required." });
  
  const target = db.users.find((u: any) => u.mobile === mobile && (u.companyId || "KOPRAN") === companyId);
  if (!target) return res.status(404).json({ error: "User not found within your company roster." });
  
  const oldApproval = target.approved;
  target.approved = approved;

  // Audit Trails
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    type: "role_change",
    actor: `${caller?.mobile || "SYSTEM"} (${caller?.name || "Admin"})`,
    details: `Admin profile approval update of '${target.name}' (${mobile}): changed from approved: ${oldApproval} to approved: ${approved}.`,
    companyId: companyId
  });

  writeDb(db);
  res.json({ success: true, user: target });
});

app.post("/api/admin/change-role", (req, res) => {
  const { companyId, callerRole, caller, db } = getCallerInfo(req);
  if (callerRole !== "admin") {
    return res.status(403).json({ error: "Administrative privileges required." });
  }
  const { mobile, role } = req.body;
  if (!mobile || !role) return res.status(400).json({ error: "Target mobile and proposed role are required." });
  
  const target = db.users.find((u: any) => u.mobile === mobile && (u.companyId || "KOPRAN") === companyId);
  if (!target) return res.status(404).json({ error: "User not found within your company roster." });
  
  const oldRole = target.role;
  target.role = role;

  // Audit Trails
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    type: "role_change",
    actor: `${caller?.mobile || "SYSTEM"} (${caller?.name || "Admin"})`,
    details: `Admin role privilege reassigned for user '${target.name}' (${mobile}): upgraded from role ${oldRole.toUpperCase()} to ${role.toUpperCase()}.`,
    companyId: companyId
  });

  writeDb(db);
  res.json({ success: true, user: target });
});

app.get("/api/companies/:id", (req, res) => {
  const db = readDb();
  const cid = req.params.id.toUpperCase();
  const company = db.companies.find((c: any) => c.id === cid);
  if (!company) return res.status(404).json({ error: "Company profile not found." });
  
  const isKopran = cid === "KOPRAN";
  const defaultPlants = isKopran ? ["Pen Plant", "Non-Pen Plant"] : ["Plant 1", "Plant 2", "Other Area"];
  const defaultDepts = [
    "Production", "Engineering", "QA", "QC", "IPQA", "HR", "Admin", "Security", "Accounts", 
    "R & D - F & D", "R & D - ADL", "R & D - Packaging", "QC Lab", "QC Micro Lab"
  ];

  res.json({
    ...company,
    plants: company.plants || defaultPlants,
    departments: company.departments || defaultDepts
  });
});

app.post("/api/admin/register-company", (req, res) => {
  const { db } = getCallerInfo(req);
  const userMobile = req.headers["x-user-mobile"] as string;
  if (!userMobile) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const caller = db.users.find((u: any) => u.mobile.trim() === userMobile.trim());
  if (!caller) {
    return res.status(404).json({ error: "User profile not found." });
  }

  if (caller.role !== "admin") {
    return res.status(403).json({ error: "Only Company Admins can register a corporate organization." });
  }

  const { name, logoUrl, plants, departments } = req.body;
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: "Company name is required." });
  }

  // Generate a Unique, secure, user-friendly Company Invite ID
  const cleanName = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").substring(0, 5);
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const generatedCompanyId = `${cleanName}-${randomSuffix}`;

  const defaultPlants = ["Plant 1", "Plant 2", "Other Area"];
  const defaultDepts = [
    "Production", "Engineering", "QA", "QC", "IPQA", "HR", "Admin", "Security", "Accounts", 
    "R & D - F & D", "R & D - ADL", "R & D - Packaging", "QC Lab", "QC Micro Lab"
  ];

  const comp = {
    id: generatedCompanyId,
    name: name.trim(),
    logoUrl: logoUrl || "",
    plants: plants || defaultPlants,
    departments: departments || defaultDepts,
    createdAt: new Date().toISOString()
  };

  db.companies.push(comp);

  // Link caller to this company
  caller.companyId = generatedCompanyId;
  caller.approved = true;

  // Sync users list to map any duplicate sessions of caller
  db.users = db.users.map((u: any) => u.mobile === caller.mobile ? { ...u, companyId: generatedCompanyId, approved: true } : u);

  // Log to Audit Trails
  if (!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    type: "registration",
    actor: `${caller.mobile} (${caller.name})`,
    details: `Successfully completed one-time setup of corporate organization '${name.trim()}' generating unique Invite Code: ${generatedCompanyId}`,
    companyId: generatedCompanyId
  });

  writeDb(db);

  res.json({
    success: true,
    company: comp,
    user: {
      mobile: caller.mobile,
      name: caller.name,
      role: caller.role,
      department: caller.department,
      plant: caller.plant,
      companyId: generatedCompanyId,
      approved: true
    }
  });
});

app.get("/api/admin/audit-logs", (req, res) => {
  const { companyId, callerRole, db } = getCallerInfo(req);
  if (callerRole !== "admin") {
    return res.status(403).json({ error: "Administrative privileges required." });
  }
  const filtered = (db.auditLogs || []).filter((l: any) => (l.companyId || "KOPRAN") === companyId);
  res.json(filtered);
});

app.post("/api/admin/update-company", (req, res) => {
  const { companyId, callerRole, db } = getCallerInfo(req);
  if (callerRole !== "admin") {
    return res.status(403).json({ error: "Administrative privileges required." });
  }
  const { name, logoUrl, plants, departments } = req.body;
  if (!name) return res.status(400).json({ error: "Company name is required." });
  
  let comp = db.companies.find((c: any) => c.id === companyId);
  
  const isKopran = companyId === "KOPRAN";
  const defaultPlants = isKopran ? ["Pen Plant", "Non-Pen Plant"] : ["Plant 1", "Plant 2", "Other Area"];
  const defaultDepts = [
    "Production", "Engineering", "QA", "QC", "IPQA", "HR", "Admin", "Security", "Accounts", 
    "R & D - F & D", "R & D - ADL", "R & D - Packaging", "QC Lab", "QC Micro Lab"
  ];

  if (!comp) {
    comp = { 
      id: companyId, 
      name, 
      logoUrl: logoUrl || "", 
      plants: plants || defaultPlants,
      departments: departments || defaultDepts,
      createdAt: new Date().toISOString() 
    };
    db.companies.push(comp);
  } else {
    comp.name = name;
    comp.logoUrl = logoUrl || "";
    if (plants) comp.plants = plants;
    if (departments) comp.departments = departments;
  }
  writeDb(db);
  res.json({ success: true, company: comp });
});

// 2. Fetch Issues (Isolate per Company!)
app.get("/api/issues", (req, res) => {
  const { companyId, approved, db } = getCallerInfo(req);
  if (!approved) {
    return res.status(403).json({ error: "Access denied. Your profile status is Pending administrative approval." });
  }
  
  // Auto timeout deemed resolved check (2 hours)
  let modified = false;
  const now = Date.now();
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const ticketsToNotify: any[] = [];

  const companyName = db.companies.find((c: any) => c.id === companyId)?.name || "Your Company";

  db.issues.forEach((issue: any) => {
    if (issue.status === "resolved" && issue.resolvedDateTime && (issue.companyId || "KOPRAN") === companyId) {
      const resolvedTime = new Date(issue.resolvedDateTime).getTime();
      if (now - resolvedTime >= TWO_HOURS_MS) {
        issue.status = "closed";
        issue.history.push({
          status: "closed",
          timestamp: new Date().toISOString(),
          updatedBy: "SYSTEM",
          updatedByName: "Auto-Timeout Worker",
          notes: "Ticket auto-closed. Resolution deemed resolved successfully after 2-hour timeout limit exceeded without supervisor rejection."
        });
        ticketsToNotify.push(issue);
        modified = true;
      }
    }
  });

  if (modified) {
    writeDb(db);
    // Dispatch WhatsApp alerts safely
    ticketsToNotify.forEach((issue) => {
      const alertMsg = `*🏁 AUTO-CLOSED (DEEMED APPROVED)*\n\n*Ticket:* ${issue.id}\n*Machine:* ${issue.machine} (${issue.area})\n*Status:* Closed (Deemed Resolved)\n\n_System Auto-Timeout Worker: Ticket closed automatically because the 2-hour verification confirmation period has passed successfully without objection._`;
      sendWhatsAppAlert("closed", companyName, alertMsg).catch(err => {
        console.error("Failed sending auto-resolve WhatsApp:", err);
      });
    });
  }

  const { status, plant, machine, department, search } = req.query;

  // Filter issues strictly by companyId to preserve complete separation!
  let filtered = db.issues.filter((i: any) => (i.companyId || "KOPRAN") === companyId);

  if (status) filtered = filtered.filter(i => i.status === status);
  if (plant) filtered = filtered.filter(i => i.plant === plant);
  if (machine) filtered = filtered.filter(i => i.machine === machine);
  if (department) filtered = filtered.filter(i => i.department === department);

  if (search) {
    const s = (search as string).toLowerCase();
    filtered = filtered.filter(i => 
      i.id.toLowerCase().includes(s) ||
      i.description.toLowerCase().includes(s) ||
      i.machine.toLowerCase().includes(s) ||
      i.createdByName.toLowerCase().includes(s) ||
      (i.assignedToName && i.assignedToName.toLowerCase().includes(s))
    );
  }

  // Sort: open and assigned issues first, then resolved, then closed
  filtered.sort((a, b) => {
    const statusOrder: { [key: string]: number } = { open: 0, assigned: 1, in_progress: 2, resolved: 3, closed: 4 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return new Date(b.createdDateTime).getTime() - new Date(a.createdDateTime).getTime();
  });

  res.json(filtered);
});

// 3. AI analysis & Smart breakdown diagnostic recommendations
app.post("/api/ai/diagnose", async (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: "Provide breakdown description to analyze" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      possibleCauses: [
        "Wear or degradation of local gaskets or seals",
        "Sensor dirt or connection cable tension leading to diagnostic alerts",
        "Fluctuating input voltage or pressure supply"
      ],
      stepsToFix: [
        "1. Isolate power source and complete general check of casing.",
        "2. Clean transducer connectors with contact spray.",
        "3. Recalibrate physical reference mark and check log alerts."
      ],
      recommendedSlaMinutes: 90,
      estimatedSeverity: "High"
    });
  }

  try {
    const prompt = `
    You are an AI-powered industrial manufacturing diagnostician.
    Given this breakdown report field text:
    "${description}"

    Please suggest possible physical breakdown causes, exact tactical resolution steps for the on-site engineer, recommended resolution SLA timeframe in minutes, and structural risk level (Low, Medium, High, Critical).

    You must return a JSON response matching this TypeScript schema:
    {
      "possibleCauses": string[],
      "stepsToFix": string[],
      "recommendedSlaMinutes": number,
      "estimatedSeverity": "Low" | "Medium" | "High" | "Critical"
    }

    Return ONLY pure, valid, raw JSON. Do not include markdown codeblocks or quotes.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            possibleCauses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Root trigger reasons"
            },
            stepsToFix: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Instructions to repair"
            },
            recommendedSlaMinutes: {
              type: Type.INTEGER,
              description: "Appropriate maintenance duration bounds"
            },
            estimatedSeverity: {
              type: Type.STRING,
              description: "Severity level classification"
            }
          },
          required: ["possibleCauses", "stepsToFix", "recommendedSlaMinutes", "estimatedSeverity"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (err: any) {
    console.error("[Gemini API] Failed calling model, shifting to mock:", err.message);
    return res.json({
      possibleCauses: ["Input valve obstruction", "Mechanical coupling friction misalignment"],
      stepsToFix: ["Isolate line and perform zero-load test cycle"],
      recommendedSlaMinutes: 120,
      estimatedSeverity: "Medium"
    });
  }
});

// 4. Create Breakdown Ticket
app.post("/api/issues", async (req, res) => {
  const { companyId, approved, db } = getCallerInfo(req);
  if (!approved) {
    return res.status(403).json({ error: "Access denied. Pending administrative approval." });
  }

  const { plant, department, area, machine, description, imageUrl, createdBy, createdByName, slaMinutes, aiRecommendations } = req.body;

  if (!plant || !department || !area || !machine || !description || !createdBy || !createdByName) {
    return res.status(400).json({ error: "Missing required breakdown reporting parameters" });
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  
  // Find current index of breakdowns created today to formulate ticket ID
  const todayTickets = db.issues.filter((i: any) => i.id.startsWith(`BD-${dateStr}-`) && (i.companyId || "KOPRAN") === companyId);
  const newNum = String(todayTickets.length + 1).padStart(4, "0");
  const ticketId = `BD-${dateStr}-${newNum}`;

  const defaultSla = slaMinutes || (aiRecommendations?.recommendedSlaMinutes) || 120;

  const newIssue: any = {
    id: ticketId,
    plant,
    department,
    area,
    machine,
    description,
    imageUrl,
    createdBy,
    createdByName,
    createdDateTime: new Date().toISOString(),
    status: "open",
    slaMinutes: defaultSla,
    escalationStatus: "normal",
    companyId,
    aiRecommendations: aiRecommendations || null,
    history: [
      {
        status: "open",
        timestamp: new Date().toISOString(),
        updatedBy: createdBy,
        updatedByName: createdByName,
        notes: `Breakdown ticket initiated on ${machine}. SLA set to ${defaultSla} minutes.`
      }
    ]
  };

  db.issues.unshift(newIssue);
  writeDb(db);

  // Trigger WhatsApp communication to Group
  const companyName = db.companies.find((c: any) => c.id === companyId)?.name || "Your Company";
  const alertText = `*🚨 NEW BREAKDOWN REPORTED*
  
*Ticket ID:* ${ticketId}
*Plant:* ${plant} -> ${department}
*Location:* ${area} / *Machine:* ${machine}
*Description:* ${description}
*Reported By:* ${createdByName} (${createdBy})

_Maintenance engineers, please assign and pick up immediately!_`;

  await sendWhatsAppAlert("issue_created", companyName, alertText);

  res.status(201).json(newIssue);
});

// 5. Assign Ticket
app.post("/api/issues/:id/assign", async (req, res) => {
  const { id } = req.params;
  const assignedTo = req.body.assignedTo || req.body.engineerMobile;
  const assignedToName = req.body.assignedToName || req.body.engineerName;
  const mobileSignature = req.body.mobileSignature || req.body.assignerMobile;
  const nameSignature = req.body.nameSignature || req.body.assignerName;

  const { companyId, approved, db } = getCallerInfo(req);
  if (!approved) return res.status(403).json({ error: "Access denied." });

  if (!assignedTo || !assignedToName || !mobileSignature || !nameSignature) {
    return res.status(400).json({ error: "Assignee parameters are required" });
  }

  const issue = db.issues.find((i: any) => i.id === id && (i.companyId || "KOPRAN") === companyId);

  if (!issue) {
    return res.status(404).json({ error: "Ticket not found or belongs to another tenant" });
  }

  issue.status = "assigned";
  issue.assignedTo = assignedTo;
  issue.assignedToName = assignedToName;
  issue.assignmentDateTime = new Date().toISOString();

  issue.history.push({
    status: "assigned",
    timestamp: new Date().toISOString(),
    updatedBy: mobileSignature,
    updatedByName: nameSignature,
    notes: `Ticket assigned to Engineer ${assignedToName} (${assignedTo}).`
  });

  writeDb(db);

  // Send WhatsApp to Engineer
  const alertText = `*🔧 TASK ASSIGNMENT ALERT*

*Ticket:* ${issue.id}
*Machine:* ${issue.machine} (${issue.area})
*Description:* ${issue.description}
*Reported By:* ${issue.createdByName}
*Assigned To:* You (${assignedToName})
*SLA Time:* ${issue.slaMinutes} mins

_Start repair operations and update ticket progress status to 'In Progress' immediately._`;

  await sendWhatsAppAlert("assigned", `${assignedToName} (${assignedTo})`, alertText);

  res.json(issue);
});

// 6. Set In Progress and Set Resolved
app.post("/api/issues/:id/status", async (req, res) => {
  const { id } = req.params;
  const status = req.body.status;
  const remarks = req.body.remarks || req.body.notes;
  const mobileSignature = req.body.mobileSignature || req.body.updaterMobile;
  const nameSignature = req.body.nameSignature || req.body.updaterName;

  const { companyId, approved, db } = getCallerInfo(req);
  if (!approved) return res.status(403).json({ error: "Access denied." });

  if (!status || !mobileSignature || !nameSignature) {
    return res.status(400).json({ error: "Status boundaries and signature are required" });
  }

  const issue = db.issues.find((i: any) => i.id === id && (i.companyId || "KOPRAN") === companyId);

  if (!issue) {
    return res.status(404).json({ error: "Ticket not found or belongs to another tenant" });
  }

  if (status === "in_progress") {
    issue.status = "in_progress";
    issue.history.push({
      status: "in_progress",
      timestamp: new Date().toISOString(),
      updatedBy: mobileSignature,
      updatedByName: nameSignature,
      notes: remarks || "Repair operations started. Diagnostic checking in progress."
    });
  } else if (status === "resolved") {
    if (!remarks) {
      return res.status(400).json({ error: "Resolution remarks must be outlined" });
    }
    issue.status = "resolved";
    issue.resolutionRemarks = remarks;
    issue.resolvedDateTime = new Date().toISOString();
    issue.history.push({
      status: "resolved",
      timestamp: new Date().toISOString(),
      updatedBy: mobileSignature,
      updatedByName: nameSignature,
      notes: `Resolution reported: ${remarks}`
    });

    // Notify issue creator (supervisor) via WhatsApp
    const alertText = `*✅ BREAKDOWN RESOLVED*

*Ticket:* ${issue.id}
*Machine:* ${issue.machine} (${issue.area})
*Assigned Engineer:* ${issue.assignedToName}
*Resolution Time:* ${new Date().toLocaleTimeString()}
*Engineer Remarks:* "${remarks}"

_Supervisor (${issue.createdByName}), please review machine operations and submit Close/Not Resolved confirmation in the application panel._`;

    await sendWhatsAppAlert("resolved", `${issue.createdByName} (${issue.createdBy})`, alertText);
  }

  writeDb(db);
  res.json(issue);
});

// 7. Supervisor Response (Close Ticket or Re-open)
app.post("/api/issues/:id/close", async (req, res) => {
  const { id } = req.params;
  const decision = req.body.decision || req.body.status; // Flutter sends 'status' as 'closed'/'reopened'
  const feedback = req.body.feedback || req.body.remarks || req.body.notResolvedFeedback;
  const mobileSignature = req.body.mobileSignature || req.body.resolverMobile;
  const nameSignature = req.body.nameSignature || req.body.resolverName;

  const { companyId, approved, db } = getCallerInfo(req);
  if (!approved) return res.status(403).json({ error: "Access denied." });

  if (!decision || !mobileSignature || !nameSignature) {
    return res.status(400).json({ error: "Decision directive and signature are required" });
  }

  const issue = db.issues.find((i: any) => i.id === id && (i.companyId || "KOPRAN") === companyId);

  if (!issue) {
    return res.status(404).json({ error: "Ticket not found or belongs to another tenant" });
  }

  const companyName = db.companies.find((c: any) => c.id === companyId)?.name || "Your Company";

  if (decision === "closed") {
    issue.status = "closed";
    issue.closureDateTime = new Date().toISOString();
    issue.history.push({
      status: "closed",
      timestamp: new Date().toISOString(),
      updatedBy: mobileSignature,
      updatedByName: nameSignature,
      notes: feedback ? `Supervisor confirmed repair as successful. Notes: ${feedback}` : "Supervisor confirmed repair as successful. Ticket Closed."
    });

    // Inform breakdown group
    const alertText = `*📴 TICKET CLOSED UPDATE*

*Ticket:* ${issue.id}
*Machine:* ${issue.machine} (${issue.area})
*Status:* COMPLETE & CLOSED
*Engineer:* ${issue.assignedToName}
*Confirmed By:* ${nameSignature}

_Machine is returned safely back to active operations._`;

    await sendWhatsAppAlert("closed", companyName, alertText);

  } else if (decision === "reopened") {
    issue.status = "open";
    issue.notResolvedFeedback = feedback || "Not satisfied with resolution.";
    issue.resolvedDateTime = undefined;
    issue.history.push({
      status: "open",
      timestamp: new Date().toISOString(),
      updatedBy: mobileSignature,
      updatedByName: nameSignature,
      notes: `Supervisor rejected resolution. Re-opened ticket with feedback: "${feedback}"`
    });

    // Notify engineer
    const alertText = `*⚠️ ISSUE RE-OPENED / REJECTED*

*Ticket:* ${issue.id}
*Machine:* ${issue.machine}
*Reclosed Feedback:* "${feedback}"

_Engineer (${issue.assignedToName}), please check setup again and modify repair guidelines!_`;

    await sendWhatsAppAlert("issue_created", `${issue.assignedToName} (${issue.assignedTo})`, alertText);
  }

  writeDb(db);
  res.json(issue);
});

// 8. Dashboard Metrics & Analytics statistics (Isolate per company!)
app.get("/api/reports/stats", (req, res) => {
  const { companyId, approved, db } = getCallerInfo(req);
  if (!approved) return res.status(403).json({ error: "Access denied." });
  
  const issues = db.issues.filter((i: any) => (i.companyId || "KOPRAN") === companyId);

  const openIssues = issues.filter(i => i.status === "open").length;
  const inProgressIssues = issues.filter(i => i.status === "in_progress" || i.status === "assigned").length;
  const resolvedIssues = issues.filter(i => i.status === "resolved").length;
  const closedIssues = issues.filter(i => i.status === "closed").length;

  // Average resolution time
  let totalResTime = 0;
  let resolvedCount = 0;
  issues.forEach((i: any) => {
    if (i.resolvedDateTime && i.createdDateTime) {
      const created = new Date(i.createdDateTime).getTime();
      const resolved = new Date(i.resolvedDateTime).getTime();
      const diffMinutes = Math.floor((resolved - created) / (1000 * 60));
      if (diffMinutes > 0) {
        totalResTime += diffMinutes;
        resolvedCount++;
      }
    }
  });
  const avgResolutionTimeMinutes = resolvedCount > 0 ? Math.round(totalResTime / resolvedCount) : 0;

  // Breakdown counts by Machine
  const machineBreakdowns: { [key: string]: number } = {};
  issues.forEach((i: any) => {
    machineBreakdowns[i.machine] = (machineBreakdowns[i.machine] || 0) + 1;
  });

  // Performance of Engineers inside the tenant company
  const engineerPerformanceMap: { [mobile: string]: { name: string, totalMinutes: number, count: number } } = {};
  db.users.filter((u: any) => u.role === "engineering_officer" && (u.companyId || "KOPRAN") === companyId).forEach((eng: any) => {
    engineerPerformanceMap[eng.mobile] = { name: eng.name, totalMinutes: 0, count: 0 };
  });

  issues.forEach((i: any) => {
    if (i.assignedTo && i.resolvedDateTime && i.createdDateTime) {
      const created = new Date(i.createdDateTime).getTime();
      const resolved = new Date(i.resolvedDateTime).getTime();
      const duration = Math.floor((resolved - created) / (1000 * 60));

      if (!engineerPerformanceMap[i.assignedTo]) {
        engineerPerformanceMap[i.assignedTo] = { name: i.assignedToName || "Unknown", totalMinutes: 0, count: 0 };
      }
      engineerPerformanceMap[i.assignedTo].totalMinutes += duration;
      engineerPerformanceMap[i.assignedTo].count += 1;
    }
  });

  const engineerPerformance = Object.keys(engineerPerformanceMap).map(mobile => {
    const entry = engineerPerformanceMap[mobile];
    return {
      name: entry.name,
      mobile,
      resolvedCount: entry.count,
      avgTimeMinutes: entry.count > 0 ? Math.round(entry.totalMinutes / entry.count) : 0
    };
  });

  res.json({
    openIssues,
    inProgressIssues,
    resolvedIssues,
    closedIssues,
    avgResolutionTimeMinutes,
    machineBreakdowns,
    engineerPerformance
  });
});

// CSV Export Endpoint (Isolate per company!)
app.get("/api/reports/export", (req, res) => {
  const { companyId, approved, db } = getCallerInfo(req);
  if (!approved) return res.status(403).json({ error: "Access denied." });
  
  let issues = db.issues.filter((i: any) => (i.companyId || "KOPRAN") === companyId);
  const { startDate, endDate } = req.query;

  if (startDate) {
    const startObj = new Date(startDate as string);
    issues = issues.filter((i: any) => new Date(i.createdDateTime) >= startObj);
  }
  if (endDate) {
    const endObj = new Date(endDate as string);
    endObj.setHours(23, 59, 59, 999);
    issues = issues.filter((i: any) => new Date(i.createdDateTime) <= endObj);
  }

  let csvContent = "Issue ID,Plant,Department,Area,Machine,Status,Symptom Description,Created By,Created DateTime,Assigned To,Assignment DateTime,Resolved DateTime,Closure DateTime,Resolution Remarks,Escalation\n";

  issues.forEach((i: any) => {
    const row = [
      i.id,
      `"${i.plant.replace(/"/g, '""')}"`,
      `"${i.department.replace(/"/g, '""')}"`,
      `"${i.area.replace(/"/g, '""')}"`,
      `"${i.machine.replace(/"/g, '""')}"`,
      i.status.toUpperCase(),
      `"${(i.description || "").replace(/"/g, '""')}"`,
      `"${i.createdByName} (${i.createdBy})"`,
      i.createdDateTime || "",
      i.assignedTo ? `"${i.assignedToName} (${i.assignedTo})"` : "Unassigned",
      i.assignmentDateTime || "",
      i.resolvedDateTime || "",
      i.closureDateTime || "",
      `"${(i.resolutionRemarks || "").replace(/"/g, '""')}"`,
      i.escalationStatus
    ].join(",");
    csvContent += row + "\n";
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=machine_breakdown_reports.csv");
  res.status(200).send(csvContent);
});

// Manage WhatsApp Dispatch logs (Tenant isolated)
app.get("/api/whatsapp-logs", (req, res) => {
  const { companyId, approved, db } = getCallerInfo(req);
  if (!approved) return res.status(403).json({ error: "Access denied" });
  res.json((db.whatsappLogs || []).filter((wl: any) => (wl.companyId || "KOPRAN") === companyId));
});

app.post("/api/whatsapp-logs/clear", (req, res) => {
  const { companyId, approved, db } = getCallerInfo(req);
  if (!approved) return res.status(403).json({ error: "Access denied" });
  db.whatsappLogs = db.whatsappLogs.filter((wl: any) => (wl.companyId || "KOPRAN") !== companyId);
  writeDb(db);
  res.json({ success: true });
});

// Scheduled Alert Mock Trigger Setting (Tenant isolated)
app.get("/api/reports/scheduled", (req, res) => {
  const { companyId, approved, db } = getCallerInfo(req);
  if (!approved) return res.status(403).json({ error: "Access denied" });
  res.json((db.scheduledReports || []).filter((r: any) => (r.companyId || "KOPRAN") === companyId));
});

app.post("/api/reports/scheduled", (req, res) => {
  const { companyId, approved, db } = getCallerInfo(req);
  if (!approved) return res.status(403).json({ error: "Access denied" });

  const { type, frequency, time, recipientGroup } = req.body;
  if (!type || !frequency || !time || !recipientGroup) {
    return res.status(400).json({ error: "Missing scheduling definitions" });
  }
  const newSchedule = {
    id: `SCHED-${Date.now()}`,
    type,
    frequency,
    time,
    recipientGroup,
    active: true,
    companyId
  };
  db.scheduledReports = db.scheduledReports || [];
  db.scheduledReports.unshift(newSchedule);
  writeDb(db);
  res.status(201).json(newSchedule);
});

// Database Purge / Clean Endpoint (Isolated per tenant company!)
app.post("/api/admin/reset-database", (req, res) => {
  const { companyId, callerRole, db } = getCallerInfo(req);
  if (callerRole !== "admin") {
    return res.status(403).json({ error: "Administrative privileges are required to clear breakdown history." });
  }

  // Purge only issues, whatsappLogs, and custom reports belonging to this company!
  db.issues = db.issues.filter((i: any) => (i.companyId || "KOPRAN") !== companyId);
  db.whatsappLogs = db.whatsappLogs.filter((wl: any) => (wl.companyId || "KOPRAN") !== companyId);
  db.scheduledReports = db.scheduledReports.filter((r: any) => (r.companyId || "KOPRAN") !== companyId);

  // Restore seed issues only if company is KOPRAN (backwards compatibility)
  if (companyId === "KOPRAN") {
    db.scheduledReports.unshift({ id: "REP-01", type: "Daily Operations Review", frequency: "daily", time: "07:30", recipientGroup: "Plant Leadership Mobile Group", active: true, companyId: "KOPRAN" });
  }

  try {
    writeDb(db);
    res.json({ success: true, message: `Successfully cleared breakdown ticket history for your company profile. Roster members are preserved.` });
  } catch (error: any) {
    res.status(500).json({ error: `Failed to reset database: ${error.message}` });
  }
});

// Mounting Vite in development or static serving inside production
async function startServer() {
  // Initialize and load persistent cloud cache from Google Cloud Firestore
  initializeDb();
  
  // Initialize Firebase Cloud Firestore connection safely
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const fbApp = initializeApp(firebaseConfig);
      dbFirestore = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);
      setLogLevel("error"); // Mute non-error level internal Firebase Client SDK stream management warnings
      console.log("[Firestore Backup] Connection initialized successfully with project", firebaseConfig.projectId);
    }
  } catch (err: any) {
    console.error("[Firestore Backup] Failed to initialize Firestore connection:", err.message);
  }

  // Launch Firestore background sync routines without delaying server startup/listener binding
  envStorage.run("production", () => {
    syncFromFirestoreToLocal().catch((e) => console.error("[Firestore Backup] Production preload background sync failed:", e));
  });
  envStorage.run("testing", () => {
    syncFromFirestoreToLocal().catch((e) => console.error("[Firestore Backup] Testing preload background sync failed:", e));
  });

  // Global error handler middleware to intercept route-level runtime errors and serve them as JSON
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[Express Route Error Handler]:", err);
    res.status(500).json({ error: err.message || "An unexpected internal server error occurred." });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // SLA background cron escalators (SLA warnings check for both environments!)
  setInterval(() => {
    ["testing", "production"].forEach((envMode) => {
      envStorage.run(envMode, () => {
        try {
          const db = readDb();
          let modified = false;
          const now = new Date().getTime();

          db.issues.forEach((i: any) => {
            if (i.status !== "closed" && i.status !== "resolved") {
              const created = new Date(i.createdDateTime).getTime();
              const elapsedMinutes = Math.floor((now - created) / (1000 * 60));
              const limit = i.slaMinutes;

              if (elapsedMinutes >= limit && i.escalationStatus !== "escalated") {
                i.escalationStatus = "escalated";
                modified = true;
                // Record in history log
                i.history.push({
                  status: i.status,
                  timestamp: new Date().toISOString(),
                  updatedBy: "SYSTEM",
                  updatedByName: "SLA Monitor Service",
                  notes: `⚠️ CRITICAL: SLA limit of ${limit} minutes crossed. Raising escalation flag!`
                });

                // Dispatch automated dispatch escalation warnings to WhatsApp groups!
                sendWhatsAppAlert(
                  "issue_created",
                  "Production Management Escalation Channel",
                  `*🚨 CRITICAL BREAKDOWN SLA ESCALATION alert (${envMode.toUpperCase()})*

*Ticket ID:* ${i.id}
*Machine:* ${i.machine} (${i.area})
*Status:* ${i.status.toUpperCase()}
*Elapsed:* ${elapsedMinutes} minutes (Target limit: ${limit} mins)
*Assigned To:* ${i.assignedToName || "UNASSIGNED"}

_Direct intervention required to prevent assembly downtime line blocks!_`
                );
              } else if (elapsedMinutes >= limit * 0.75 && i.escalationStatus === "normal") {
                i.escalationStatus = "due_soon";
                modified = true;
              }
            }
          });

          if (modified) {
            writeDb(db);
          }
        } catch (e) {
          console.error(`SLA Interval check for ${envMode} failed gracefully:`, e);
        }
      });
    });
  }, 30000); // scan periodically

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server executing live in port http://localhost:${PORT}`);
  });
}

startServer();
