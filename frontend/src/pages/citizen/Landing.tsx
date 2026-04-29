import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  FileCheck2,
  MapPinned,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { citizenCapabilities, features } from "./landing/data";
import { sectionReveal, stagger } from "./landing/helpers";
import type { Feature } from "./landing/types";
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
          <a href="#highlights">Highlights</a>
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

function Hero() {
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
        <div className="us-readability-card">
          <p className="us-readability-kicker">Citizen-first experience</p>
          <h3>Everything is explained clearly, step by step</h3>
          <ul>
            <li>
              <CheckCircle2 className="h-4 w-4" /> Clear guidance from start to
              finish
            </li>
            <li>
              <CheckCircle2 className="h-4 w-4" /> Document checks before you
              submit
            </li>
            <li>
              <CheckCircle2 className="h-4 w-4" /> Instant status updates in
              plain language
            </li>
          </ul>
        </div>

        <div className="us-mini-grid">
          <div className="us-mini-card">
            <p>Simple Application Journey</p>
            <strong>Apply with confidence</strong>
          </div>
          <div className="us-mini-card">
            <p>Transparent Process</p>
            <strong>Track each stage clearly</strong>
          </div>
          <div className="us-mini-card us-mini-card-wide">
            <p>Built for Daily Use</p>
            <small>
              Designed so every citizen can apply, upload documents, and follow
              progress without confusion.
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

function Showcase() {
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
          <h2>Designed for clarity, speed, and everyday citizen use</h2>
        </div>

        <div className="us-showcase-grid">
          <div className="us-show-card">
            <p>Start Request</p>
            <ul>
              <li>
                <FileCheck2 className="h-4 w-4" /> Fill one guided form with
                clear labels
              </li>
              <li>
                <FileCheck2 className="h-4 w-4" /> Upload required documents
                with preview
              </li>
            </ul>
          </div>

          <div className="us-show-card">
            <p>Track Progress</p>
            <ul>
              <li>
                <Clock3 className="h-4 w-4" /> Follow each workflow stage in one
                timeline
              </li>
              <li>
                <Clock3 className="h-4 w-4" /> See what is done and what comes
                next
              </li>
              <li>
                <Clock3 className="h-4 w-4" /> Get completion and payment
                confirmation
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
                <MessageSquareText className="h-4 w-4" /> Clear Notifications,
                Status Updates, and Payment Tracking
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

function Insights() {
  const insightCards = [
    {
      title: "Readable by Design",
      note: "Large headings, clean spacing, and direct wording improve clarity for all users.",
    },
    {
      title: "Action-Oriented",
      note: "Every page highlights what you should do next, reducing confusion and delays.",
    },
    {
      title: "Citizen Friendly",
      note: "Built for practical daily use by households, businesses, and support teams.",
    },
  ];

  return (
    <section id="highlights" className="us-section us-shell">
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
  return (
    <div className="us-root">
      <div className="us-blob us-blob-a" aria-hidden="true" />
      <div className="us-blob us-blob-b" aria-hidden="true" />
      <div className="us-grid-noise" aria-hidden="true" />

      <Navbar />
      <Hero />
      <Features />
      <Showcase />
      <CitizenJourney />
      <Insights />
      <Footer />
    </div>
  );
}
