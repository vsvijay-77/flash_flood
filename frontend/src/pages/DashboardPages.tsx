import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from "recharts";
import { Activity, AlertTriangle, Database, Map as MapIcon, Radio, Waves } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import GISMap, { DEFAULT_LAYERS, type GISLayerState } from "@/components/gis/GISMap";
import { EmptyState, LoadingRows, PageHeader, RiskIndicator, SectionCard, StatCard, StatusPill } from "@/components/Primitives";
import { apiGet } from "@/lib/api";
import { HAZARD_LABELS, SENSOR_LABELS, type Alert, type NetworkStats, type Sensor, type TelemetrySeries, type Zone } from "@/lib/types";

const AXIS = { stroke: "#94A3B8", fontSize: 11 };

function useNetwork() {
  const zones = useQuery({ queryKey: ["zones"], queryFn: () => apiGet<Zone[]>("/zones"), retry: false });
  const sensors = useQuery({ queryKey: ["sensors"], queryFn: () => apiGet<Sensor[]>("/sensors"), retry: false });
  const stats = useQuery({ queryKey: ["stats"], queryFn: () => apiGet<NetworkStats>("/stats"), retry: false });
  const alerts = useQuery({ queryKey: ["alerts"], queryFn: () => apiGet<Alert[]>("/alerts"), retry: false });
  return { zones, sensors, stats, alerts };
}

