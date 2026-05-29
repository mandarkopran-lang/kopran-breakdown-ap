import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { AsyncLocalStorage } from "async_hooks";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

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
      users: [
        { mobile: "+91 98765 43210", name: "Rajesh Kumar", role: "supervisor", department: "Production", plant: "Plant 1" },
        { mobile: "+91 87654 32109", name: "Anil Sharma", role: "engineering_officer", department: "Engineering", plant: "Plant 1" },
        { mobile: "+91 76543 21098", name: "Vikram Singh", role: "admin", department: "Admin", plant: "Both" },
        { mobile: "+91 99999 88888", name: "Sunil Verma", role: "engineering_head", department: "Engineering", plant: "Both" },
        { mobile: "+91 88888 77777", name: "Karan Johar", role: "engineering_manager", department: "Engineering", plant: "Both" },
        { mobile: "+91 77777 66666", name: "Meeta Patel", role: "plant_manager", department: "Production", plant: "Plant 1" },
        { mobile: "+91 66666 55555", name: "Hitesh Shah", role: "qa_manager", department: "QA", plant: "Both" }
      ],
      issues: [
        {
          id: "BD-20260528-0001",
          plant: "Plant 1",
          department: "Production",
          area: "Manufacturing (Plant 1)",
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
          plant: "Plant 2",
          department: "Engineering",
          area: "Utility (Plant 2)",
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
          plant: "Plant 1",
          department: "Production",
          area: "Packing (Plant 1)",
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
          recipient: "Plant 1 Breakdown WhatsApp Group",
          message: "*🔴 NEW BREAKDOWN REPORTED*\n\n*ID:* BD-20260528-0001\n*Plant:* Plant 1\n*Machine:* PLC Control Station 01\n*Supervisor:* Rajesh Kumar (+91 98765 43210)\n*Remarks:* Abnormal vibration above 2000 RPM.\n\n_Please assign an engineer to resolve this SLA: 120min._",
          status: "sent",
          apiUsed: "Simulated Whatsapp Gateway"
        },
        {
          id: "WA-1716963300000",
          timestamp: "2026-05-28T08:46:00Z",
          type: "assigned",
          recipient: "Anil Sharma (+91 87654 32109)",
          message: "*🔧 ASSIGNMENT ALERT*\n\nBreakdown *BD-20260528-0001* has been assigned to you.\n*Machine:* PLC Control Station 01\n*Description:* Abnormal high squealing.\n*Target SLA:* 120min.\n\n_Click the portal to mark 'In Progress' immediately._",
          status: "sent",
          apiUsed: "Simulated Whatsapp Gateway"
        }
      ],
      scheduledReports: [
        { id: "REP-01", type: "Daily Operations Review", frequency: "daily", time: "07:30", recipientGroup: "Plant Leadership Mobile Group", active: true }
      ]
    };

    fs.writeFileSync(activeFile, JSON.stringify(initialDb, null, 2), "utf8");
  }
}

