"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/contexts/ToastContext";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import {
  NotionTable,
  NotionTableCell,
  NotionTableHeader,
  NotionTableRow
} from "@/components/ui/NotionTable";

type KPI = {
  total: number;
  statusCounts: { PENDING: number; IN_PROGRESS: number; RESOLVED: number };
  approvalCounts: { DRAFT: number; SUBMITTED: number; APPROVED: number; REJECTED: number };
  byRisk: { A: number; B: number; C: number };
  published: { published: number; unpublished: number };
  due: { overdue: number; dueSoon: number; windowDays: number };
};

type TargetRow = {
  id: string;
  observationId: string;
  plan: string;
  owner?: string | null;
  targetDate: string;
  status?: string | null;
  retest?: "RETEST_DUE" | "PASS" | "FAIL" | null;
  plant: { code: string; name: string };
  observationStatus: string;
};

type Plant = { id: string; code: string; name: string };
type Audit = {
  id: string;
  title?: string | null;
  visitStartDate?: string | null;
  visitEndDate?: string | null;
  plant: Plant;
};

export default function ReportsPage() {
  const { showSuccess } = useToast();
  const [days, setDays] = useState(14);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [overdue, setOverdue] = useState<TargetRow[]>([]);
  const [dueSoon, setDueSoon] = useState<TargetRow[]>([]);

  // Filter data
  const [plants, setPlants] = useState<Plant[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);

  // Filter state
  const [plantId, setPlantId] = useState("");
  const [auditId, setAuditId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [risk, setRisk] = useState("");
  const [process, setProcess] = useState("");
  const [status, setStatus] = useState("");
  const [published, setPublished] = useState("");

  const savePreset = useCallback(() => {
    localStorage.setItem("reports.filters", JSON.stringify({ plantId, auditId, startDate, endDate, risk, process, status, published, days }));
  }, [plantId, auditId, startDate, endDate, risk, process, status, published, days]);

  const loadPreset = useCallback(() => {
    const raw = localStorage.getItem("reports.filters");
    if (!raw) return;
    try {
      const v = JSON.parse(raw);
      setPlantId(v.plantId || "");
      setAuditId(v.auditId || "");
      setStartDate(v.startDate || "");
      setEndDate(v.endDate || "");
      setRisk(v.risk || "");
      setProcess(v.process || "");
      setStatus(v.status || "");
      setPublished(v.published || "");
      if (v.days) setDays(v.days);
    } catch {
      // Ignore
    }
  }, []);

  const loadPresetManual = () => {
    const raw = localStorage.getItem("reports.filters");
    if (!raw) return;
    try {
      const v = JSON.parse(raw);
      setPlantId(v.plantId || "");
      setAuditId(v.auditId || "");
      setStartDate(v.startDate || "");
      setEndDate(v.endDate || "");
      setRisk(v.risk || "");
      setProcess(v.process || "");
      setStatus(v.status || "");
      setPublished(v.published || "");
      if (v.days) setDays(v.days);
    } catch {
      // Ignore
    }
  };

  const resetFilters = useCallback(() => {
    setPlantId("");
    setAuditId("");
    setStartDate("");
    setEndDate("");
    setRisk("");
    setProcess("");
    setStatus("");
    setPublished("");
    setDays(14);
    localStorage.removeItem("reports.filters");
  }, []);

  const exportPeriodReport = () => {
    const qs = new URLSearchParams();
    if (plantId) qs.set("plantId", plantId);
    if (auditId) qs.set("auditId", auditId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    if (risk) qs.set("risk", risk);
    if (process) qs.set("process", process);
    if (status) qs.set("status", status);
    if (published) qs.set("published", published);
    window.location.href = `/api/v1/reports/period/export?${qs.toString()}`;
    showSuccess("Period report export started! Download will begin shortly.");
  };

  const exportRetestReport = () => {
    const qs = new URLSearchParams();
    if (plantId) qs.set("plantId", plantId);
    if (auditId) qs.set("auditId", auditId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    if (risk) qs.set("risk", risk);
    if (process) qs.set("process", process);
    if (status) qs.set("status", status);
    if (published) qs.set("published", published);
    window.location.href = `/api/v1/reports/retest/export?${qs.toString()}`;
    showSuccess("Retest report export started! Download will begin shortly.");
  };

  const load = useCallback(async () => {
    // Build query string from filters
    const qs = new URLSearchParams();
    qs.set("days", days.toString());
    if (plantId) qs.set("plantId", plantId);
    if (auditId) qs.set("auditId", auditId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    if (risk) qs.set("risk", risk);
    if (process) qs.set("process", process);
    if (status) qs.set("status", status);
    if (published) qs.set("published", published);

    const [oRes, tRes] = await Promise.all([
      fetch(`/api/v1/reports/overview?${qs.toString()}`, { cache: "no-store" }),
      fetch(`/api/v1/reports/targets?${qs.toString()}`, { cache: "no-store" })
    ]);
    if (oRes.ok) setKpi(await oRes.json());
    const tj = await tRes.json();
    if (tRes.ok) {
      setOverdue(tj.overdue || []);
      setDueSoon(tj.dueSoon || []);
    }
  }, [days, plantId, auditId, startDate, endDate, risk, process, status, published]);

  const loadMeta = async () => {
    const [pRes, aRes] = await Promise.all([
      fetch("/api/v1/plants", { cache: "no-store" }),
      fetch("/api/v1/audits", { cache: "no-store" })
    ]);
    const pJ = await pRes.json();
    const aJ = await aRes.json();
    if (pRes.ok) setPlants(pJ.plants || []);
    if (aRes.ok) setAudits(aJ.audits || []);
  };

  useEffect(() => {
    loadPreset();
    loadMeta();
  }, [loadPreset]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-neutral-900">Reports</h1>
        <p className="text-base text-neutral-600 mt-2">View analytics and export audit reports</p>
      </div>

      <Card padding="lg">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Filters</h2>
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select label="Plant" value={plantId} onChange={(e) => setPlantId(e.target.value)}>
              <option value="">All</option>
              {plants.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </Select>

            <Select label="Audit" value={auditId} onChange={(e) => setAuditId(e.target.value)}>
              <option value="">All</option>
              {audits.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title || "Untitled"} — {a.plant.code} ({a.visitStartDate ? new Date(a.visitStartDate).toLocaleDateString() : "?"})
                </option>
              ))}
            </Select>

            <Input
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <Input
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select label="Risk Category" value={risk} onChange={(e) => setRisk(e.target.value)}>
              <option value="">All</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </Select>

            <Select label="Process" value={process} onChange={(e) => setProcess(e.target.value)}>
              <option value="">All</option>
              <option value="O2C">O2C</option>
              <option value="P2P">P2P</option>
              <option value="R2R">R2R</option>
              <option value="INVENTORY">Inventory</option>
            </Select>

            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="PENDING_MR">Pending MR</option>
              <option value="MR_UNDER_REVIEW">MR Under Review</option>
              <option value="REFERRED_BACK">Referred Back</option>
              <option value="OBSERVATION_FINALISED">Observation Finalised</option>
              <option value="RESOLVED">Resolved</option>
            </Select>

            <Select label="Published" value={published} onChange={(e) => setPublished(e.target.value)}>
              <option value="">Any</option>
              <option value="1">Published</option>
              <option value="0">Unpublished</option>
            </Select>
          </div>

          <div className="flex gap-3 flex-wrap pt-4 border-t border-neutral-200">
            <Button variant="secondary" size="sm" onClick={savePreset}>Save Preset</Button>
            <Button variant="secondary" size="sm" onClick={loadPresetManual}>Load Preset</Button>
            <Button variant="secondary" size="sm" onClick={resetFilters}>Reset Filters</Button>
            <div className="ml-auto flex gap-3">
              <Button variant="primary" size="sm" onClick={exportPeriodReport}>Download Period Report</Button>
              <Button variant="primary" size="sm" onClick={exportRetestReport}>Download Retest Report</Button>
            </div>
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-neutral-700">Due window (days)</label>
          <Input
            type="number"
            min={1}
            max={60}
            value={days.toString()}
            onChange={(e) => setDays(parseInt(e.target.value || "14", 10))}
            className="w-24"
          />
          <p className="text-sm text-neutral-600">Show action plans due within this time frame</p>
        </div>
      </Card>

      {kpi && (
        <>
          <div>
            <h2 className="text-sm font-semibold text-neutral-700 mb-4 uppercase tracking-wider">Overview</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card padding="lg" hover>
                <div className="text-neutral-600 text-sm font-medium mb-2">Total Observations</div>
                <div className="text-4xl font-bold text-neutral-900">{kpi.total}</div>
              </Card>
              <Card padding="lg" hover>
                <div className="text-neutral-600 text-sm font-medium mb-2">Pending</div>
                <div className="text-4xl font-bold text-warning-600">{kpi.statusCounts.PENDING}</div>
              </Card>
              <Card padding="lg" hover>
                <div className="text-neutral-600 text-sm font-medium mb-2">In Progress</div>
                <div className="text-4xl font-bold text-primary-600">{kpi.statusCounts.IN_PROGRESS}</div>
              </Card>
              <Card padding="lg" hover>
                <div className="text-neutral-600 text-sm font-medium mb-2">Resolved</div>
                <div className="text-4xl font-bold text-success-600">{kpi.statusCounts.RESOLVED}</div>
              </Card>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <Card padding="lg">
              <div className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">Approvals</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Draft</span>
                  <div className="min-w-[60px] flex justify-end">
                    <Badge variant="neutral">{kpi.approvalCounts.DRAFT}</Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Submitted</span>
                  <div className="min-w-[60px] flex justify-end">
                    <Badge variant="warning">{kpi.approvalCounts.SUBMITTED}</Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Approved</span>
                  <div className="min-w-[60px] flex justify-end">
                    <Badge variant="success">{kpi.approvalCounts.APPROVED}</Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Rejected</span>
                  <div className="min-w-[60px] flex justify-end">
                    <Badge variant="error">{kpi.approvalCounts.REJECTED}</Badge>
                  </div>
                </div>
              </div>
            </Card>
            <Card padding="lg">
              <div className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">Publication Status</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Published</span>
                  <div className="min-w-[60px] flex justify-end">
                    <Badge variant="success">{kpi.published.published}</Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Unpublished</span>
                  <div className="min-w-[60px] flex justify-end">
                    <Badge variant="neutral">{kpi.published.unpublished}</Badge>
                  </div>
                </div>
              </div>
            </Card>
            <Card padding="lg">
              <div className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">By Risk Category</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Category A</span>
                  <div className="min-w-[60px] flex justify-end">
                    <Badge variant="error">{kpi.byRisk.A}</Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Category B</span>
                  <div className="min-w-[60px] flex justify-end">
                    <Badge variant="warning">{kpi.byRisk.B}</Badge>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Category C</span>
                  <div className="min-w-[60px] flex justify-end">
                    <Badge variant="neutral">{kpi.byRisk.C}</Badge>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card variant="feature">
          <NotionTableHeader
            title="Overdue Action Plans"
            description="Action plans past their target dates."
            actions={
              <span className="inline-flex items-center px-3 py-1.5 rounded-300 bg-notion-bacSec text-sm text-notion-texSec">
                {overdue.length} item{overdue.length === 1 ? "" : "s"}
              </span>
            }
          />
          <NotionTable density="compact">
            <thead>
              <NotionTableRow hoverable={false}>
                <NotionTableCell as="th" scope="col">
                  Plant
                </NotionTableCell>
                <NotionTableCell as="th" scope="col">
                  Plan
                </NotionTableCell>
                <NotionTableCell as="th" scope="col">
                  Target
                </NotionTableCell>
                <NotionTableCell as="th" scope="col">
                  Owner
                </NotionTableCell>
                <NotionTableCell as="th" scope="col">
                  Retest
                </NotionTableCell>
              </NotionTableRow>
            </thead>
            <tbody>
              {overdue.map((record) => (
                <NotionTableRow key={record.id}>
                  <NotionTableCell className="font-medium text-gray-900">
                    {record.plant.code}
                  </NotionTableCell>
                  <NotionTableCell className="max-w-xs" title={record.plan}>
                    <div className="truncate text-notion-texPri">{record.plan}</div>
                  </NotionTableCell>
                  <NotionTableCell muted>
                    {new Date(record.targetDate).toLocaleDateString()}
                  </NotionTableCell>
                  <NotionTableCell muted>
                    {record.owner ?? "—"}
                  </NotionTableCell>
                  <NotionTableCell>
                    {record.retest === "RETEST_DUE" && <Badge variant="warning">Due</Badge>}
                    {record.retest === "PASS" && <Badge variant="success">Pass</Badge>}
                    {record.retest === "FAIL" && <Badge variant="error">Fail</Badge>}
                    {!record.retest && <span className="text-text-light">—</span>}
                  </NotionTableCell>
                </NotionTableRow>
              ))}
              {overdue.length === 0 && (
                <NotionTableRow hoverable={false}>
                  <NotionTableCell colSpan={5} align="center" className="py-8 notion-table-cell-muted">
                    No overdue action plans
                  </NotionTableCell>
                </NotionTableRow>
              )}
            </tbody>
          </NotionTable>
        </Card>

        <Card variant="feature">
          <NotionTableHeader
            title={`Due Soon (next ${days} days)`}
            description="Upcoming actions within the selected window."
            actions={
              <span className="inline-flex items-center px-3 py-1.5 rounded-300 bg-notion-bacSec text-sm text-notion-texSec">
                {dueSoon.length} item{dueSoon.length === 1 ? "" : "s"}
              </span>
            }
          />
          <NotionTable density="compact">
            <thead>
              <NotionTableRow hoverable={false}>
                <NotionTableCell as="th" scope="col">
                  Plant
                </NotionTableCell>
                <NotionTableCell as="th" scope="col">
                  Plan
                </NotionTableCell>
                <NotionTableCell as="th" scope="col">
                  Target
                </NotionTableCell>
                <NotionTableCell as="th" scope="col">
                  Owner
                </NotionTableCell>
                <NotionTableCell as="th" scope="col">
                  Retest
                </NotionTableCell>
              </NotionTableRow>
            </thead>
            <tbody>
              {dueSoon.map((record) => (
                <NotionTableRow key={record.id}>
                  <NotionTableCell className="font-medium text-gray-900">
                    {record.plant.code}
                  </NotionTableCell>
                  <NotionTableCell className="max-w-xs" title={record.plan}>
                    <div className="truncate text-notion-texPri">{record.plan}</div>
                  </NotionTableCell>
                  <NotionTableCell muted>
                    {new Date(record.targetDate).toLocaleDateString()}
                  </NotionTableCell>
                  <NotionTableCell muted>
                    {record.owner ?? "—"}
                  </NotionTableCell>
                  <NotionTableCell>
                    {record.retest === "RETEST_DUE" && <Badge variant="warning">Due</Badge>}
                    {record.retest === "PASS" && <Badge variant="success">Pass</Badge>}
                    {record.retest === "FAIL" && <Badge variant="error">Fail</Badge>}
                    {!record.retest && <span className="text-text-light">—</span>}
                  </NotionTableCell>
                </NotionTableRow>
              ))}
              {dueSoon.length === 0 && (
                <NotionTableRow hoverable={false}>
                  <NotionTableCell colSpan={5} align="center" className="py-8 notion-table-cell-muted">
                    No action plans due soon
                  </NotionTableCell>
                </NotionTableRow>
              )}
            </tbody>
          </NotionTable>
        </Card>
      </div>
    </div>
  );
}