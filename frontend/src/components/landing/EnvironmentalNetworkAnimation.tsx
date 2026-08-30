import { useState } from "react";
import { CloudRain, Droplets, Thermometer, Waves, Flame, Wind, Mountain, RadioTower } from "lucide-react";

interface NodeSpec {
  id: string;
  label: string;
  x: number;
  y: number;
  reading: string;
  icon: typeof CloudRain;
  alert?: boolean;
}

const GATEWAY = { x: 400, y: 132 };

const NODES: NodeSpec[] = [
  { id: "rainfall", label: "Rainfall Sensor", x: 118, y: 238, reading: "68 mm/h", icon: CloudRain, alert: true },
  { id: "soil", label: "Soil Moisture Sensor", x: 214, y: 306, reading: "81 %", icon: Droplets, alert: true },
  { id: "temp", label: "Temperature Sensor", x: 96, y: 356, reading: "19.4 °C", icon: Thermometer },
  { id: "water", label: "Water Level Sensor", x: 318, y: 392, reading: "4.6 m", icon: Waves, alert: true },
  { id: "smoke", label: "Smoke / Fire Sensor", x: 566, y: 262, reading: "12 ppm", icon: Flame },
  { id: "air", label: "Air Quality Sensor", x: 676, y: 330, reading: "148 AQI", icon: Wind },
  { id: "tilt", label: "Tilt / Landslide Sensor", x: 486, y: 344, reading: "3.2°", icon: Mountain },
  { id: "tilt2", label: "Seismic Tilt Node", x: 640, y: 412, reading: "0.8°", icon: Mountain },
];

function curve(x: number, y: number) {
  const midX = (x + GATEWAY.x) / 2;
  const midY = Math.min(y, GATEWAY.y) - 46;
  return `M ${x} ${y} Q ${midX} ${midY} ${GATEWAY.x} ${GATEWAY.y}`;
}

const FLOATING = [
  { value: "248", label: "Active Sensors", pos: "left-3 top-4", testId: "hero-kpi-sensors" },
  { value: "32", label: "Monitoring Zones", pos: "right-3 top-20", testId: "hero-kpi-zones" },
  { value: "1,240", label: "Live Data Streams", pos: "left-3 bottom-20", testId: "hero-kpi-streams" },
  { value: "03", label: "Active Alerts", pos: "right-3 bottom-5", testId: "hero-kpi-alerts" },
];

/**
 * The centrepiece home-page visualization: an SVG hill terrain with distributed LoRa
 * sensor nodes streaming data packets to a central LoRaWAN gateway, then onward to the
 * network server and the GIS + AI platform.
 */
