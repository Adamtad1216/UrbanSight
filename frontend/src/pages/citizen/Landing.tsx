import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  MapPinned,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { citizenCapabilities, features } from "./landing/data";
import {
  formatCompact,
  sectionReveal,
  stagger,
  toBarHeightClass,
} from "./landing/helpers";
import type { Feature, LandingMetrics, LandingTrend } from "./landing/types";
import { useLandingMetrics } from "./landing/useLandingMetrics";
import "./landing.css";

function Navbar() {
  return (
    <header className="us-nav-wrap">
      <nav className="us-nav us-shell">
        <div className="us-brand">
          <span className="us-brand-mark">
            <img
              src="/image.png"
              alt="UrbanSight logo"
              className="us-brand-logo-img"
            />
          </span>
          <div>
            <p className="us-brand-top">UrbanSight</p>
            <p className="us-brand-bottom">Smart City Dashboard</p>
          </div>
        </div>

        <div className="us-nav-links">
          <a href="#features">Features</a>
          <a href="#showcase">Showcase</a>
          <a href="#insights">Insights</a>
          <a href="#footer">Contact</a>
        </div>

        <div className="us-nav-cta">
          <Link to="/login" className="us-btn us-btn-ghost">
            Sign In
          </Link>
          <Link to="/register" className="us-btn us-btn-primary">
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Hero({
  metrics,
  isLive,
}: {
  metrics: LandingMetrics;
  isLive: boolean;
}) {
  const statItems = [
    { label: "Total Requests", value: formatCompact(metrics.totalRequests) },
    { label: "Issue Reports", value: formatCompact(metrics.totalIssues) },
    {
      label: "Completed Services",
      value: formatCompact(metrics.completedServices),
    },
    { label: "Active Citizens", value: formatCompact(metrics.activeCitizens) },
  ];

  return (
    <section className="us-hero us-shell">
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="show"
        className="us-hero-copy"
      >
        <span className="us-pill">
          <Sparkles className="h-4 w-4" />
          Ethiopia Digital Transformation - Water Services Platform
        </span>
        <h1>
          UrbanSight for
          <br />
          Ethiopia&apos;s Smart
          <br />
          Water Future.
        </h1>
        <p>
          UrbanSight Smart City Web Dashboard supports Ethiopia&apos;s digital
          initiative by modernizing water connection services, issue response,
          and citizen engagement into one national-scale digital system.
        </p>
        <div className="us-live-note">
          <span
            className={isLive ? "us-live-dot us-live-dot-on" : "us-live-dot"}
          />
          {isLive
            ? "Live metrics connected to UrbanSight database"
            : "Live metrics unavailable - showing fallback values"}
        </div>
        <div className="us-hero-cta">
          <Link to="/register" className="us-btn us-btn-primary">
            Start as Citizen <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/login" className="us-btn us-btn-ghost">
            Sign In
          </Link>
        </div>
      </motion.div>

      <motion.div
        variants={sectionReveal}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.12 }}
        className="us-hero-panel"
        whileHover={{ y: -4, scale: 1.01 }}
      >
        <div className="us-kpi-row">
          {statItems.map((item) => (
            <motion.div
              key={item.label}
              className="us-kpi-card"
              whileHover={{ y: -3 }}
            >
              <p>{item.value}</p>
              <span>{item.label}</span>
            </motion.div>
          ))}
        </div>

        <div className="us-mini-grid">
          <div className="us-mini-card">
            <p>Pending Services</p>
            <strong>{formatCompact(metrics.pendingServices)}</strong>
          </div>
          <div className="us-mini-card">
            <p>Verified Transactions</p>
            <strong>{formatCompact(metrics.verifiedTransactions)}</strong>
          </div>
          <div className="us-mini-card us-mini-card-wide">
            <p>Regional Branch Coverage</p>
            <div className="us-progress">
              <span
                className={
                  metrics.branchesCovered >= 8
                    ? "us-progress-fill"
                    : "us-progress-fill us-progress-fill-mid"
                }
              />
            </div>
            <small>
              {formatCompact(metrics.branchesCovered)} service branches
              reporting
            </small>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <motion.article
      variants={sectionReveal}
      className="us-feature-card"
      whileHover={{ y: -6, scale: 1.015 }}
    >
      <div className="us-feature-icon">
        <Icon className="h-5 w-5" />
      </div>
      <h3>{feature.title}</h3>
      <p>{feature.description}</p>
    </motion.article>
  );
}

