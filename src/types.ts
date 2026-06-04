// Shared Types for Machine Breakdown Reporting and Tracking System

export type UserRole = 
  | 'admin' 
  | 'engineering_head' 
  | 'engineering_manager' 
  | 'engineering_officer' 
  | 'plant_manager' 
  | 'qa_manager' 
  | 'supervisor';

export const USER_ROLES_INFO: { [key in UserRole]: { label: string; desc: string } } = {
  admin: { label: 'Admin', desc: 'Full administration, system parameters, downloads' },
  engineering_head: { label: 'Engineering Head', desc: 'Assign/reassign breakdowns, view graphical metrics, reports' },
  engineering_manager: { label: 'Engineering Manager', desc: 'Assign/reassign breakdowns, view graphical metrics, reports, downloads' },
  engineering_officer: { label: 'Engineering Supervisor / Officer', desc: 'Self-assign jobs, report resolutions' },
  plant_manager: { label: 'Plant Manager', desc: 'Raise breakdowns, write operational comments/concerns, downloads' },
  qa_manager: { label: 'QA Manager', desc: 'Raise breakdowns, write quality comments/concerns, downloads' },
  supervisor: { label: 'Supervisor', desc: 'Raise breakdowns, confirm resolutions' }
};

export interface User {
  mobile: string;
  name: string;
  role: UserRole;
  department?: string;
  plant?: string;
  otp?: string;
  companyId?: string;
}

export type IssueStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

export interface IssueHistoryItem {
  status: IssueStatus;
  timestamp: string;
  updatedBy: string; // Mobile signature
  updatedByName: string;
  notes: string;
}

export interface Issue {
  id: string; // BD-YYYYMMDD-XXXX
  plant: string;
  department: string;
  area: string;
  machine: string;
  description: string;
  imageUrl?: string; // base64 or URL
  createdBy: string; // Supervisor Mobile
  createdByName: string; // Supervisor Name
  createdDateTime: string; // ISO string
  assignedTo?: string; // Engineer Mobile
  assignedToName?: string; // Engineer Name
  assignmentDateTime?: string; // ISO string
  resolvedDateTime?: string; // ISO string
  closureDateTime?: string; // ISO string
  status: IssueStatus;
  resolutionRemarks?: string;
  slaMinutes: number; // SLA limit (e.g. 120)
  escalationStatus: 'normal' | 'due_soon' | 'escalated';
  aiRecommendations?: {
    possibleCauses: string[];
    stepsToFix: string[];
    recommendedSlaMinutes: number;
    estimatedSeverity: 'Low' | 'Medium' | 'High' | 'Critical';
  };
  notResolvedFeedback?: string;
  history: IssueHistoryItem[];
}

export interface WhatsAppLog {
  id: string;
  timestamp: string;
  type: string;
  recipient: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  apiUsed: string;
}

export interface DashboardStats {
  openIssues: number;
  inProgressIssues: number;
  resolvedIssues: number;
  closedIssues: number;
  avgResolutionTimeMinutes: number;
  machineBreakdowns: { [machineName: string]: number };
  engineerPerformance: Array<{
    name: string;
    mobile: string;
    resolvedCount: number;
    avgTimeMinutes: number;
  }>;
}

export interface PlantHierarchy {
  [plantName: string]: {
    [deptName: string]: {
      [areaName: string]: string[]; // Machine Names
    };
  };
}

const commonAreasRaw = [
  'Accounts',
  'Security',
  'Admin',
  'HR',
  'Admin Building',
  'Conference Room'
];

const specificAreasRaw = [
  'Canteen',
  'Change Room Male',
  'Change Room Female',
  'Change Room Visitors',
  'Manufacturing',
  'Warehouse',
  'IPQA',
  'FG Warehouse',
  'Packing',
  'Engineering',
  'Utility',
  'Service Floor',
  'Scrapyard'
];