export function DashboardPage() {
  const { zones, sensors, stats, alerts } = useNetwork();
  const telemetry = useQuery({ queryKey: ["telemetry", null], queryFn: () => apiGet<TelemetrySeries>("/telemetry"), retry: false });
  const s = stats.data;
  const points = telemetry.data?.points ?? [];
  const liveAlerts = (alerts.data ?? []).filter((a) => a.status !== "resolved");

  return (
    <div data-testid="dashboard-page">
      <PageHeader
        title="National Operations Dashboard"
        description="Live LoRaWAN telemetry, hazard geography and AI risk posture across all monitoring zones."
        actions={<Link to="/gis" className={buttonVariants({ variant: "outline", size: "sm" })} data-testid="dashboard-open-gis-btn">Open GIS Monitoring</Link>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard testId="kpi-active-sensors" label="Active Sensors" value={s?.active_sensors ?? "—"} hint={s ? `${s.total_sensors} deployed` : ""} icon={<Radio className="size-5" />} />
        <StatCard testId="kpi-online-gateways" label="Online Gateways" value={s?.online_gateways ?? "—"} icon={<Activity className="size-5" />} tone="teal" />
        <StatCard testId="kpi-active-alerts" label="Active Alerts" value={s ? String(s.active_alerts).padStart(2, "0") : "—"} icon={<AlertTriangle className="size-5" />} tone="red" />
        <StatCard testId="kpi-monitoring-zones" label="Monitoring Zones" value={s?.monitoring_zones ?? "—"} icon={<MapIcon className="size-5" />} tone="green" />
        <StatCard testId="kpi-data-streams" label="Data Streams" value={s?.data_streams?.toLocaleString() ?? "—"} icon={<Database className="size-5" />} tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <SectionCard testId="dashboard-map-card" title="Interactive hazard map" description="Sensor markers, hazard zones and rainfall overlays" className="lg:col-span-2">
          <div className="h-[420px] overflow-hidden rounded-lg border border-slate-200">
            <GISMap zones={zones.data ?? []} sensors={sensors.data ?? []} testId="dashboard-gis-map" />
          </div>
        </SectionCard>

        <SectionCard testId="live-alerts-panel" title="Live alerts" description="Unresolved hazard notifications">
          {alerts.isLoading ? (
            <LoadingRows />
          ) : liveAlerts.length === 0 ? (
            <EmptyState testId="live-alerts-empty" title="No active alerts" description="All monitored zones are within safe thresholds." />
          ) : (
            <ul className="space-y-3">
              {liveAlerts.slice(0, 6).map((a) => (
                <li key={a.id} className="rounded-lg border border-slate-200 p-4" data-testid={`live-alert-${a.code}`}>
                  <div className="flex items-center justify-between gap-2">
                    <RiskIndicator level={a.risk_level} />
                    <span className="font-mono text-[10px] text-slate-400">{a.code}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{a.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{a.location}</p>
                </li>
              ))}
            </ul>
          )}
          <Link to="/alerts" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4 w-full" })} data-testid="dashboard-view-alerts-btn">View Alerts Center</Link>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard testId="chart-rainfall" title="Rainfall trend" description="Accumulation mm/h across the last 24 hours">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={AXIS} interval={3} />
              <YAxis tick={AXIS} />
              <Tooltip />
              <Area type="monotone" dataKey="rainfall_mm" stroke="#0F4C81" fill="#0F4C81" fillOpacity={0.18} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>
        <SectionCard testId="chart-water-level" title="Water level trend" description="Metres above baseline">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={AXIS} interval={3} />
              <YAxis tick={AXIS} />
              <Tooltip />
              <Line type="monotone" dataKey="water_level_m" stroke="#0D9488" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
        <SectionCard testId="chart-temperature" title="Temperature trend" description="Ambient °C">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={AXIS} interval={3} />
              <YAxis tick={AXIS} />
              <Tooltip />
              <Line type="monotone" dataKey="temperature_c" stroke="#D97706" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
        <SectionCard testId="chart-network-status" title="Sensor network status" description="Packet delivery rate %">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={AXIS} interval={3} />
              <YAxis tick={AXIS} domain={[80, 100]} />
              <Tooltip />
              <Bar dataKey="packet_rate" fill="#2E7D32" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>
    </div>
  );
}

const LAYER_ROWS: { key: keyof GISLayerState; label: string }[] = [
  { key: "sensors", label: "Sensor Locations" },
  { key: "rainfall", label: "Rainfall" },
  { key: "hazardZones", label: "Flood / Landslide / Fire Risk" },
  { key: "satellite", label: "Satellite Data" },
  { key: "boundaries", label: "Administrative Boundaries" },
];

export function GISMonitoringPage() {
  const { zones, sensors } = useNetwork();
  const [layers, setLayers] = useState<GISLayerState>(DEFAULT_LAYERS);
  const [selected, setSelected] = useState<Zone | null>(null);
  const zoneList = zones.data ?? [];
  const active = selected ?? zoneList[0] ?? null;
  const zoneSensors = (sensors.data ?? []).filter((s) => s.zone_id === active?.id);

  return (
    <div data-testid="gis-monitoring-page">
      <PageHeader title="GIS Monitoring" description="Full-screen geospatial hazard intelligence with selectable map layers." />
      <div className="grid gap-6 xl:grid-cols-[240px_1fr_300px]">
        <Card className="border-slate-200/80 p-5" data-testid="map-layers-panel">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Map Layers</p>
          <div className="mt-4 space-y-3">
            {LAYER_ROWS.map((row) => (
              <label key={row.key} className="flex items-start gap-2.5 text-sm text-slate-700">
                <Checkbox
                  checked={layers[row.key]}
                  onCheckedChange={(v) => setLayers((p) => ({ ...p, [row.key]: Boolean(v) }))}
                  data-testid={`layer-toggle-${row.key}`}
                />
                <span>{row.label}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden border-slate-200/80 p-0">
          <div className="h-[560px]">
            <GISMap zones={zoneList} sensors={sensors.data ?? []} layers={layers} onSelectZone={setSelected} testId="gis-monitoring-map" />
          </div>
        </Card>

        <Card className="border-slate-200/80 p-5" data-testid="selected-location-panel">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Selected Location</p>
          {!active ? (
            <p className="mt-4 text-sm text-slate-500" data-testid="selected-location-empty">Select a hazard zone on the map.</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-base font-semibold text-slate-900" data-testid="selected-location-name">{active.name}</p>
                <p className="text-xs text-slate-500">{active.district}, {active.state}</p>
              </div>
              <RiskIndicator level={active.risk_level} testId="selected-location-risk" />
              <dl className="space-y-2.5 text-sm">
                {[
                  ["Rainfall", `${active.rainfall_mm} mm/h`],
                  ["Temperature", `${active.temperature_c} °C`],
                  ["Humidity", `${active.humidity_pct} %`],
                  ["Water Level", `${active.water_level_m} m`],
                  ["Soil Moisture", `${active.soil_moisture_pct} %`],
                  ["Active Sensors", `${zoneSensors.filter((s) => s.status === "online").length} / ${active.sensor_count}`],
                  ["Hazard Type", HAZARD_LABELS[active.hazard_type] ?? active.hazard_type],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="font-mono font-semibold text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function EnvironmentalMonitoringPage() {
  const { sensors, zones } = useNetwork();
  const [zoneId, setZoneId] = useState<string>("");
  const list = useMemo(
    () => (sensors.data ?? []).filter((s) => !zoneId || s.zone_id === zoneId),
    [sensors.data, zoneId],
  );

  return (
    <div data-testid="environmental-monitoring-page">
      <PageHeader title="Environmental Monitoring" description="Latest LoRa uplink readings from every deployed sensor node." />
      <div className="mb-4 flex flex-wrap gap-2" data-testid="environmental-zone-filters">
        <button
          onClick={() => setZoneId("")}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${zoneId === "" ? "border-[#0F4C81] bg-[#0F4C81] text-white" : "border-slate-200 bg-white text-slate-600"}`}
          data-testid="environmental-filter-all"
        >
          All Zones
        </button>
        {(zones.data ?? []).map((z) => (
          <button
            key={z.id}
            onClick={() => setZoneId(z.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${zoneId === z.id ? "border-[#0F4C81] bg-[#0F4C81] text-white" : "border-slate-200 bg-white text-slate-600"}`}
            data-testid={`environmental-filter-${z.id}`}
          >
            {z.name}
          </button>
        ))}
      </div>

      <SectionCard testId="environmental-readings-card" title="Sensor readings" description={`${list.length} nodes reporting`}>
        {sensors.isLoading ? (
          <LoadingRows rows={5} />
        ) : list.length === 0 ? (
          <EmptyState testId="environmental-empty" title="No sensor readings" description="No nodes are registered for this zone yet." />
        ) : (
          <Table data-testid="environmental-readings-table">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Reading</TableHead>
                <TableHead>Battery</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((s) => (
                <TableRow key={s.id} data-testid={`sensor-row-${s.code}`}>
                  <TableCell className="font-mono text-xs font-semibold">{s.code}</TableCell>
                  <TableCell>{SENSOR_LABELS[s.sensor_type] ?? s.sensor_type}</TableCell>
                  <TableCell className="text-xs text-slate-500">{s.zone_name}</TableCell>
                  <TableCell className="font-mono font-semibold">{s.last_value} {s.unit}</TableCell>
                  <TableCell className="font-mono text-xs">{s.battery}%</TableCell>
                  <TableCell><StatusPill status={s.status} testId={`sensor-status-${s.code}`} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}

export function AnalyticsPage() {
  const { zones, sensors } = useNetwork();
  const zoneList = zones.data ?? [];
  const byRisk = zoneList.map((z) => ({ name: z.district, risk: z.risk_score, rainfall: z.rainfall_mm }));
  const online = (sensors.data ?? []).filter((s) => s.status === "online").length;

  return (
    <div data-testid="analytics-page">
      <PageHeader title="Analytics" description="Comparative hazard analytics across monitored districts." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard testId="analytics-kpi-zones" label="Zones analysed" value={zoneList.length} icon={<MapIcon className="size-5" />} />
        <StatCard testId="analytics-kpi-online" label="Nodes reporting" value={online} icon={<Radio className="size-5" />} tone="green" />
        <StatCard testId="analytics-kpi-peak" label="Peak risk score" value={zoneList.length ? Math.max(...zoneList.map((z) => z.risk_score)) : "—"} icon={<Waves className="size-5" />} tone="red" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard testId="analytics-risk-chart" title="Risk score by district">
          {byRisk.length === 0 ? (
            <EmptyState testId="analytics-risk-empty" title="No zone data available" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byRisk}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={AXIS} />
                <YAxis tick={AXIS} />
                <Tooltip />
                <Bar dataKey="risk" fill="#0F4C81" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
        <SectionCard testId="analytics-rainfall-chart" title="Rainfall intensity by district">
          {byRisk.length === 0 ? (
            <EmptyState testId="analytics-rainfall-empty" title="No rainfall data available" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byRisk}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={AXIS} />
                <YAxis tick={AXIS} />
                <Tooltip />
                <Bar dataKey="rainfall" fill="#0D9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
