export const runtime = "nodejs";

import * as XLSX from "xlsx";
import { EXPECTED_HEADERS } from "@/types/import";

export async function GET() {
  const wb = XLSX.utils.book_new();

  const PLANTS_HEADERS: string[] = [...EXPECTED_HEADERS.Plants];
  const AUDITS_HEADERS: string[] = [...EXPECTED_HEADERS.Audits];
  const OBS_HEADERS: string[] = [...EXPECTED_HEADERS.Observations];

  // Plants sheet with sample data
  const plantsData: string[][] = [
    PLANTS_HEADERS,
    ['PLANT001', 'Mumbai Manufacturing Facility'],
    ['PLANT002', 'Delhi Production Unit'],
    ['PLANT003', 'Bangalore Technology Center'],
    ['PLANT004', 'Pune Assembly Plant']
  ];

  // Audits sheet with sample data
  const auditsData: string[][] = [
    AUDITS_HEADERS,
    ['AUD2024001', 'PLANT001', 'Q4 2024 Financial Audit', 'Annual financial controls review', '2024-10-01', '2024-10-15', 'PLANNED', 'audithead@example.com'],
    ['AUD2024002', 'PLANT002', 'Operational Process Review', 'Review of procurement and inventory processes', '2024-11-01', '2024-11-10', 'IN_PROGRESS', 'audithead@example.com'],
    ['AUD2024003', 'PLANT003', 'IT Security Assessment', 'Cybersecurity and data protection audit', '2024-12-01', '2024-12-20', 'PLANNED', '']
  ];

  // Observations sheet with sample data
  const observationsData: string[][] = [
    OBS_HEADERS,
    [
      'OBS001', 'AUD2024001', 'PLANT001',
      'Discrepancies found in vendor payment reconciliation process. Multiple instances where payments were made without proper three-way matching.',
      'A', 'ORG_WIDE', 'P2P', 'Rajesh Kumar', 'Finance Manager', 'CFO',
      'We acknowledge the finding and will implement automated three-way matching system',
      'Recommended implementation of SAP Ariba module for automated controls',
      '2025-03-31', 'Suresh Patel - Finance Director', 'PENDING_MR',
      '', '', 'false', 'cfo@example.com'
    ],
    [
      'OBS002', 'AUD2024001', 'PLANT001',
      'Inventory count variance exceeds acceptable threshold of 2%. Physical count shows 5% deviation from system records.',
      'B', 'LOCAL', 'INVENTORY', 'Priya Sharma', 'Warehouse Manager', 'Operations Head',
      'Cycle counting process will be enhanced with monthly reviews',
      'Agreed. Additional recommendation: implement RFID tracking for high-value items',
      '2025-02-28', 'Amit Singh - Warehouse Supervisor', 'MR_UNDER_REVIEW',
      '', '', 'false', 'cfo@example.com'
    ],
    [
      'OBS003', 'AUD2024002', 'PLANT002',
      'Order-to-Cash process lacks proper segregation of duties. Same person can create sales order, generate invoice, and post payment.',
      'A', 'ORG_WIDE', 'O2C', 'Anita Desai', 'Sales Head', 'Business Head',
      'Process redesign underway with new approval workflows',
      'System access rights need immediate revision as interim measure',
      '2025-01-31', 'Vikram Mehta - IT Manager', 'REFERRED_BACK',
      '', '', 'false', 'cfo@example.com'
    ],
    [
      'OBS004', 'AUD2024002', 'PLANT002',
      'Fixed asset register not updated for last 6 months. Recent acquisitions worth Rs. 2.5 Cr not reflected in SAP.',
      'C', 'LOCAL', 'R2R', 'Neha Gupta', 'Accounts Manager', '',
      'Data entry backlog being cleared, expected completion by month-end',
      'Implement monthly reconciliation process to prevent future backlogs',
      '2024-12-31', 'Deepak Joshi - Senior Accountant', 'OBSERVATION_FINALISED',
      '2024-12-15', 'PASS', 'false', 'cfo@example.com'
    ],
    [
      'OBS005', 'AUD2024003', 'PLANT003',
      'Database backup logs show 3 failed backups in last month. No automated alerting system in place for backup failures.',
      'B', 'ORG_WIDE', 'R2R', 'Karthik Iyer', 'IT Head', 'CTO',
      'Monitoring system procurement in progress, expected implementation in Q1 2025',
      'Backup policy needs revision to include real-time monitoring and escalation matrix',
      '2025-02-15', 'Ramesh Nair - IT Infrastructure Lead', 'PENDING_MR',
      '', '', 'false', 'cfo@example.com'
    ]
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(plantsData), "Plants");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(auditsData), "Audits");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(observationsData), "Observations");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="import-template.xlsx"'
    }
  });
}


