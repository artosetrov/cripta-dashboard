"use client";

import { useState, useMemo } from "react";
import { FINANCE_DATA, PWD_HASH } from "./lib/data";

// ─── Helpers ────────────────────────────────────────────
const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

function Change({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const pos = value >= 0;
  return (
    <span className={cn("font-mono text-sm", pos ? "text-emerald-400" : "text-red-400")}>
      {pos ? "+" : ""}
      {value.toFixed(value % 1 === 0 ? 1 : 2)}
      {suffix}
    </span>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm", className)}>
      {children}
    </div>
  );
}

function SectionTitle({ children, badge, badgeColor = "blue" }: { children: React.ReactNode; badge?: string; badgeColor?: string }) {
  const colors: Record<string, string> = {
    red: "bg-red-500/15 text-red-400",
    yellow: "bg-yellow-500/15 text-yellow-400",
    green: "bg-emerald-500/15 text-emerald-400",
    blue: "bg-blue-500/15 text-blue-400",
  };
  return (
    <h2 className="text-sm font-semibold text-gray-100 mt-6 mb-3 flex items-center gap-2">
      {children}
      {badge && <span className={cn("text-[10px] px-2 py-0.5 rounded-md font-semibold", colors[badgeColor])}>{badge}</span>}
    </h2>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">{children}</h3>;
}

// ─── SHA-256 ────────────────────────────────────────────
async function sha256(str: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ═══════════════════════════════════════════════════════
// TABS
// ═══════════════════════════════════════════════════════
type Tab = "overview" | "crypto" | "macro" | "news" | "personal";

const PUBLIC_TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "crypto", label: "Crypto" },
  { id: "macro", label: "Macro" },
  { id: "news", label: "News" },
];

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════
export default function Dashboard() {
  const D = FINANCE_DATA;
  const M = D.markets;
  const P = D.personal;

  const [tab, setTab] = useState<Tab>("overview");
  const [unlocked, setUnlocked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState(false);

  const daysLeft = useMemo(() => {
    const deadline = new Date(P.taxAlert.deadline);
    const now = new Date();
    return Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
  }, [P.taxAlert.deadline]);

  const activeAgents = P.agents.filter((a) => a.status === "active").length;

  // ─── Password check ───────────────────────────────
  async function checkPassword() {
    const hash = await sha256(pwd);
    if (hash === PWD_HASH) {
      setUnlocked(true);
      setShowModal(false);
      setPwd("");
      setTab("personal");
    } else {
      setPwdError(true);
      setPwd("");
      setTimeout(() => setPwdError(false), 2000);
    }
  }

  function handlePersonalClick() {
    if (unlocked) {
      setTab("personal");
    } else {
      setShowModal(true);
    }
  }

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#0a0e17] text-gray-300">
      {/* ─── Header ──────────────────────────── */}
      <header className="px-6 py-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-base font-bold text-gray-100 flex items-center gap-2">
          <span className="text-emerald-400 text-lg">₿</span> Cripta Finance HQ
        </h1>
        <div className="flex items-center gap-4 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {D.meta.risk_level}
          </span>
          <span>{new Date(D.meta.updated).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          <span>Агентов: {D.meta.agents_active}/{D.meta.agents_total}</span>
        </div>
      </header>

      {/* ─── Nav ─────────────────────────────── */}
      <nav className="flex gap-0.5 px-6 py-2 border-b border-gray-800 bg-black/20 overflow-x-auto">
        {PUBLIC_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-3 py-1.5 rounded text-[11px] font-medium transition-colors whitespace-nowrap",
              tab === t.id ? "text-gray-100 bg-blue-500/15" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
            )}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={handlePersonalClick}
          className={cn(
            "ml-auto px-3 py-1.5 rounded text-[11px] font-medium border transition-colors whitespace-nowrap",
            tab === "personal"
              ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
              : unlocked
                ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                : "text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
          )}
        >
          {unlocked ? "🔓" : "🔒"} Personal
        </button>
      </nav>

      {/* ─── Content ─────────────────────────── */}
      <main className="max-w-[1440px] mx-auto px-6 py-5">
        {/* =============== OVERVIEW =============== */}
        {tab === "overview" && (
          <div>
            <SectionTitle badge={M.regime} badgeColor="red">Market Snapshot</SectionTitle>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {M.indices.map((i) => (
                <Card key={i.name}>
                  <Label>{i.name}</Label>
                  <div className="text-xl font-bold text-gray-100">{i.value}</div>
                  <div className="mt-0.5">
                    <Change value={i.change} />
                    {i.note && <span className="text-[10px] text-gray-500 ml-2">{i.note}</span>}
                  </div>
                </Card>
              ))}
            </div>

            <SectionTitle>Crypto</SectionTitle>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {M.crypto.filter((c) => c.price).slice(0, 4).map((c) => (
                <Card key={c.ticker}>
                  <Label>{c.name} ({c.ticker})</Label>
                  <div className="text-xl font-bold text-gray-100">${c.price!.toLocaleString()}</div>
                  <Change value={c.change24h} />
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
              {/* Fear & Greed */}
              <Card>
                <Label>Fear & Greed Index</Label>
                <div className="text-center py-4">
                  <div className="text-5xl font-extrabold text-red-400">{M.fearGreed.value}</div>
                  <div className="text-sm font-semibold text-red-400 mt-1">{M.fearGreed.label}</div>
                  <div className="text-[10px] text-gray-500 mt-1">{M.fearGreed.daysInExtreme}+ дней в зоне extreme fear</div>
                </div>
                <div className="space-y-2 mt-2">
                  {M.fearGreed.history.map((h) => (
                    <div key={h.label} className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500 min-w-[120px]">{h.label}</span>
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${h.value}%`,
                            background: h.value < 20 ? "#ef4444" : h.value < 40 ? "#f59e0b" : "#3b82f6",
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-gray-100 min-w-[24px] text-right">{h.value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Headlines */}
              <Card>
                <Label>Top Headlines</Label>
                <div className="divide-y divide-gray-800/50">
                  {M.news.slice(0, 3).map((n, i) => (
                    <div key={i} className="py-3 first:pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded font-semibold",
                            n.impact === "positive" ? "bg-emerald-500/15 text-emerald-400" : n.impact === "negative" ? "bg-red-500/15 text-red-400" : "bg-yellow-500/15 text-yellow-400"
                          )}
                        >
                          {n.impact}
                        </span>
                        <span className="text-xs font-semibold text-gray-100">{n.title}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">{n.detail}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* =============== CRYPTO =============== */}
        {tab === "crypto" && (
          <div>
            <SectionTitle badge="EXTREME FEAR" badgeColor="red">Crypto Market</SectionTitle>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {M.crypto.map((c) => (
                <Card key={c.ticker}>
                  <Label>{c.name} ({c.ticker})</Label>
                  <div className="text-lg font-bold text-gray-100">{c.price ? `$${c.price.toLocaleString()}` : "—"}</div>
                  <div className="mt-0.5">
                    <Change value={c.change24h} />
                    <span className="text-[10px] text-gray-500 ml-2">MCap: {c.mcap}</span>
                  </div>
                  {c.note && <p className="text-[10px] text-gray-500 mt-1">{c.note}</p>}
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
              {/* Fear & Greed: Historical */}
              <Card>
                <Label>Fear & Greed: Historical Context</Label>
                <div className="text-center py-3">
                  <div className="text-4xl font-extrabold text-red-400">{M.fearGreed.value}</div>
                  <div className="text-sm font-semibold text-red-400">{M.fearGreed.label}</div>
                </div>
                <div className="space-y-2">
                  {M.fearGreed.history.map((h) => (
                    <div key={h.label} className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-500 min-w-[120px]">{h.label} ({h.value})</span>
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${h.value}%`, background: h.value < 20 ? "#ef4444" : h.value < 40 ? "#f59e0b" : "#3b82f6" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Regulatory */}
              <Card>
                <Label>Regulatory Milestone</Label>
                <div className="py-2">
                  <p className="text-sm font-semibold text-emerald-400 mb-2">SEC + CFTC: 16 crypto = digital commodities</p>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    <span className="font-semibold text-gray-100">BTC, ETH, SOL, XRP, DOGE, ADA, AVAX, LINK, DOT, HBAR, LTC, BCH, SHIB, XLM, XTZ, APT</span>
                    <br /><br />
                    Эти активы НЕ securities. CFTC регулирует как commodities. ETF для SOL/XRP становятся реальнее.
                  </p>
                  <span className="inline-block mt-2 text-[9px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">Confidence: 95%</span>
                </div>
              </Card>
            </div>

            {/* Commodities */}
            <SectionTitle>Commodities</SectionTitle>
            <Card>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] text-gray-500 uppercase tracking-wider border-b border-gray-800">
                    <th className="pb-2 font-medium">Commodity</th>
                    <th className="pb-2 font-medium">Price</th>
                    <th className="pb-2 font-medium">Change</th>
                    <th className="pb-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {M.commodities.map((c) => (
                    <tr key={c.name} className="border-b border-gray-800/30 last:border-0">
                      <td className="py-2.5 font-medium text-gray-100">{c.name}</td>
                      <td className="py-2.5">{c.value}</td>
                      <td className="py-2.5"><Change value={c.change} /></td>
                      <td className="py-2.5 text-gray-500 text-xs">{c.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* =============== MACRO =============== */}
        {tab === "macro" && (
          <div>
            <SectionTitle badge="CAUTION" badgeColor="yellow">Macro Dashboard</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card>
                <Label>CPI (Inflation)</Label>
                <div className="text-xl font-bold text-gray-100">{M.macro.cpi}</div>
                <div className="text-sm text-yellow-400">Core CPI: {M.macro.coreCpi}</div>
                <p className="text-[10px] text-gray-500 mt-1">Next CPI: {M.macro.nextCpi}</p>
              </Card>
              <Card>
                <Label>Fed Rate</Label>
                <div className="text-xl font-bold text-gray-100">{M.macro.fedRate}</div>
                <div className="text-xs text-gray-500">{M.macro.fedOutlook}</div>
              </Card>
              <Card>
                <Label>Recession Probability</Label>
                <div className="text-xl font-bold text-yellow-400">{M.macro.recessionProb}</div>
                <div className="text-xs text-yellow-400">Goldman повысил с прошлой оценки</div>
              </Card>
            </div>

            <SectionTitle>Key Indicators</SectionTitle>
            <Card>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] text-gray-500 uppercase tracking-wider border-b border-gray-800">
                    <th className="pb-2 font-medium">Indicator</th>
                    <th className="pb-2 font-medium">Value</th>
                    <th className="pb-2 font-medium">Trend</th>
                    <th className="pb-2 font-medium">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["CPI", M.macro.cpi, "→ risk ↑", "Cost of living"],
                    ["Fed Rate", M.macro.fedRate, "→ pause", "HYSA yield, credit cost"],
                    ["Unemployment", M.macro.unemployment, "↑ rising", "Freelance demand"],
                    ["GDP Q1", M.macro.gdpQ1, "↓ slowing", "Economic backdrop"],
                    ["10Y Treasury", "4.41%", "↑ 8mo high", "Risk asset pressure"],
                    ["Recession Prob", M.macro.recessionProb, "↑ Goldman", "Overall risk"],
                    ["Next FOMC", M.macro.nextFomc, "—", "Policy direction"],
                  ].map(([name, val, trend, impact]) => (
                    <tr key={name} className="border-b border-gray-800/30 last:border-0">
                      <td className="py-2.5 font-medium text-gray-100">{name}</td>
                      <td className="py-2.5">{val}</td>
                      <td className="py-2.5 text-yellow-400 text-xs">{trend}</td>
                      <td className="py-2.5 text-gray-500 text-xs">{impact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* =============== NEWS =============== */}
        {tab === "news" && (
          <div>
            <SectionTitle badge="Today" badgeColor="blue">Financial News</SectionTitle>
            <Card>
              <div className="divide-y divide-gray-800/50">
                {M.news.map((n, i) => (
                  <div key={i} className="py-4 first:pt-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span
                        className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded font-semibold",
                          n.impact === "positive" ? "bg-emerald-500/15 text-emerald-400" : n.impact === "negative" ? "bg-red-500/15 text-red-400" : "bg-yellow-500/15 text-yellow-400"
                        )}
                      >
                        {n.impact}
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-semibold">{n.category}</span>
                      <span className="text-xs font-semibold text-gray-100">{n.title}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">{n.detail}</p>
                    <div className="flex gap-4 mt-1.5 text-[9px] text-gray-600">
                      <span>Confidence: {n.confidence}%</span>
                      <span>Timeframe: {n.timeframe}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* =============== PERSONAL (PRIVATE) =============== */}
        {tab === "personal" && unlocked && (
          <div>
            {/* Tax Alert */}
            <SectionTitle badge={`CRITICAL — ${daysLeft} ДНЕЙ`} badgeColor="red">Tax Alert</SectionTitle>
            <Card className="text-center border-red-500/30 mb-4">
              <div className="text-6xl font-extrabold text-red-400 py-4">{daysLeft > 0 ? daysLeft : "OVERDUE"}</div>
              <div className="text-sm font-semibold text-red-400">дней до 15 апреля 2026</div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
              {/* Tax Profile */}
              <Card>
                <Label>Tax Profile</Label>
                <table className="w-full text-sm mt-2">
                  <tbody>
                    {[
                      ["Filing Status", P.profile.filingStatus],
                      ["State", P.profile.state],
                      ["Employment", P.profile.employment],
                      ["Income Streams", P.profile.incomeStreams.join(", ")],
                      ["Est. Tax 2025", "НЕ ОПЛАЧЕН"],
                      ["Penalty", "Вероятен"],
                    ].map(([k, v]) => (
                      <tr key={k} className="border-b border-gray-800/30 last:border-0">
                        <td className="py-2 text-gray-500">{k}</td>
                        <td className={cn("py-2 text-right", (k === "Est. Tax 2025" || k === "Penalty") ? "text-red-400 font-semibold" : "text-gray-300")}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Deductions */}
              <Card>
                <Label>Potential Deductions</Label>
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr className="text-left text-[10px] text-gray-500 uppercase border-b border-gray-800">
                      <th className="pb-2 font-medium">Deduction</th>
                      <th className="pb-2 font-medium">Savings</th>
                      <th className="pb-2 font-medium">Conf.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {P.taxAlert.deductions.map((d) => (
                      <tr key={d.name} className="border-b border-gray-800/30 last:border-0">
                        <td className="py-2">{d.name}</td>
                        <td className="py-2 text-emerald-400">{d.savings}</td>
                        <td className="py-2">
                          <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-semibold", d.confidence >= 85 ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-400")}>
                            {d.confidence}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            {/* Tax Checklist */}
            <Card className="mb-4">
              <Label>Tax Checklist</Label>
              <div className="space-y-1.5 mt-2">
                {P.taxAlert.checklist.map((c) => (
                  <div key={c.item} className={cn("text-[11px] leading-relaxed", c.done ? "text-gray-600 line-through" : "text-gray-300")}>
                    {c.done ? "✅" : "☐"} {c.item}
                  </div>
                ))}
              </div>
            </Card>

            {/* Financial Health */}
            <SectionTitle badge="AWAITING DATA" badgeColor="yellow">Financial Health</SectionTitle>
            <Card className="mb-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                {[
                  ["Cash Flow", P.financialHealth.cashFlowStatus],
                  ["Emergency Fund", P.financialHealth.emergencyFund],
                  ["Debt", P.financialHealth.debtPressure],
                  ["Savings Rate", P.financialHealth.savingsRate],
                  ["Net Worth", P.financialHealth.netWorthTrend],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div className="text-lg font-bold text-yellow-400">{val}</div>
                    <div className="text-[10px] text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 text-center mt-3">{P.financialHealth.note}</p>
            </Card>

            {/* Risk Matrix */}
            <SectionTitle badge="ELEVATED" badgeColor="red">Risk Matrix</SectionTitle>
            <Card className="mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] text-gray-500 uppercase border-b border-gray-800">
                    <th className="pb-2 font-medium">Risk</th>
                    <th className="pb-2 font-medium">Prob.</th>
                    <th className="pb-2 font-medium">Impact</th>
                    <th className="pb-2 font-medium">Level</th>
                    <th className="pb-2 font-medium">Mitigation</th>
                  </tr>
                </thead>
                <tbody>
                  {P.risks.map((r) => {
                    const levelColors: Record<string, string> = {
                      CRITICAL: "bg-red-500/15 text-red-400",
                      HIGH: "bg-yellow-500/15 text-yellow-400",
                      MEDIUM: "bg-blue-500/15 text-blue-400",
                      LOW: "bg-emerald-500/15 text-emerald-400",
                    };
                    return (
                      <tr key={r.risk} className="border-b border-gray-800/30 last:border-0">
                        <td className="py-2 font-medium text-gray-100">{r.risk}</td>
                        <td className="py-2">{r.prob}</td>
                        <td className="py-2">{r.impact}</td>
                        <td className="py-2">
                          <span className={cn("text-[9px] px-2 py-0.5 rounded font-semibold", levelColors[r.level])}>{r.level}</span>
                        </td>
                        <td className="py-2 text-[10px] text-gray-500">{r.mitigation}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>

            {/* Actions */}
            <SectionTitle>Recommended Actions</SectionTitle>
            <div className="space-y-2 mb-4">
              {P.actions.map((a) => {
                const borderColors: Record<string, string> = { P0: "border-l-red-500", P1: "border-l-yellow-500", P2: "border-l-blue-500", P3: "border-l-emerald-500" };
                return (
                  <div key={a.title} className={cn("border-l-[3px] bg-gray-900/60 border border-gray-800 rounded-r-lg p-4", borderColors[a.priority])}>
                    <div className="text-xs font-semibold text-gray-100 mb-1">{a.priority}: {a.title}</div>
                    <div className="text-[10px] text-gray-400 leading-relaxed">
                      {a.steps.map((s, i) => (
                        <div key={i}>• {s}</div>
                      ))}
                    </div>
                    <div className="flex gap-4 mt-2 text-[9px] text-gray-600">
                      <span>Urgency: {a.urgency}</span>
                      <span>Confidence: {a.confidence}%</span>
                      {a.professional && <span className="text-yellow-400">CPA review needed</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Agent Status */}
            <SectionTitle badge={`${activeAgents}/${P.agents.length} Active`} badgeColor="green">Agent Status</SectionTitle>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
              {P.agents.map((a) => {
                const statusColors: Record<string, string> = { active: "text-emerald-400", awaiting_data: "text-yellow-400", partial: "text-blue-400", alert: "text-red-400" };
                const statusLabels: Record<string, string> = { active: "Active", awaiting_data: "Awaiting", partial: "Partial", alert: "ALERT" };
                return (
                  <Card key={a.name} className="!p-3 text-center">
                    <div className="text-xl mb-1">{a.icon}</div>
                    <div className="text-[9px] font-medium text-gray-300">{a.name}</div>
                    <div className={cn("text-[8px] mt-0.5", statusColors[a.status])}>● {statusLabels[a.status]}</div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ─── Footer ──────────────────────────── */}
      <footer className="text-[9px] text-gray-600 text-center py-4 border-t border-gray-800 mt-6 leading-relaxed px-6">
        <strong>DISCLAIMER:</strong> Аналитическая информация, НЕ финансовый/налоговый/юридический совет. Проконсультируйтесь с CPA/советником.
        <br />
        Cripta Finance HQ v2.0 · Data may be delayed · Powered by Financial Intelligence Office (14 agents)
      </footer>

      {/* ─── Password Modal ──────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-7 w-[340px] text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-gray-100 mb-1">🔒 Personal Section</h2>
            <p className="text-xs text-gray-500 mb-4">Введите пароль для доступа к персональным данным</p>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && checkPassword()}
              placeholder="Пароль"
              autoFocus
              className="w-full px-4 py-2.5 border border-gray-700 rounded-lg bg-[#0a0e17] text-gray-100 text-sm outline-none focus:border-blue-500 mb-3"
            />
            <button onClick={checkPassword} className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors">
              Войти
            </button>
            <button onClick={() => setShowModal(false)} className="w-full py-2.5 rounded-lg border border-gray-700 text-gray-500 text-sm mt-2 hover:bg-gray-800 transition-colors">
              Отмена
            </button>
            {pwdError && <p className="text-red-400 text-xs mt-2">Неверный пароль</p>}
          </div>
        </div>
      )}
    </div>
  );
}