function Features() {
  return (
    <section id="features" className="us-section us-shell">
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="us-section-head"
      >
        <span>Ethiopia Water Modernization</span>
        <h2>
          Built to support Digital Ethiopia through accountable, transparent,
          and scalable urban water service delivery
        </h2>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="us-feature-grid"
      >
        {features.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </motion.div>
    </section>
  );
}

function Showcase({ monthly }: { monthly: LandingTrend[] }) {
  const maxBarValue = useMemo(
    () => Math.max(...monthly.map((item) => item.value), 1),
    [monthly],
  );

  return (
    <section id="showcase" className="us-section us-shell">
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="us-showcase"
        whileHover={{ y: -4 }}
      >
        <div className="us-showcase-head">
          <span>Dashboard Preview</span>
          <h2>Live operational signals from the UrbanSight data platform</h2>
        </div>

        <div className="us-showcase-grid">
          <div className="us-show-card us-chart-card">
            <p>Monthly Service Intake (DB)</p>
            <div className="us-bars">
              {monthly.map((item) => (
                <i
                  key={item.month}
                  className={`us-bar ${toBarHeightClass(item.value, maxBarValue)}`}
                  title={`${item.month}: ${item.value}`}
                />
              ))}
            </div>
            <div className="us-month-row">
              {monthly.map((item) => (
                <span key={item.month}>{item.month}</span>
              ))}
            </div>
          </div>

          <div className="us-show-card">
            <p>Citizen Experience Flow</p>
            <ul>
              <li>
                <CheckCircle2 className="h-4 w-4" /> Submit connection or issue
                request
              </li>
              <li>
                <CheckCircle2 className="h-4 w-4" /> Track review, survey, and
                implementation
              </li>
              <li>
                <CheckCircle2 className="h-4 w-4" /> Receive final completion
                and payment verification
              </li>
            </ul>
          </div>

          <div className="us-show-card us-show-card-wide">
            <p>What Citizens Find on This Platform</p>
            <div className="us-feed">
              <span>
                <Building2 className="h-4 w-4" /> New Connection Application
              </span>
              <span>
                <ShieldCheck className="h-4 w-4" /> Issue Reporting and
                Technician Follow-up
              </span>
              <span>
                <MapPinned className="h-4 w-4" /> Real-time Status,
                Notifications, and Payment Tracking
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function CitizenJourney() {
  return (
    <section id="citizen-system" className="us-section us-shell">
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="us-section-head"
      >
        <span>Citizen Service System</span>
        <h2>
          A complete end-to-end platform for citizens, field teams, and city
          utility leadership
        </h2>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="us-capability-grid"
      >
        {citizenCapabilities.map((item) => {
          const Icon = item.icon;
          return (
            <motion.article
              key={item.title}
              variants={sectionReveal}
              className="us-capability-card"
              whileHover={{ y: -6, scale: 1.015 }}
            >
              <div className="us-feature-icon">
                <Icon className="h-5 w-5" />
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </motion.article>
          );
        })}
      </motion.div>
    </section>
  );
}

function Insights({ metrics }: { metrics: LandingMetrics }) {
  const insightCards = [
    {
      title: "Active Citizens",
      value: formatCompact(metrics.activeCitizens),
      note: "Citizens currently engaging digitally",
    },
    {
      title: "Active Utility Staff",
      value: formatCompact(metrics.activeStaff),
      note: "Operational and field personnel",
    },
    {
      title: "Total Service Workload",
      value: formatCompact(metrics.totalRequests + metrics.totalIssues),
      note: "Connections + issue reports tracked",
    },
  ];

  return (
    <section id="insights" className="us-section us-shell">
      <motion.div
        variants={sectionReveal}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="us-section-head"
      >
        <span>UrbanSight at Scale</span>
        <h2>
          National digital service foundation for Ethiopia&apos;s water system
          modernization
        </h2>
      </motion.div>

      <motion.div
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="us-test-grid"
      >
        {insightCards.map((item) => (
          <motion.article
            key={item.title}
            variants={sectionReveal}
            className="us-test-card"
            whileHover={{ y: -5 }}
          >
            <p className="us-insight-label">{item.title}</p>
            <h3 className="us-insight-value">{item.value}</h3>
            <div>
              <span>{item.note}</span>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="footer" className="us-footer us-shell">
      <div>
        <p>UrbanSight</p>
        <span>
          UrbanSight Smart City Web Dashboard powers Ethiopia&apos;s digital
          urban water service transformation with citizen-first delivery,
          transparent workflows, and measurable outcomes.
        </span>
      </div>
      <div>
        <Link to="/register">Create Account</Link>
        <Link to="/login">Sign In</Link>
        <Link to="/citizen/dashboard">Dashboard</Link>
      </div>
    </footer>
  );
}

export default function CitizenLandingPage() {
  const { metrics, monthly, isLive } = useLandingMetrics();

  return (
    <div className="us-root">
      <div className="us-blob us-blob-a" aria-hidden="true" />
      <div className="us-blob us-blob-b" aria-hidden="true" />
      <div className="us-grid-noise" aria-hidden="true" />

      <Navbar />
      <Hero metrics={metrics} isLive={isLive} />
      <Features />
      <Showcase monthly={monthly} />
      <CitizenJourney />
      <Insights metrics={metrics} />
      <Footer />
    </div>
  );
}
