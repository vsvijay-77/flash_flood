import { LandingNavbar, GovernmentFooter } from "@/components/landing/LandingChrome";
import { HowPlatformWorks, TechnologyArchitecture } from "@/components/landing/LandingSections";
import { Card } from "@/components/ui/card";

function Shell({ title, kicker, intro, children, testId }: { title: string; kicker: string; intro: string; children?: React.ReactNode; testId: string }) {
  return (
    <div className="min-h-screen bg-white" data-testid={testId}>
      <LandingNavbar />
      <section className="border-b border-slate-200 bg-[#F7F9FC] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#0F4C81]">{kicker}</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600">{intro}</p>
        </div>
      </section>
      {children}
      <GovernmentFooter />
    </div>
  );
}

const MANDATE = [
  { title: "Nodal coordination", body: "One operational picture shared across disaster management authorities, forest departments and environmental agencies." },
  { title: "Sensor-first evidence", body: "Every alert traces back to a timestamped LoRaWAN uplink from an identifiable field node." },
  { title: "Human authority", body: "AI produces risk scores and recommendations; authorized officials remain the decision makers." },
  { title: "Auditable access", body: "Role-based clearance with administrator verification and logged sessions on every restricted screen." },
];

export function AboutPlatform() {
  return (
    <Shell
      testId="about-page"
      kicker="About the Platform"
      title="A national environmental intelligence and disaster monitoring platform"
      intro="The Environmental Intelligence Network consolidates IoT telemetry, satellite intelligence, historical hazard datasets and machine learning into a single decision-support system for Indian government authorities responsible for environmental hazard response."
    >
      <section className="py-14 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:grid-cols-2 sm:px-6 lg:px-8">
          {MANDATE.map((m) => (
            <Card key={m.title} className="border-slate-200/80 p-6" data-testid={`about-card-${m.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <h2 className="text-base font-semibold text-slate-900">{m.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{m.body}</p>
            </Card>
          ))}
        </div>
      </section>
    </Shell>
  );
}

export function TechnologyPage() {
  return (
    <Shell
      testId="technology-page"
      kicker="Technology"
      title="Layered architecture from sensor edge to command dashboard"
      intro="Every layer is independently deployable — field telemetry, edge inference, cloud analytics, multi-agent orchestration, Digital Twin simulation and the officer-facing application."
    >
      <TechnologyArchitecture />
    </Shell>
  );
}

export function HowItWorksPage() {
  return (
    <Shell
      testId="how-it-works-page"
      kicker="How It Works"
      title="From a hillside reading to an authorized decision"
      intro="Six operational stages move an environmental measurement through the network, the models and the Digital Twin before it reaches an officer as an actionable early warning."
    >
      <HowPlatformWorks />
    </Shell>
  );
}