// Helper to read and write database
function readDb() {
  initializeDb();
  const activeFile = getDbFile();
  try {
    const data = fs.readFileSync(activeFile, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database file", error);
    return { users: [], issues: [], whatsappLogs: [], scheduledReports: [] };
  }
}

function writeDb(data: any) {
  const activeFile = getDbFile();
  try {
    fs.writeFileSync(activeFile, JSON.stringify(data, null, 2), "utf8");
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
  const { mobile, name, role, department } = req.body;
  if (!mobile) {
    return res.status(400).json({ error: "Mobile number is required" });
  }

  const db = readDb();
  let user = db.users.find((u: any) => u.mobile.trim() === mobile.trim());

  if (!user) {
    // Register temporary or signup profile
    if (!name || !role) {
      return res.json({
        exists: false,
        message: "No registered profile found. Please register a new user profile."
      });
    }
    user = { mobile, name, role, department: department || "" };
    db.users.push(user);
    writeDb(db);
  }

  // Set predictable OTP
  const otp = "123456";
  user.otp = otp;
  // Update in users
  db.users = db.users.map((u: any) => u.mobile === user.mobile ? { ...u, otp } : u);
  writeDb(db);

  return res.json({
    exists: true,
    otp, // send back for simple visual simulation
    user: { mobile: user.mobile, name: user.name, role: user.role, department: user.department },
    message: `OTP 123456 sent successfully to ${mobile}!`
  });
});

app.post("/api/auth/verify-otp", (req, res) => {
  const { mobile, otp } = req.body;
  if (!mobile || !otp) {
    return res.status(400).json({ error: "Mobile and OTP are required" });
  }

  const db = readDb();
  const user = db.users.find((u: any) => u.mobile.trim() === mobile.trim() && u.otp === otp);

  if (!user) {
    return res.status(401).json({ error: "Invalid OTP code. Please enter 123456." });
  }

  // Clean OTP after verification
  db.users = db.users.map((u: any) => u.mobile === mobile ? { ...u, otp: undefined } : u);
  writeDb(db);

  return res.json({
    success: true,
    user: { mobile: user.mobile, name: user.name, role: user.role, department: user.department }
  });
});

// Get user directory
app.get("/api/users", (req, res) => {
  const db = readDb();
  res.json(db.users);
});

// Create new user profile directly
app.post("/api/users", async (req, res) => {
  const { mobile, name, role, department, plant } = req.body;
  if (!mobile || !name || !role) {
    return res.status(400).json({ error: "Mobile, Name and Role are required" });
  }
  const db = readDb();
  if (db.users.some((u: any) => u.mobile === mobile)) {
    return res.status(400).json({ error: "User already exists with this mobile number" });
  }
  const newUser = { mobile, name, role, department, plant: plant || "Plant 1" };
  db.users.push(newUser);
  writeDb(db);

  // Auto add to WhatsApp Group & post registration notification
  const roleLabel = role.replace('_', ' ').toUpperCase();
  const systemLogText = `*📲 WHATSAPP ROSTER SYNC*\n\nWelcome *${name}* (${roleLabel}) to Kopran Breakdowns!\nMobile ID: ${mobile}\nPlant Assignment: ${plant || "Plant 1"}\n\n_He/she has been successfully registered and added to the *Kopran Engineering* corporate WhatsApp group. Actions and assignment alerts are active._`;
  await sendWhatsAppAlert("roster_registered", "Kopran Engineering", systemLogText);

  res.json({ success: true, user: newUser });
});

// 2. Fetch Issues
app.get("/api/issues", (req, res) => {
  const db = readDb();
  
  // Auto timeout deemed resolved check (2 hours)
  let modified = false;
  const now = Date.now();
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  const ticketsToNotify: any[] = [];

  db.issues.forEach((issue: any) => {
    if (issue.status === "resolved" && issue.resolvedDateTime) {
      const resolvedTime = new Date(issue.resolvedDateTime).getTime();
      if (now - resolvedTime >= TWO_HOURS_MS) {
        issue.status = "closed";
        issue.history.push({
          status: "closed",
          timestamp: new Date().toISOString(),
          updatedBy: "SYSTEM",
          updatedByName: "Auto-Timeout Worker",
          notes: "Ticket auto-closed. Resolution deemed resolved successfully after 2 hours timeout limit exceeded without supervisor rejection."
        });
        ticketsToNotify.push(issue);
        modified = true;
      }
    }
  });

  if (modified) {
    writeDb(db);
    // Dispatch WhatsApp messages safely after writeDb
    ticketsToNotify.forEach((issue) => {
      const alertMsg = `*🏁 AUTO-CLOSED (DEEMED APPROVED)*\n\n*Ticket:* ${issue.id}\n*Machine:* ${issue.machine} (${issue.area})\n*Status:* Closed (Deemed Resolved)\n\n_System Auto-Timeout Worker: Ticket closed automatically because the 2-hour verification confirmation period has passed successfully without objection._`;
      sendWhatsAppAlert("closed", "Kopran Engineering", alertMsg).catch(err => {
        console.error("Failed sending auto-resolve WhatsApp:", err);
      });
    });
  }

  const { status, plant, machine, department, search } = req.query;

  let filtered = [...db.issues];

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
  // Sub-sort by date descending
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
    // Generate intelligent static mock analysis with simulated delay
    console.log("[Gemini API] API key not found or unconfigured. Returning mock recommendations.");
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
  const { plant, department, area, machine, description, imageUrl, createdBy, createdByName, slaMinutes, aiRecommendations } = req.body;

  if (!plant || !department || !area || !machine || !description || !createdBy || !createdByName) {
    return res.status(400).json({ error: "Missing required breakdown reporting parameters" });
  }

  const db = readDb();
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  
  // Find current index of breakdowns created today to formulate ticket ID
  const todayTickets = db.issues.filter((i: any) => i.id.startsWith(`BD-${dateStr}-`));
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
  const alertText = `*🚨 NEW BREAKDOWN REPORTED*

*Ticket ID:* ${ticketId}
*Plant:* ${plant} -> ${department}
*Location:* ${area} / *Machine:* ${machine}
*Description:* ${description}
*Reported By:* ${createdByName} (${createdBy})

_Maintenance engineers, please assign and pick up immediately on Kopran Portal!_`;

  await sendWhatsAppAlert("issue_created", "Kopran Engineering", alertText);

  res.status(201).json(newIssue);
});

// 5. Assign Ticket
app.post("/api/issues/:id/assign", async (req, res) => {
  const { id } = req.params;
  const { assignedTo, assignedToName, mobileSignature, nameSignature } = req.body;

  if (!assignedTo || !assignedToName || !mobileSignature || !nameSignature) {
    return res.status(400).json({ error: "Assignee and action-creator parameters are required" });
  }

  const db = readDb();
  const issue = db.issues.find((i: any) => i.id === id);

  if (!issue) {
    return res.status(404).json({ error: "Ticket not found" });
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
  const { status, remarks, mobileSignature, nameSignature } = req.body;

  if (!status || !mobileSignature || !nameSignature) {
    return res.status(400).json({ error: "Status, signatory name and mobile are required" });
  }

  const db = readDb();
  const issue = db.issues.find((i: any) => i.id === id);

  if (!issue) {
    return res.status(404).json({ error: "Ticket not found" });
  }

  if (status === "in_progress") {
    issue.status = "in_progress";
    issue.history.push({
      status: "in_progress",
      timestamp: new Date().toISOString(),
      updatedBy: mobileSignature,
      updatedByName: nameSignature,
      notes: "Repair operations started. Diagnostic checking in progress."
    });
  } else if (status === "resolved") {
    if (!remarks) {
      return res.status(400).json({ error: "Resolution remarks and spare replacements must be outlined" });
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
  const { decision, feedback, mobileSignature, nameSignature } = req.body; // decision: 'closed' | 'open'

  if (!decision || !mobileSignature || !nameSignature) {
    return res.status(400).json({ error: "Decision directive and signature are required" });
  }

  const db = readDb();
  const issue = db.issues.find((i: any) => i.id === id);

  if (!issue) {
    return res.status(404).json({ error: "Ticket not found" });
  }

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

    await sendWhatsAppAlert("closed", "Kopran Engineering", alertText);

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

_Engineer (${issue.assignedToName}), please immediately check the machine setup again and modify repair guidelines!_`;

    await sendWhatsAppAlert("issue_created", `${issue.assignedToName} (${issue.assignedTo})`, alertText);
  }

  writeDb(db);
  res.json(issue);
});

// 8. Dashboard Metrics & Analytics statistics
app.get("/api/reports/stats", (req, res) => {
  const db = readDb();
  const issues = db.issues;

  const openIssues = issues.filter(i => i.status === "open").length;
  const inProgressIssues = issues.filter(i => i.status === "in_progress" || i.status === "assigned").length;
  const resolvedIssues = issues.filter(i => i.status === "resolved").length;
  const closedIssues = issues.filter(i => i.status === "closed").length;

  // Average resolution time (between createdDateTime and resolvedDateTime) in minutes
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

  // Performance of Engineers based on resolution
  const engineerPerformanceMap: { [mobile: string]: { name: string, totalMinutes: number, count: number } } = {};
  db.users.filter((u: any) => u.role === "engineer").forEach((eng: any) => {
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

// CSV Export Endpoint
app.get("/api/reports/export", (req, res) => {
  const db = readDb();
  let issues = db.issues || [];
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

// Manage WhatsApp Dispatch logs
app.get("/api/whatsapp-logs", (req, res) => {
  const db = readDb();
  res.json(db.whatsappLogs || []);
});

app.post("/api/whatsapp-logs/clear", (req, res) => {
  const db = readDb();
  db.whatsappLogs = [];
  writeDb(db);
  res.json({ success: true });
});

// Scheduled Alert Mock Trigger Setting
app.get("/api/reports/scheduled", (req, res) => {
  const db = readDb();
  res.json(db.scheduledReports || []);
});

app.post("/api/reports/scheduled", (req, res) => {
  const { type, frequency, time, recipientGroup } = req.body;
  if (!type || !frequency || !time || !recipientGroup) {
    return res.status(400).json({ error: "Missing scheduling definitions" });
  }
  const db = readDb();
  const newSchedule = {
    id: `SCHED-${Date.now()}`,
    type,
    frequency,
    time,
    recipientGroup,
    active: true
  };
  db.scheduledReports = db.scheduledReports || [];
  db.scheduledReports.unshift(newSchedule);
  writeDb(db);
  res.status(201).json(newSchedule);
});

// Database Purge / Clean Endpoint
app.post("/api/admin/reset-database", (req, res) => {
  const envMode = envStorage.getStore() || "production";
  const activeFile = getDbFile();

  const initialDb = {
    users: [
      { mobile: "+91 98765 43210", name: "Rajesh Kumar", role: "supervisor", department: "Production", plant: "Plant 1" },
      { mobile: "+91 87654 32109", name: "Anil Sharma", role: "engineering_officer", department: "Engineering", plant: "Plant 1" },
      { mobile: "+91 76543 21098", name: "Vikram Singh", role: "admin", department: "Admin", plant: "Both" },
      { mobile: "+91 99999 88888", name: "Sunil Verma", role: "engineering_head", department: "Engineering", plant: "Both" },
      { mobile: "+91 88888 77777", name: "Karan Johar", role: "engineering_manager", department: "Engineering", plant: "Both" },
      { mobile: "+91 77777 66666", name: "Meeta Patel", role: "plant_manager", department: "Production", plant: "Plant 1" },
      { mobile: "+91 66666 55555", name: "Hitesh Shah", role: "qa_manager", department: "QA", plant: "Both" }
    ],
    issues: [], // Empty for real-time fresh run!
    whatsappLogs: [],
    scheduledReports: [
      { id: "REP-01", type: "Daily Operations Review", frequency: "daily", time: "07:30", recipientGroup: "Plant Leadership Mobile Group", active: true }
    ]
  };

  try {
    fs.writeFileSync(activeFile, JSON.stringify(initialDb, null, 2), "utf8");
    res.json({ success: true, message: `Successfully cleared ${envMode.toUpperCase()} database. Ready for clean launch!` });
  } catch (error: any) {
    res.status(500).json({ error: `Failed to reset database: ${error.message}` });
  }
});

// Mounting Vite in development or static serving inside production
async function startServer() {
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
