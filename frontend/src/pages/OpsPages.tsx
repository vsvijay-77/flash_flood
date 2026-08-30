import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Brain, Download, FileText, Info, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingRows, PageHeader, RiskIndicator, SectionCard, StatCard, StatusPill } from "@/components/Primitives";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { apiErrorMessage, useSession } from "@/lib/session";
import { HAZARD_LABELS, ROLE_LABELS, SENSOR_LABELS, type Alert, type Report, type RiskAssessment, type Role, type Sensor, type SimulationResult, type User, type Zone } from "@/lib/types";

const useZones = () => useQuery({ queryKey: ["zones"], queryFn: () => apiGet<Zone[]>("/zones"), retry: false });

const SCENARIOS = [
  { value: "flood", label: "Flood Simulation" },
  { value: "landslide", label: "Landslide Simulation" },
  { value: "forest_fire", label: "Forest Fire Spread" },
  { value: "evacuation", label: "Evacuation Route Simulation" },
];
const SCENARIO_LABELS: Record<string, string> = Object.fromEntries(SCENARIOS.map((s) => [s.value, s.label]));

export function DigitalTwinPage() {
  const zones = useZones();
  const [zoneId, setZoneId] = useState("");
  const [scenario, setScenario] = useState("flood");
  const [rainfall, setRainfall] = useState(70);
  const [saturation, setSaturation] = useState(65);
  const [slope, setSlope] = useState(32);
  const [wind, setWind] = useState(18);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const zoneList = zones.data ?? [];
  const effectiveZone = zoneId || zoneList[0]?.id || "";

  const run = useMutation({
    mutationFn: () =>
      apiPost<SimulationResult>("/simulations", {
        zone_id: effectiveZone,
        scenario,
        rainfall_intensity: rainfall,
        soil_saturation: saturation,
        slope_angle: slope,
        wind_speed: wind,
      }),
    onSuccess: (res) => {
      setResult(res);
      toast.success(`${SCENARIO_LABELS[res.scenario] ?? res.scenario} completed — severity ${res.severity}`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Simulation could not be executed.")),
  });

  const slider = (label: string, value: number, setter: (v: number) => void, min: number, max: number, unit: string, testId: string) => (
    <div>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="font-mono text-xs font-semibold text-[#0F4C81]">{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setter(Number(e.target.value))}
        className="mt-2 w-full accent-[#0F4C81]"
        data-testid={testId}
      />
    </div>
  );

  return (
    <div data-testid="digital-twin-page">
      <PageHeader title="Digital Twin" description="Simulate hazard propagation and evacuation windows over a terrain twin of the selected zone." />
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="border-slate-200/80 p-6" data-testid="digital-twin-controls">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Simulation Controls</p>
          <div className="mt-4 space-y-5">
            <div>
              <Label>Monitoring Zone</Label>
              <Select value={effectiveZone} onValueChange={(v: string) => setZoneId(v)}>
                <SelectTrigger className="mt-1.5 w-full" data-testid="twin-zone-trigger">
                  <SelectValue placeholder="Select zone">{(v) => zoneList.find((z) => z.id === v)?.name ?? "Select zone"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {zoneList.map((z) => (
                    <SelectItem key={z.id} value={z.id} data-testid={`twin-zone-${z.id}`}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Scenario</Label>
              <Select value={scenario} onValueChange={(v: string) => setScenario(v)}>
                <SelectTrigger className="mt-1.5 w-full" data-testid="twin-scenario-trigger">
                  <SelectValue>{(v) => SCENARIO_LABELS[v as string] ?? "Select scenario"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {SCENARIOS.map((s) => (
                    <SelectItem key={s.value} value={s.value} data-testid={`twin-scenario-${s.value}`}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {slider("Rainfall intensity", rainfall, setRainfall, 10, 150, "mm/h", "twin-rainfall-slider")}
            {slider("Soil saturation", saturation, setSaturation, 0, 100, "%", "twin-saturation-slider")}
            {slider("Slope angle", slope, setSlope, 0, 70, "°", "twin-slope-slider")}
            {slider("Wind speed", wind, setWind, 0, 150, "km/h", "twin-wind-slider")}

            <Button size="lg" className="w-full" disabled={run.isPending || !effectiveZone} onClick={() => run.mutate()} data-testid="run-simulation-btn">
              {run.isPending ? "Running simulation…" : <><Play className="mr-2 size-4" /> RUN SIMULATION</>}
            </Button>
          </div>
        </Card>

        <SectionCard testId="digital-twin-output" title="Twin projection" description="12-hour hazard propagation forecast">
          {run.isPending ? (
            <div data-testid="simulation-progress">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-[#0F4C81]" />
              </div>
              <p className="mt-3 text-sm text-slate-600">Solving terrain hydrology and propagation kernels…</p>
            </div>
          ) : !result ? (
            <EmptyState testId="simulation-empty" title="No simulation run yet" description="Configure the parameters and run a simulation to project hazard propagation." />
          ) : (
            <div data-testid="simulation-result">
              <div className="grid gap-4 sm:grid-cols-4">
                <StatCard testId="sim-kpi-severity" label="Severity" value={result.severity} tone="red" />
                <StatCard testId="sim-kpi-impact" label="Peak impact" value={`${result.peak_impact_pct}%`} tone="amber" />
                <StatCard testId="sim-kpi-area" label="Affected area" value={`${result.affected_area_km2} km²`} tone="teal" />
                <StatCard testId="sim-kpi-evac" label="Evac window" value={`${result.evacuation_time_min} min`} tone="green" />
              </div>
              <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700" data-testid="simulation-summary">{result.summary}</p>
              <ResponsiveContainer width="100%" height={240} className="mt-5">
                <AreaChart data={result.steps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} unit="h" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="impact_pct" name="Impact %" stroke="#DC2626" fill="#DC2626" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="affected_area_km2" name="Area km²" stroke="#0F4C81" fill="#0F4C81" fillOpacity={0.12} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export function RiskAssessmentPage() {
  const { data, isLoading } = useQuery({ queryKey: ["risk"], queryFn: () => apiGet<RiskAssessment[]>("/risk"), retry: false });
  const list = data ?? [];
  const [selectedId, setSelectedId] = useState("");
  const active = list.find((r) => r.zone_id === selectedId) ?? list[0] ?? null;

  return (
    <div data-testid="risk-assessment-page">
      <PageHeader title="AI Risk Assessment" description="Multi-agent risk scoring derived from live telemetry, satellite intelligence and historical hazard datasets." />

      {isLoading ? (
        <LoadingRows rows={4} />
      ) : !active ? (
        <EmptyState testId="risk-empty" title="No assessments available" description="Risk scoring becomes available once monitoring zones report telemetry." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <Card className="border-slate-200/80 p-5" data-testid="risk-zone-list">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Monitoring Zones</p>
            <ul className="mt-4 space-y-2">
              {list.map((r) => (
                <li key={r.zone_id}>
                  <button
                    onClick={() => setSelectedId(r.zone_id)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors duration-150 ${active.zone_id === r.zone_id ? "border-[#0F4C81] bg-[#0F4C81]/5" : "border-slate-200 hover:bg-slate-50"}`}
                    data-testid={`risk-zone-btn-${r.zone_id}`}
                  >
                    <span className="block text-sm font-semibold text-slate-900">{r.zone_name}</span>
                    <span className="mt-1 flex items-center justify-between">
                      <RiskIndicator level={r.risk_level} />
                      <span className="font-mono text-sm font-bold text-slate-900">{r.risk_score}%</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <div className="space-y-6">
            <SectionCard testId="risk-score-card" title={`Current risk score — ${active.zone_name}`} description={`Last analysis ${new Date(active.analyzed_at).toLocaleString()}`}>
              <div className="flex flex-wrap items-center gap-8">
                <div className="relative grid size-36 place-items-center">
                  <svg viewBox="0 0 120 120" className="size-36 -rotate-90">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="#E2E8F0" strokeWidth="10" />
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke={active.risk_score >= 75 ? "#DC2626" : active.risk_score >= 55 ? "#EA580C" : active.risk_score >= 30 ? "#D97706" : "#15803D"}
                      strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${(active.risk_score / 100) * 327} 327`}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <p className="font-mono text-3xl font-bold text-slate-900" data-testid="risk-score-value">{active.risk_score}%</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{active.risk_level}</p>
                  </div>
                </div>
                <div className="min-w-[220px] flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Contributing factors</p>
                  <ul className="mt-3 space-y-2.5">
                    {active.factors.map((f) => (
                      <li key={f.name} data-testid={`risk-factor-${f.name.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">{f.name}</span>
                          <span className="font-mono text-slate-500">{f.value}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-[#0F4C81]" style={{ width: `${Math.min(100, f.weight * 2.8)}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </SectionCard>

            <SectionCard testId="risk-recommendation-card" title="AI recommendation" description={`Confidence ${active.confidence}%`}>
              <p className="flex items-start gap-3 rounded-lg border border-[#0F4C81]/20 bg-[#0F4C81]/[0.05] px-4 py-3 text-sm leading-relaxed text-slate-800" data-testid="risk-recommendation-text">
                <Brain className="mt-0.5 size-4 shrink-0 text-[#0F4C81]" />
                {active.recommendation}
              </p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Data sources used</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">{active.data_sources.map((d) => <li key={d}>• {d}</li>)}</ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Models applied</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">{active.models_used.map((m) => <li key={m}>• {m}</li>)}</ul>
                </div>
              </div>
              <p className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900" data-testid="risk-disclaimer">
                <Info className="mt-0.5 size-4 shrink-0" />
                {active.disclaimer}
              </p>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  );
}

const LEVELS = ["critical", "high", "medium", "low"] as const;

export function AlertsPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const [level, setLevel] = useState("");
  const [hazard, setHazard] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");

  const params = new URLSearchParams();
  if (level) params.set("risk_level", level);
  if (hazard) params.set("hazard_type", hazard);
  if (status) params.set("status", status);
  if (query) params.set("location", query);
  const qs = params.toString();

  const { data, isLoading } = useQuery({
    queryKey: ["alerts", qs],
    queryFn: () => apiGet<Alert[]>(`/alerts${qs ? `?${qs}` : ""}`),
    retry: false,
  });

  const act = useMutation({
    mutationFn: (vars: { id: string; action: string; assigned_to?: string }) =>
      apiPost<Alert>(`/alerts/${vars.id}/action`, { action: vars.action, assigned_to: vars.assigned_to ?? "" }),
    onSuccess: (a) => {
      toast.success(`Alert ${a.code} → ${a.status}`);
      qc.invalidateQueries({ queryKey: ["alerts"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Action failed.")),
  });

  const list = data ?? [];
  const canAct = user?.role !== "viewer";

  return (
    <div data-testid="alerts-page">
      <PageHeader title="Alerts Center" description="Government-grade alert triage — acknowledge, assign and resolve hazard notifications." />

      <Card className="mb-6 border-slate-200/80 p-5" data-testid="alert-filters">
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <Label>Risk Level</Label>
            <Select value={level} onValueChange={(v: string) => setLevel(v === "all" ? "" : v)}>
              <SelectTrigger className="mt-1.5 w-full" data-testid="alert-filter-level"><SelectValue placeholder="All levels">{(v) => (v === "all" || !v ? "All levels" : String(v).toUpperCase())}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="alert-filter-level-all">All levels</SelectItem>
                {LEVELS.map((l) => <SelectItem key={l} value={l} data-testid={`alert-filter-level-${l}`}>{l.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Hazard Type</Label>
            <Select value={hazard} onValueChange={(v: string) => setHazard(v === "all" ? "" : v)}>
              <SelectTrigger className="mt-1.5 w-full" data-testid="alert-filter-hazard"><SelectValue placeholder="All hazards">{(v) => (v === "all" || !v ? "All hazards" : HAZARD_LABELS[v as string] ?? String(v))}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="alert-filter-hazard-all">All hazards</SelectItem>
                {Object.entries(HAZARD_LABELS).map(([k, v]) => <SelectItem key={k} value={k} data-testid={`alert-filter-hazard-${k}`}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: string) => setStatus(v === "all" ? "" : v)}>
              <SelectTrigger className="mt-1.5 w-full" data-testid="alert-filter-status"><SelectValue placeholder="All statuses">{(v) => (v === "all" || !v ? "All statuses" : String(v))}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="alert-filter-status-all">All statuses</SelectItem>
                {["open", "acknowledged", "assigned", "resolved"].map((s) => <SelectItem key={s} value={s} data-testid={`alert-filter-status-${s}`}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="alert-search">Location</Label>
            <Input id="alert-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="District or zone" className="mt-1.5" data-testid="alert-filter-location" />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <LoadingRows rows={4} />
      ) : list.length === 0 ? (
        <EmptyState testId="alerts-empty" title="No alerts match these filters" description="Adjust the risk level, hazard type or location filters." />
      ) : (
        <div className="space-y-4" data-testid="alerts-list">
          {list.map((a) => (
            <Card key={a.id} className="border-slate-200/80 p-5" data-testid={`alert-card-${a.code}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskIndicator level={a.risk_level} testId={`alert-risk-${a.code}`} />
                    <StatusPill status={a.status} testId={`alert-status-${a.code}`} />
                    <span className="font-mono text-[11px] font-semibold text-slate-400">{a.code}</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">{a.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{a.detail}</p>
                  <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                    {a.location} · {HAZARD_LABELS[a.hazard_type] ?? a.hazard_type} · {new Date(a.created_at).toLocaleString()}
                    {a.assigned_to ? ` · assigned to ${a.assigned_to}` : ""}
                  </p>
                </div>
                {canAct ? (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" disabled={act.isPending || a.status !== "open"} onClick={() => act.mutate({ id: a.id, action: "acknowledge" })} data-testid={`alert-acknowledge-btn-${a.code}`}>Acknowledge</Button>
                    <Button variant="outline" size="sm" disabled={act.isPending || a.status === "resolved"} onClick={() => act.mutate({ id: a.id, action: "assign", assigned_to: `${user?.first_name ?? "Officer"} ${user?.last_name ?? ""}`.trim() })} data-testid={`alert-assign-btn-${a.code}`}>Assign Officer</Button>
                    <Button size="sm" disabled={act.isPending || a.status === "resolved"} onClick={() => act.mutate({ id: a.id, action: "resolve" })} data-testid={`alert-resolve-btn-${a.code}`}>Resolve</Button>
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReportsPage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const { data, isLoading } = useQuery({ queryKey: ["reports"], queryFn: () => apiGet<Report[]>("/reports"), retry: false });
  const [title, setTitle] = useState("");

  const create = useMutation({
    mutationFn: () => apiPost<Report>("/reports", { title, report_type: "Risk Assessment", period: "Last 30 days" }),
    onSuccess: () => {
      toast.success("Report generated and queued for download");
      setTitle("");
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Report generation failed.")),
  });

  const list = data ?? [];
  const canCreate = user?.role === "admin" || user?.role === "gov_officer";

  const download = (r: Report) => {
    const csv = `Title,Type,Period,Zone,Status,Generated\n"${r.title}","${r.report_type}","${r.period}","${r.zone_name}","${r.status}","${r.created_at}"\n`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.title.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported as CSV");
  };

  return (
    <div data-testid="reports-page">
      <PageHeader title="Reports" description="Generated hazard, risk and compliance reports available for departmental export." />

      {canCreate ? (
        <Card className="mb-6 border-slate-200/80 p-5" data-testid="report-generator">
          <Label htmlFor="report-title">Generate a new report</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            <Input id="report-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monsoon Risk Digest — Wayanad" className="max-w-md" data-testid="report-title-input" />
            <Button disabled={title.trim().length < 3 || create.isPending} onClick={() => create.mutate()} data-testid="report-generate-btn">
              <FileText className="mr-2 size-4" /> {create.isPending ? "Generating…" : "Generate Report"}
            </Button>
          </div>
        </Card>
      ) : null}

      <SectionCard testId="reports-card" title="Report library" description={`${list.length} reports available`}>
        {isLoading ? (
          <LoadingRows rows={3} />
        ) : list.length === 0 ? (
          <EmptyState testId="reports-empty" title="No reports yet" description="Generate a report to build the departmental library." />
        ) : (
          <Table data-testid="reports-table">
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Export</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((r) => (
                <TableRow key={r.id} data-testid={`report-row-${r.id}`}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell className="text-xs text-slate-500">{r.report_type}</TableCell>
                  <TableCell className="text-xs text-slate-500">{r.period}</TableCell>
                  <TableCell><StatusPill status={r.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="xs" onClick={() => download(r)} data-testid={`report-download-btn-${r.id}`}>
                      <Download className="mr-1.5 size-3.5" /> CSV
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}

export function SensorManagementPage() {
  const qc = useQueryClient();
  const zones = useZones();
  const { data, isLoading } = useQuery({ queryKey: ["sensors"], queryFn: () => apiGet<Sensor[]>("/sensors"), retry: false });
  const [form, setForm] = useState({ code: "", name: "", sensor_type: "rainfall", zone_id: "" });

  const zoneList = zones.data ?? [];
  const zoneId = form.zone_id || zoneList[0]?.id || "";

  const create = useMutation({
    mutationFn: () => {
      const zone = zoneList.find((z) => z.id === zoneId);
      return apiPost<Sensor>("/sensors", {
        code: form.code, name: form.name, sensor_type: form.sensor_type, zone_id: zoneId,
        lat: zone ? zone.lat + 0.01 : 21.0, lng: zone ? zone.lng + 0.01 : 79.0, status: "online", battery: 100, unit: "",
      });
    },
    onSuccess: (s) => {
      toast.success(`Sensor ${s.code} commissioned`);
      setForm({ code: "", name: "", sensor_type: "rainfall", zone_id: "" });
      qc.invalidateQueries({ queryKey: ["sensors"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      qc.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Sensor could not be commissioned.")),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<{ message: string }>(`/sensors/${id}`),
    onSuccess: (r) => {
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ["sensors"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const list = data ?? [];

  return (
    <div data-testid="sensor-management-page">
      <PageHeader title="Sensor Management" description="Commission, monitor and decommission LoRaWAN sensor nodes across the network." />

      <Card className="mb-6 border-slate-200/80 p-6" data-testid="sensor-create-form">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Commission new sensor node</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <div>
            <Label htmlFor="sensor-code">Node Code</Label>
            <Input id="sensor-code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="CHM-RAI-09" className="mt-1.5" data-testid="sensor-code-input" />
          </div>
          <div>
            <Label htmlFor="sensor-name">Node Name</Label>
            <Input id="sensor-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Rainfall Gauge 9" className="mt-1.5" data-testid="sensor-name-input" />
          </div>
          <div>
            <Label>Sensor Type</Label>
            <Select value={form.sensor_type} onValueChange={(v: string) => setForm((p) => ({ ...p, sensor_type: v }))}>
              <SelectTrigger className="mt-1.5 w-full" data-testid="sensor-type-trigger"><SelectValue>{(v) => SENSOR_LABELS[v as string] ?? "Select type"}</SelectValue></SelectTrigger>
              <SelectContent>
                {Object.entries(SENSOR_LABELS).map(([k, v]) => <SelectItem key={k} value={k} data-testid={`sensor-type-${k}`}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Monitoring Zone</Label>
            <Select value={zoneId} onValueChange={(v: string) => setForm((p) => ({ ...p, zone_id: v }))}>
              <SelectTrigger className="mt-1.5 w-full" data-testid="sensor-zone-trigger"><SelectValue>{(v) => zoneList.find((z) => z.id === v)?.name ?? "Select zone"}</SelectValue></SelectTrigger>
              <SelectContent>
                {zoneList.map((z) => <SelectItem key={z.id} value={z.id} data-testid={`sensor-zone-${z.id}`}>{z.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="mt-4" disabled={form.code.length < 2 || form.name.length < 2 || !zoneId || create.isPending} onClick={() => create.mutate()} data-testid="sensor-create-btn">
          {create.isPending ? "Commissioning…" : "Commission Sensor"}
        </Button>
      </Card>

      <SectionCard testId="sensor-inventory-card" title="Sensor inventory" description={`${list.length} nodes registered`}>
        {isLoading ? (
          <LoadingRows rows={5} />
        ) : list.length === 0 ? (
          <EmptyState testId="sensor-inventory-empty" title="No sensors registered" description="Commission your first LoRaWAN node above." />
        ) : (
          <Table data-testid="sensor-inventory-table">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead><TableHead>Type</TableHead><TableHead>Zone</TableHead>
                <TableHead>Battery</TableHead><TableHead>Signal</TableHead><TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((s) => (
                <TableRow key={s.id} data-testid={`sensor-mgmt-row-${s.code}`}>
                  <TableCell className="font-mono text-xs font-semibold">{s.code}</TableCell>
                  <TableCell>{SENSOR_LABELS[s.sensor_type] ?? s.sensor_type}</TableCell>
                  <TableCell className="text-xs text-slate-500">{s.zone_name}</TableCell>
                  <TableCell className="font-mono text-xs">{s.battery}%</TableCell>
                  <TableCell className="font-mono text-xs">{s.signal_dbm} dBm</TableCell>
                  <TableCell><StatusPill status={s.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="xs" className="text-red-700 hover:bg-red-50" disabled={remove.isPending} onClick={() => remove.mutate(s.id)} data-testid={`sensor-delete-btn-${s.code}`}>Decommission</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}

export function UserManagementPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => apiGet<User[]>("/users"), retry: false });

  const update = useMutation({
    mutationFn: (vars: { id: string; role?: Role; status?: string }) =>
      apiPatch<User>(`/users/${vars.id}`, { role: vars.role, status: vars.status }),
    onSuccess: (u) => {
      toast.success(`${u.email} updated`);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const list = data ?? [];

  return (
    <div data-testid="user-management-page">
      <PageHeader title="User Management" description="Verify departmental accounts and assign clearance levels." />
      <SectionCard testId="users-card" title="Registered officers" description={`${list.length} accounts`}>
        {isLoading ? (
          <LoadingRows rows={4} />
        ) : list.length === 0 ? (
          <EmptyState testId="users-empty" title="No accounts registered" />
        ) : (
          <Table data-testid="users-table">
            <TableHeader>
              <TableRow>
                <TableHead>Officer</TableHead><TableHead>Organization</TableHead><TableHead>Clearance</TableHead>
                <TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((u) => (
                <TableRow key={u.id} data-testid={`user-row-${u.email}`}>
                  <TableCell>
                    <span className="block font-medium text-slate-900">{u.first_name} {u.last_name}</span>
                    <span className="block font-mono text-[11px] text-slate-500">{u.email}</span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{u.organization}</TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(v: string) => update.mutate({ id: u.id, role: v as Role })}>
                      <SelectTrigger size="sm" className="w-[170px]" data-testid={`user-role-trigger-${u.email}`}>
                        <SelectValue>{(v) => ROLE_LABELS[v as Role] ?? String(v)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                          <SelectItem key={r} value={r} data-testid={`user-role-${r}`}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><StatusPill status={u.status} testId={`user-status-${u.email}`} /></TableCell>
                  <TableCell className="text-right">
                    {u.status === "active" ? (
                      <Button variant="outline" size="xs" onClick={() => update.mutate({ id: u.id, status: "suspended" })} data-testid={`user-suspend-btn-${u.email}`}>Suspend</Button>
                    ) : (
                      <Button size="xs" onClick={() => update.mutate({ id: u.id, status: "active" })} data-testid={`user-verify-btn-${u.email}`}>Verify &amp; Activate</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}

export function ProfilePage() {
  const qc = useQueryClient();
  const { user } = useSession();
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", organization: "" });
  const [pw, setPw] = useState({ current_password: "", new_password: "" });

  const save = useMutation({
    mutationFn: () =>
      apiPatch<User>("/auth/me", {
        first_name: form.first_name || user?.first_name,
        last_name: form.last_name || user?.last_name,
        phone: form.phone || user?.phone,
        organization: form.organization || user?.organization,
      }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const changePw = useMutation({
    mutationFn: () => apiPost<{ message: string }>("/auth/change-password", pw),
    onSuccess: (r) => { toast.success(r.message); setPw({ current_password: "", new_password: "" }); },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <div data-testid="profile-page">
      <PageHeader title="My Profile" description="Departmental identity, clearance level and account security." />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard testId="profile-details-card" title="Officer details">
          <dl className="space-y-2.5 text-sm">
            {[
              ["Name", `${user?.first_name ?? ""} ${user?.last_name ?? ""}`],
              ["Role", ROLE_LABELS[user?.role ?? "viewer"]],
              ["Designation", user?.designation ?? "—"],
              ["Department", user?.organization ?? "—"],
              ["Email", user?.email ?? "—"],
              ["Phone", user?.phone ?? "—"],
              ["Jurisdiction", `${user?.district ?? "—"}, ${user?.state ?? "—"}`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-medium text-slate-900" data-testid={`profile-field-${String(k).toLowerCase()}`}>{v}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard testId="profile-edit-card" title="Edit profile">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="p-first">First Name</Label><Input id="p-first" value={form.first_name} onChange={(e) => setForm((p) => ({ ...p, first_name: e.target.value }))} placeholder={user?.first_name} className="mt-1.5" data-testid="profile-first-name-input" /></div>
              <div><Label htmlFor="p-last">Last Name</Label><Input id="p-last" value={form.last_name} onChange={(e) => setForm((p) => ({ ...p, last_name: e.target.value }))} placeholder={user?.last_name} className="mt-1.5" data-testid="profile-last-name-input" /></div>
              <div><Label htmlFor="p-phone">Phone</Label><Input id="p-phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} placeholder={user?.phone} className="mt-1.5" data-testid="profile-phone-input" /></div>
              <div><Label htmlFor="p-org">Organization</Label><Input id="p-org" value={form.organization} onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))} placeholder={user?.organization} className="mt-1.5" data-testid="profile-org-input" /></div>
            </div>
            <Button className="mt-4" disabled={save.isPending} onClick={() => save.mutate()} data-testid="profile-save-btn">{save.isPending ? "Saving…" : "Save Changes"}</Button>
          </SectionCard>

          <SectionCard testId="profile-password-card" title="Change password">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="cp-cur">Current Password</Label><Input id="cp-cur" type="password" value={pw.current_password} onChange={(e) => setPw((p) => ({ ...p, current_password: e.target.value }))} className="mt-1.5" data-testid="profile-current-password-input" /></div>
              <div><Label htmlFor="cp-new">New Password</Label><Input id="cp-new" type="password" value={pw.new_password} onChange={(e) => setPw((p) => ({ ...p, new_password: e.target.value }))} className="mt-1.5" data-testid="profile-new-password-input" /></div>
            </div>
            <Button className="mt-4" variant="outline" disabled={pw.new_password.length < 8 || changePw.isPending} onClick={() => changePw.mutate()} data-testid="profile-change-password-btn">Update Password</Button>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { user } = useSession();
  const [prefs, setPrefs] = useState({ critical: true, sensorOffline: true, aiPrediction: false, weekly: true });

  return (
    <div data-testid="settings-page">
      <PageHeader title="System Settings" description="Notification preferences and platform configuration." />
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard testId="settings-notifications-card" title="Notification preferences" description="Channels used to reach you during an escalation">
          <div className="space-y-3">
            {([
              ["critical", "Critical hazard alerts"],
              ["sensorOffline", "Sensor offline notices"],
              ["aiPrediction", "AI prediction updates"],
              ["weekly", "Weekly report digest"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-700">
                {label}
                <input
                  type="checkbox"
                  checked={prefs[key]}
                  onChange={(e) => { setPrefs((p) => ({ ...p, [key]: e.target.checked })); toast.success(`${label} ${e.target.checked ? "enabled" : "disabled"}`); }}
                  className="size-4 accent-[#0F4C81]"
                  data-testid={`settings-toggle-${key}`}
                />
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard testId="settings-platform-card" title="Platform configuration">
          <dl className="space-y-2.5 text-sm">
            {[
              ["Platform version", "3.4.2"],
              ["Your clearance", ROLE_LABELS[user?.role ?? "viewer"]],
              ["Session type", "httpOnly JWT cookie · auto-renewing, ends on sign-out"],
              ["Telemetry cadence", "5 minute LoRaWAN uplink window"],
              ["Data residency", "India (AWS ap-south-1)"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-slate-100 pb-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-mono text-xs font-semibold text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}