const AREA_MACHINES: { [area: string]: string[] } = {
  'Accounts': ['Accounts Server PC', 'Bill Scanner A', 'Invoice LaserJet Printer'],
  'Security': ['Main Entrance CCTV Hub', 'Biometric Turnstile Gate 1', 'PA System Console'],
  'Admin': ['Admin Workstation 1', 'Document Shredder DS01', 'Intranet Router'],
  'HR': ['ID Card Encoder', 'Interview Room AV Desk', 'HR Archive Safe'],
  'Admin Building': ['Central HVAC Unit', 'Elevator EL-01', 'Backup Lobby Lighting'],
  'Conference Room': ['LED Presentation Screen', 'Polycom Audio System', 'HDMI Matrix Switch'],
  'Canteen': ['Commercial Microwave', 'Water Dispenser RO-01', 'Exhaust Hood Fan'],
  'Change Room Male': ['Locker Lock RFID Board', 'Air Shower AS01', 'Exhaust Blower Vent'],
  'Change Room Female': ['Locker Lock RFID Board', 'Air Shower AS02', 'Exhaust Blower Vent'],
  'Change Room Visitors': ['Temp Visitor Badge Kiosk', 'Air Shower AS03', 'Hand Sanitizer Unit'],
  'Manufacturing': ['PLC Control Station 01', 'Primary Air Compressor AC-10', 'Conveyor Induction Belt', 'Overhead Gantry Crane'],
  'Warehouse': ['Barcode Scanner BT02', 'Dock Leveller DL-05', 'Electric Forklift Charger'],
  'IPQA': ['IPQA Label Thermal Printer', 'IPC Weighing Balance WB01', 'Sample Humidity Chamber'],
  'FG Warehouse': ['Pallet Wrap Machine PW01', 'Stretch Wrapper SW02', 'Loading Dock Shutter Door'],
  'Packing': ['Blister Packer BP-300', 'Cartoning Machine CM-20', 'Inkjet Batch Coder IC05'],
  'Engineering': ['Engineering Lathe Machine EL01', 'Welding Generator WG05', 'Calibration Workbench CW01'],
  'Utility': ['Steam Boiler SB-50', 'Chilled Water Pump CP-12', 'Air Handling Unit AHU-09'],
  'Service Floor': ['Service Escalator SE01', 'Exhaust Air Damper', 'Sub-station Panel'],
  'Scrapyard': ['Hydraulic Scraps Baler HB05', 'Digital Weighbridge WB50T', 'Material Shredder']
};

function getMachinesForArea(areaName: string): string[] {
  const baseName = areaName.replace(/\s*\((Plant\s*\d+|Pen Plant|Non-Pen Plant)\)$/i, '');
  return AREA_MACHINES[baseName] || ['General Equipment Unit 01', 'Generic Utility Unit 02'];
}

const buildHierarchy = (): PlantHierarchy => {
  const hierarchy: PlantHierarchy = {};
  const plants = ['Pen Plant', 'Non-Pen Plant'];
  const depts = [
    'Production',
    'Engineering',
    'QA',
    'QC',
    'IPQA',
    'HR',
    'Admin',
    'Security',
    'Accounts',
    'R & D - F & D',
    'R & D - ADL',
    'R & D - Packaging',
    'QC Lab',
    'QC Micro Lab'
  ];

  plants.forEach(plant => {
    hierarchy[plant] = {};
    depts.forEach(dept => {
      hierarchy[plant][dept] = {};
      
      // First 6 areas are common
      commonAreasRaw.forEach(area => {
        hierarchy[plant][dept][area] = getMachinesForArea(area);
      });

      // From 7 onwards show separate for Plant 1 and Plant 2
      specificAreasRaw.forEach(area => {
        const areaWithSuffix = `${area} (${plant})`;
        hierarchy[plant][dept][areaWithSuffix] = getMachinesForArea(area);
      });
    });
  });

  return hierarchy;
};

export const PLANT_HIERARCHY = buildHierarchy();

export const REGISTRATION_DEPARTMENTS = [
  'Production',
  'Engineering',
  'QA',
  'QC',
  'IPQA',
  'HR',
  'Admin',
  'Security',
  'Accounts',
  'R & D - F & D',
  'R & D - ADL',
  'R & D - Packaging',
  'QC Lab',
  'QC Micro Lab'
];

