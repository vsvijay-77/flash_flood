import { Link } from "react-router-dom";
import { ArrowRight, Check, Activity, Radio, ShieldCheck, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LandingNavbar, GovernmentFooter } from "@/components/landing/LandingChrome";
import { HowPlatformWorks, TechnologyArchitecture } from "@/components/landing/LandingSections";
import EnvironmentalNetworkAnimation from "@/components/landing/EnvironmentalNetworkAnimation";

const CHIPS = ["Real-Time Monitoring", "AI Risk Prediction", "GIS Intelligence", "Early Warning System"];

const PILLARS = [
  { icon: Radio, title: "Long-range sensor network", body: "LoRaWAN nodes reach remote hill and forest terrain where cellular coverage fails." },
  { icon: Activity, title: "Predictive risk models", body: "Random Forest, Isolation Forest and CNN models score hazard probability continuously." },
  { icon: ShieldCheck, title: "Government-grade access", body: "Role-based clearance, audited sessions and administrator verification for every account." },
  { icon: Users, title: "Multi-agency coordination", body: "Disaster management, forest and environmental departments share one operational picture." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white" data-testid="home-page">
      <LandingNavbar />

      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-[#F7F9FC] to-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0F4C81]/25 bg-[#0F4C81]/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F4C81]" data-testid="hero-badge">
              India's Environmental Intelligence Platform
            </span>

            <h1 className="mt-5 text-4xl font-bold leading-[1.14] tracking-tight text-slate-900 sm:text-5xl lg:text-[52px]">
              <span className="text-[#0F4C81]">Intelligent</span> Environmental Monitoring.
              <br />
              Faster Decisions.{" "}
              <span className="text-[#1B4D3E]">Safer Communities.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
              An integrated environmental intelligence platform combining IoT sensor networks, LoRaWAN
              communication, satellite intelligence, artificial intelligence, GIS mapping and Digital Twins to
              enable real-time monitoring and early warning for environmental hazards.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register" className={buttonVariants({ size: "lg" })} data-testid="explore-platform-btn">
                Explore Platform <ArrowRight className="ml-2 size-4" />
              </Link>
              <Link to="/login" className={buttonVariants({ variant: "outline", size: "lg" })} data-testid="view-live-monitoring-btn">
                View Live Monitoring
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3" data-testid="hero-capability-chips">
              {CHIPS.map((chip) => (
                <li key={chip} className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <span className="grid size-5 place-items-center rounded-full bg-[#2E7D32]/12 text-[#1B4D3E]">
                    <Check className="size-3" />
                  </span>
                  {chip}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:pl-4">
            <EnvironmentalNetworkAnimation />
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16" data-testid="home-pillars-section">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <Card key={p.title} className="border-slate-200/80 p-6" data-testid={`pillar-${p.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <span className="grid size-10 place-items-center rounded-lg bg-[#1B4D3E]/10 text-[#1B4D3E]">
                  <p.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <HowPlatformWorks />
      <TechnologyArchitecture />

      <section className="border-t border-slate-200 bg-[#0B2545] py-14">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Request departmental access</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Registration is reviewed by a platform administrator before restricted monitoring systems are unlocked.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/register" className={buttonVariants({ size: "lg", className: "bg-white text-[#0B2545] hover:bg-slate-100" })} data-testid="cta-register-btn">
              Create Account
            </Link>
            <Link to="/login" className={buttonVariants({ variant: "outline", size: "lg", className: "border-white/40 bg-transparent text-white hover:bg-white/10" })} data-testid="cta-login-btn">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <GovernmentFooter />
    </div>
  );
}