export default function EnvironmentalNetworkAnimation() {
  const [active, setActive] = useState<string | null>(null);
  const hovered = NODES.find((n) => n.id === active) ?? null;

  return (
    <div className="relative w-full ein-animated" data-testid="environmental-network-animation">
      <div className="overflow-hidden rounded-xl border border-[#1E3A5F] bg-[#0C2340] shadow-[0_18px_40px_-18px_rgba(11,37,69,0.55)]">
        <div className="flex items-center justify-between border-b border-[#1E3A5F] px-4 py-2.5">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
            LoRaWAN Sensor Network · Live
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" /> Streaming
          </span>
        </div>

        <svg viewBox="0 0 800 520" preserveAspectRatio="xMidYMid meet" className="block h-auto w-full" role="img" aria-label="Animated LoRaWAN environmental sensor network over hill terrain">
          <defs>
            <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#12456F" />
              <stop offset="100%" stopColor="#0C2340" />
            </linearGradient>
            <linearGradient id="hillNear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1B4D3E" />
              <stop offset="100%" stopColor="#0E3327" />
            </linearGradient>
            <pattern id="geoGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E3A5F" strokeWidth="0.6" />
            </pattern>
          </defs>

          {/* geographic grid */}
          <rect width="800" height="520" fill="url(#geoGrid)" opacity="0.55" />

          {/* far ridge + near hill terrain */}
          <path d="M0 300 L120 214 L210 258 L318 168 L430 236 L540 176 L668 244 L800 196 L800 520 L0 520 Z" fill="url(#hillFar)" />
          <path d="M0 372 L130 300 L250 352 L372 288 L500 356 L620 306 L732 366 L800 336 L800 520 L0 520 Z" fill="url(#hillNear)" opacity="0.96" />

          {/* GIS contour lines */}
          {[398, 428, 458, 488].map((y, i) => (
            <path
              key={y}
              d={`M0 ${y} C 140 ${y - 22}, 280 ${y + 16}, 420 ${y - 12} S 660 ${y + 18}, 800 ${y - 8}`}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="0.7"
              opacity={0.16 + i * 0.03}
            />
          ))}

          {/* forest canopy */}
          {[40, 78, 168, 206, 292, 560, 600, 700, 748].map((x, i) => (
            <g key={x} opacity="0.7">
              <path d={`M${x} ${430 + (i % 3) * 14} l-11 26 h22 z`} fill="#14503C" />
              <path d={`M${x} ${442 + (i % 3) * 14} l-13 26 h26 z`} fill="#1B6349" />
            </g>
          ))}

          {/* connection paths + travelling data packets */}
          {NODES.map((node, i) => (
            <g key={`path-${node.id}`}>
              <path d={curve(node.x, node.y)} fill="none" stroke="#1E5A8A" strokeWidth="1.1" opacity="0.75" />
              <path
                d={curve(node.x, node.y)}
                fill="none"
                stroke="#38BDF8"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeDasharray="10 210"
                style={{ animation: `ein-packet 2.8s linear ${i * 0.34}s infinite` }}
              />
            </g>
          ))}

          {/* sensor nodes */}
          {NODES.map((node, i) => (
            <g
              key={node.id}
              onMouseEnter={() => setActive(node.id)}
              onMouseLeave={() => setActive(null)}
              style={{ cursor: "pointer" }}
              data-testid={`hero-sensor-node-${node.id}`}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r="13"
                fill="none"
                stroke={node.alert ? "#F59E0B" : "#22C55E"}
                strokeWidth="1.4"
                style={{ transformOrigin: `${node.x}px ${node.y}px`, animation: `ein-pulse 2.6s ease-out ${i * 0.3}s infinite` }}
              />
              <circle cx={node.x} cy={node.y} r="13" fill="#0B2545" stroke="#38BDF8" strokeWidth="1.4" />
              <circle cx={node.x} cy={node.y} r="4" fill={node.alert ? "#F59E0B" : "#22C55E"} />
              <circle cx={node.x + 10} cy={node.y - 10} r="2.6" fill="#22C55E" />
            </g>
          ))}

          {/* LoRaWAN gateway */}
          <g data-testid="hero-lorawan-gateway">
            {[0, 1, 2].map((i) => (
              <circle
                key={i}
                cx={GATEWAY.x}
                cy={GATEWAY.y}
                r="18"
                fill="none"
                stroke="#06B6D4"
                strokeWidth="1.4"
                style={{ animation: `ein-wave 3.2s ease-out ${i * 1.05}s infinite` }}
              />
            ))}
            <line x1={GATEWAY.x} y1={GATEWAY.y + 18} x2={GATEWAY.x} y2={GATEWAY.y + 74} stroke="#1E5A8A" strokeWidth="3" />
            <circle cx={GATEWAY.x} cy={GATEWAY.y} r="24" fill="#0B2545" stroke="#06B6D4" strokeWidth="2" />
            <path d={`M${GATEWAY.x - 9} ${GATEWAY.y + 7} L${GATEWAY.x} ${GATEWAY.y - 11} L${GATEWAY.x + 9} ${GATEWAY.y + 7}`} fill="none" stroke="#67E8F9" strokeWidth="2" strokeLinecap="round" />
            <circle cx={GATEWAY.x} cy={GATEWAY.y - 15} r="2.6" fill="#67E8F9" />
            <rect x={GATEWAY.x - 62} y={GATEWAY.y - 56} width="124" height="20" rx="10" fill="#06B6D4" opacity="0.16" />
            <text x={GATEWAY.x} y={GATEWAY.y - 42} textAnchor="middle" fill="#A5F3FC" fontSize="11" fontWeight="600" letterSpacing="1.2">
              LoRaWAN GATEWAY
            </text>
          </g>

          {/* downstream chain: gateway → network server → GIS + AI */}
          <g>
            <path d={`M${GATEWAY.x} ${GATEWAY.y + 74} L${GATEWAY.x} ${GATEWAY.y + 110}`} stroke="#38BDF8" strokeWidth="1.6" strokeDasharray="6 8" style={{ animation: "ein-packet 2.4s linear infinite" }} />
            <rect x={GATEWAY.x - 92} y={GATEWAY.y + 110} width="184" height="30" rx="8" fill="#123E63" stroke="#1E5A8A" />
            <text x={GATEWAY.x} y={GATEWAY.y + 130} textAnchor="middle" fill="#BAE6FD" fontSize="11" fontWeight="600">
              NETWORK / CLOUD SERVER
            </text>
            <path d={`M${GATEWAY.x} ${GATEWAY.y + 140} L${GATEWAY.x} ${GATEWAY.y + 176}`} stroke="#2DD4BF" strokeWidth="1.6" strokeDasharray="6 8" style={{ animation: "ein-packet 2.4s linear 0.6s infinite" }} />
            <rect x={GATEWAY.x - 108} y={GATEWAY.y + 176} width="216" height="32" rx="8" fill="#0F4C81" stroke="#38BDF8" />
            <text x={GATEWAY.x} y={GATEWAY.y + 197} textAnchor="middle" fill="#FFFFFF" fontSize="11.5" fontWeight="700" letterSpacing="0.6">
              GIS + AI INTELLIGENCE PLATFORM
            </text>
          </g>
        </svg>
      </div>

      {/* floating KPI cards */}
      {FLOATING.map((card) => (
        <div
          key={card.testId}
          className={`absolute ${card.pos} hidden rounded-lg border border-white/70 bg-white/90 px-3 py-2 shadow-[0_8px_24px_-8px_rgba(11,37,69,0.35)] backdrop-blur-md sm:block`}
          data-testid={card.testId}
        >
          <p className="font-mono text-lg font-bold leading-none text-[#0B2545]">{card.value}</p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{card.label}</p>
        </div>
      ))}

      {/* hovered node telemetry inspector */}
      <div className="mt-3 flex min-h-[44px] items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5" data-testid="hero-node-inspector">
        {hovered ? (
          <>
            <span className="grid size-7 place-items-center rounded-md bg-[#0F4C81]/10 text-[#0F4C81]">
              <hovered.icon className="size-4" />
            </span>
            <span className="text-sm font-semibold text-slate-900">{hovered.label}</span>
            <span className="ml-auto font-mono text-sm font-bold text-[#0D9488]">{hovered.reading}</span>
          </>
        ) : (
          <span className="inline-flex items-center gap-2 text-xs text-slate-500">
            <RadioTower className="size-4 text-[#0F4C81]" />
            Hover any sensor node to inspect its latest LoRa uplink.
          </span>
        )}
      </div>
    </div>
  );
}
