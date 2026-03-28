"use client";

import { useState, useMemo } from "react";
import { FINANCE_DATA, AMEX_DATA, SPENDING_DATA, SUBSCRIPTIONS_DATA, CRYPTO_DATA, FORECAST_DATA, ALERTS_DATA, PWD_HASH, OWNER_DATA } from "./lib/data";

const cn = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

function Change({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const pos = value >= 0;
  return (
    <span className={cn("font-mono text-base", pos ? "text-emerald-400" : "text-red-400")}>
      {pos ? "+" : ""}{value.toFixed(value % 1 === 0 ? 1 : 2)}{suffix}
    </span>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm", className)}>{children}</div>;
}

function SectionTitle({ children, badge, badgeColor = "blue" }: { children: React.ReactNode; badge?: string; badgeColor?: string }) {
  const colors: Record<string, string> = {
    red: "bg-red-500/15 text-red-400",
    yellow: "bg-yellow-500/15 text-yellow-400",
    green: "bg-emerald-500/15 text-emerald-400",
    blue: "bg-blue-500/15 text-blue-400",
    purple: "bg-purple-500/15 text-purple-400",
  };
  return (
    <h2 className="text-lg font-semibold text-gray-100 mt-6 mb-3 flex items-center gap-2">
      {children}
      {badge && <span className={cn("text-sm px-2 py-0.5 rounded-md font-semibold", colors[badgeColor])}>{badge}</span>}
    </h2>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">{children}</h3>;
}

function MiniBar({ value, max, color = "#3b82f6" }: { value: number; max: number; color?: string }) {
  return (
    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }} />
    </div>
  );
}

function BarChart({ data, height = 200 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.min(40, (100 / data.length) * 0.7);
  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = max > 0 ? (d.value / max) * (height - 20) : 0;
        const x = (i / data.length) * 100 + (100 / data.length - barW) / 2;
        return <rect key={i} x={x} y={height - h - 16} width={barW} height={Math.max(h, 1)} rx={2} fill={d.color || "#3b82f6"} opacity={0.85} />;
      })}
    </svg>
  );
}

async function sha256(str: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Tab = "overview" | "spending" | "income" | "subscriptions" | "crypto" | "forecast" | "markets" | "alerts" | "personal";

const PUBLIC_TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "spending", label: "Spending" },
  { id: "income", label: "Income" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "crypto", label: "Crypto" },
  { id: "forecast", label: "Forecast" },
  { id: "markets", label: "Markets" },
  { id: "alerts", label: "Alerts" },
];

type OwnerKey = "artem" | "dasha" | "parents" | "family";
const OWNER_LABELS: Record<OwnerKey, string> = { artem: "Артём", dasha: "Даша", parents: "Родители", family: "Семейная (AMEX)" };
const ALL_OWNERS: OwnerKey[] = ["artem", "dasha", "parents", "family"];

function mergeSpending(owners: OwnerKey[]): any {
  const od = OWNER_DATA as any;
  const parts = owners.map((o) => od[o]?.spending).filter(Boolean);
  if (!parts.length) return SPENDING_DATA;

  // Merge summaries
  const totalSpend = parts.reduce((s: number, p: any) => s + (p.summary?.totalSpend || 0), 0);
  const totalIncome = parts.reduce((s: number, p: any) => s + (p.summary?.totalIncome || 0), 0);
  const netCashFlow = totalIncome - totalSpend;
  const txns = parts.reduce((s: number, p: any) => s + (p.summary?.transactions || 0), 0);

  // Merge monthly by month key
  const mm = new Map<string, { total: number; count: number }>();
  parts.forEach((p: any) => (p.monthly || []).forEach((m: any) => {
    const e = mm.get(m.month) || { total: 0, count: 0 };
    e.total += m.total || 0; e.count += m.count || 0;
    mm.set(m.month, e);
  }));
  const monthly = Array.from(mm.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, d]) => ({ month, ...d }));
  const monthsCount = monthly.length || 1;

  // Merge categories
  const cm = new Map<string, { total: number; count: number; color: string }>();
  parts.forEach((p: any) => (p.categories || []).forEach((c: any) => {
    const e = cm.get(c.name) || { total: 0, count: 0, color: c.color };
    e.total += c.total || 0; e.count += c.count || 0;
    cm.set(c.name, e);
  }));
  const categories = Array.from(cm.entries())
    .map(([name, d]) => ({ name, ...d, pct: totalSpend > 0 ? Math.round(d.total / totalSpend * 1000) / 10 : 0 }))
    .sort((a, b) => b.total - a.total);

  // Merge topMerchants
  const tm = new Map<string, { total: number; count: number }>();
  parts.forEach((p: any) => (p.topMerchants || []).forEach((m: any) => {
    const e = tm.get(m.name) || { total: 0, count: 0 };
    e.total += m.total || 0; e.count += m.count || 0;
    tm.set(m.name, e);
  }));
  const topMerchants = Array.from(tm.entries())
    .map(([name, d]) => ({ name, ...d, avg: d.count > 0 ? Math.round(d.total / d.count * 100) / 100 : 0 }))
    .sort((a, b) => b.total - a.total).slice(0, 20);

  // Merge dayOfWeek
  const dw = new Map<string, { total: number; count: number }>();
  parts.forEach((p: any) => (p.dayOfWeek || []).forEach((d: any) => {
    const e = dw.get(d.day) || { total: 0, count: 0 };
    e.total += d.total || 0; e.count += d.count || 0;
    dw.set(d.day, e);
  }));
  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const dayOfWeek = DAYS.map(day => ({ day, ...(dw.get(day) || { total: 0, count: 0 }) }));

  // Merge sources
  const sources = parts.flatMap((p: any) => p.sources || []);

  // Merge subscriptions
  const sm = new Map<string, any>();
  parts.forEach((p: any) => (p.subscriptions || []).forEach((s: any) => {
    const e = sm.get(s.name);
    if (!e || s.monthlyEst > e.monthlyEst) sm.set(s.name, s);
  }));
  const subscriptions = Array.from(sm.values()).sort((a: any, b: any) => b.monthlyEst - a.monthlyEst);
  const subMonthly = subscriptions.reduce((s: number, i: any) => s + (i.monthlyEst || 0), 0);

  const savingsRate = totalIncome > 0 ? Math.round(netCashFlow / totalIncome * 1000) / 10 : 0;
  const dateRange = monthly.length > 0 ? `${monthly[0].month} – ${monthly[monthly.length - 1].month}` : "N/A";

  return {
    summary: { totalSpend: Math.round(totalSpend * 100) / 100, totalIncome: Math.round(totalIncome * 100) / 100,
      netCashFlow: Math.round(netCashFlow * 100) / 100, netBalance: Math.round(netCashFlow * 100) / 100,
      transactions: txns, dateRange, avgMonthlySpend: Math.round(totalSpend / monthsCount),
      avgMonthly: Math.round(totalSpend / monthsCount), avgMonthlyIncome: Math.round(totalIncome / monthsCount),
      savingsRate, totalPayments: Math.round(totalIncome * 100) / 100 },
    categories, monthly, sources, topMerchants, dayOfWeek, subscriptions,
    subscriptionTotal: { monthly: Math.round(subMonthly * 100) / 100, annual: Math.round(subMonthly * 12 * 100) / 100 },
  };
}

function mergeCrypto(owners: OwnerKey[]): any {
  const od = OWNER_DATA as any;
  const parts = owners.map((o) => od[o]?.crypto).filter(Boolean);
  if (!parts.length) return CRYPTO_DATA;

  const totalInvested = parts.reduce((s: number, p: any) => s + (p.summary?.totalInvested || 0), 0);
  const totalSold = parts.reduce((s: number, p: any) => s + (p.summary?.totalSold || 0), 0);
  const totalFees = parts.reduce((s: number, p: any) => s + (p.summary?.totalFees || 0), 0);
  const stakingIncome = parts.reduce((s: number, p: any) => s + (p.summary?.stakingIncome || 0), 0);
  const netPnL = totalSold - totalInvested;
  const pnlPct = totalInvested > 0 ? Math.round(netPnL / totalInvested * 1000) / 10 : 0;
  const allAssets = new Set<string>();
  parts.forEach((p: any) => (p.summary?.assets || []).forEach((a: string) => allAssets.add(a)));

  // Merge positions
  const pm = new Map<string, any>();
  parts.forEach((p: any) => (p.positions || []).forEach((pos: any) => {
    const e = pm.get(pos.asset) || { asset: pos.asset, invested: 0, sold: 0, txnCount: 0, lastDate: null };
    e.invested += pos.invested || 0; e.sold += pos.sold || 0; e.txnCount += pos.txnCount || 0;
    if (pos.lastDate && (!e.lastDate || pos.lastDate > e.lastDate)) e.lastDate = pos.lastDate;
    pm.set(pos.asset, e);
  }));
  const positions = Array.from(pm.values()).map((p) => ({
    ...p, pnl: Math.round((p.sold - p.invested) * 100) / 100,
    pnlPct: p.invested > 0 ? Math.round((p.sold - p.invested) / p.invested * 1000) / 10 : 0,
  })).sort((a, b) => b.invested - a.invested);

  // Merge monthly
  const mmm = new Map<string, { bought: number; sold: number; fees: number }>();
  parts.forEach((p: any) => (p.monthly || []).forEach((m: any) => {
    const e = mmm.get(m.month) || { bought: 0, sold: 0, fees: 0 };
    e.bought += m.bought || 0; e.sold += m.sold || 0; e.fees += m.fees || 0;
    mmm.set(m.month, e);
  }));
  const monthly = Array.from(mmm.entries()).sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({ month, ...d, net: Math.round((d.sold - d.bought) * 100) / 100 }));

  // Merge byType
  const bt = new Map<string, { count: number; total: number }>();
  parts.forEach((p: any) => (p.byType || []).forEach((t: any) => {
    const e = bt.get(t.type) || { count: 0, total: 0 };
    e.count += t.count || 0; e.total += t.total || 0;
    bt.set(t.type, e);
  }));
  const byType = Array.from(bt.entries()).map(([type, d]) => ({ type, ...d })).sort((a, b) => a.type.localeCompare(b.type));

  return {
    summary: { totalInvested: Math.round(totalInvested * 100) / 100, totalSold: Math.round(totalSold * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100, netPnL: Math.round(netPnL * 100) / 100,
      pnlPct, stakingIncome: Math.round(stakingIncome * 100) / 100, assets: Array.from(allAssets) },
    positions, monthly, byType,
  };
}

export default function Dashboard() {
  const D = FINANCE_DATA;
  const M = D.markets;
  const P = D.personal;
  const A = AMEX_DATA;
  const FC = FORECAST_DATA;
  const AL = ALERTS_DATA;

  const [tab, setTab] = useState<Tab>("overview");
  const [unlocked, setUnlocked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState(false);
  const [selectedOwners, setSelectedOwners] = useState<OwnerKey[]>([]);

  // When no owners selected → "all" mode = use global data
  const isAllMode = selectedOwners.length === 0;
  const S = useMemo(() => isAllMode ? SPENDING_DATA : mergeSpending(selectedOwners), [selectedOwners, isAllMode]);
  const CR = useMemo(() => isAllMode ? CRYPTO_DATA : mergeCrypto(selectedOwners), [selectedOwners, isAllMode]);
  const SUB = useMemo(() => {
    if (isAllMode) return SUBSCRIPTIONS_DATA;
    const items = (S as any).subscriptions || [];
    const monthly = items.reduce((s: number, i: any) => s + (i.monthlyEst || 0), 0);
    const cancelItems = items.filter((s: any) => s.status === "cancel");
    const savingsMonthly = cancelItems.reduce((s: number, i: any) => s + (i.monthlyEst || 0), 0);
    return { items, total: { monthly, annual: monthly * 12 }, potentialSavings: { monthly: savingsMonthly, annual: savingsMonthly * 12 } };
  }, [S, isAllMode]);

  function toggleOwner(o: OwnerKey) {
    setSelectedOwners((prev) => prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]);
  }

  const daysLeft = useMemo(() => {
    const deadline = new Date(P.taxAlert.deadline);
    return Math.ceil((deadline.getTime() - new Date().getTime()) / 86400000);
  }, [P.taxAlert.deadline]);

  const activeAgents = P.agents.filter((a) => a.status === "active").length;
  // Spending data — reactive to owner filter
  const totalIncome = S.summary.totalIncome;
  const totalSpend = S.summary.totalSpend;
  const netCashFlow = S.summary.netCashFlow;
  const savingsRate = S.summary.savingsRate;
  const topCategory = useMemo(() => S.categories.length > 0 ? S.categories.reduce((p: any, c: any) => (c.total > p.total ? c : p), S.categories[0]) : { name: "N/A", total: 0 }, [S]);

  const monthlySpendData = useMemo(
    () => S.monthly.slice(-8).map((m: any) => ({ label: m.month, value: m.total || 0, color: "#ef4444" })),
    [S]
  );

  const monthlyIncomeData = useMemo(
    () => S.monthly.slice(-8).map((m: any) => ({ label: m.month, value: m.income || 0, color: "#34d399" })),
    [S]
  );

  const dayOfWeekData = useMemo(() => {
    return (S.dayOfWeek || []).map((d: any) => ({ label: d.day, value: d.total, color: d.day === "Fri" ? "#ef4444" : "#3b82f6" }));
  }, [S]);

  // Crypto — reactive to owner filter
  const cryptoPositions = CR.positions || [];
  const cryptoSummary = CR.summary;

  // Forecast from real data
  const forecastScenarios = useMemo(() => {
    const ap = FC.annualProjection as any;
    return [
      { name: "Optimistic", spending: (ap?.optimistic?.expenses || 90000) / 12, income: (ap?.optimistic?.income || 144000) / 12, savings: (ap?.optimistic?.savings || 54000) / 12, growth: "+30%" },
      { name: "Baseline", spending: (ap?.baseline?.expenses || 102000) / 12, income: (ap?.baseline?.income || 132000) / 12, savings: (ap?.baseline?.savings || 30000) / 12, growth: "current" },
      { name: "Pessimistic", spending: (ap?.pessimistic?.expenses || 117000) / 12, income: (ap?.pessimistic?.income || 114000) / 12, savings: (ap?.pessimistic?.savings || 0) / 12, growth: "-15%" },
    ];
  }, []);

  const ownerLabel = useMemo(() => {
    if (isAllMode) return "Все";
    return selectedOwners.map((o) => OWNER_LABELS[o]).join(" + ");
  }, [selectedOwners, isAllMode]);

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
    unlocked ? setTab("personal") : setShowModal(true);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-300">
      <header className="px-6 py-4 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <span className="text-emerald-400 text-2xl">₿</span> Cripta Finance HQ
        </h1>
        <div className="flex items-center gap-4 text-base text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {D.meta.risk_level}
          </span>
          <span>{new Date(D.meta.updated).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          <span>Agents: {D.meta.agents_active}/{D.meta.agents_total}</span>
        </div>
      </header>

      <nav className="flex gap-0.5 px-6 py-2 border-b border-gray-800 bg-black/20 overflow-x-auto">
        {PUBLIC_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn("px-4 py-2 rounded text-base font-medium transition-colors whitespace-nowrap", tab === t.id ? "text-gray-100 bg-blue-500/15" : "text-gray-500 hover:text-gray-300 hover:bg-white/5")}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={handlePersonalClick}
          className={cn("ml-auto px-3 py-1.5 rounded text-base font-medium border transition-colors whitespace-nowrap", tab === "personal" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : unlocked ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" : "text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10")}
        >
          {unlocked ? "🔓" : "🔒"} Personal
        </button>
      </nav>

      {/* Owner filter chips */}
      <div className="flex items-center gap-2 px-6 py-2 border-b border-gray-800 bg-black/10 overflow-x-auto">
        <span className="text-xs text-gray-600 uppercase tracking-wider mr-1">Чьи:</span>
        <button
          onClick={() => setSelectedOwners([])}
          className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors",
            isAllMode ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-gray-500 border border-gray-800 hover:text-gray-300 hover:border-gray-600")}
        >Все</button>
        {ALL_OWNERS.map((o) => (
          <button key={o} onClick={() => toggleOwner(o)}
            className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors",
              selectedOwners.includes(o) ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-gray-500 border border-gray-800 hover:text-gray-300 hover:border-gray-600")}
          >{OWNER_LABELS[o]}</button>
        ))}
        {selectedOwners.length > 1 && (
          <span className="text-xs text-gray-600 ml-2">= {ownerLabel}</span>
        )}
      </div>

      <main className="max-w-[1440px] mx-auto px-6 py-5">
        {/* =============== OVERVIEW =============== */}
        {tab === "overview" && (
          <div>
            <SectionTitle badge="Cash Position">Overview</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <Label>Total Income</Label>
                <div className="text-xl font-bold text-gray-100">${totalIncome.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                <div className="text-base text-gray-500">13 months</div>
              </Card>
              <Card>
                <Label>Total Expenses</Label>
                <div className="text-xl font-bold text-gray-100">${totalSpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                <div className="text-base text-emerald-400">{S.summary.transactions} transactions</div>
              </Card>
              <Card>
                <Label>Net Cash Flow</Label>
                <div className={cn("text-xl font-bold", netCashFlow > 0 ? "text-emerald-400" : "text-red-400")}>${netCashFlow.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                <div className="text-base text-gray-500">Avg {(netCashFlow / 13).toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo</div>
              </Card>
              <Card>
                <Label>Savings Rate</Label>
                <div className={cn("text-xl font-bold", savingsRate > 0 ? "text-emerald-400" : "text-red-400")}>{savingsRate.toFixed(1)}%</div>
                <div className="text-base text-gray-500">of income saved</div>
              </Card>
            </div>

            <SectionTitle>Monthly Cash Flow</SectionTitle>
            <Card>
              <div style={{ height: "240px" }}>
                <BarChart data={monthlySpendData} height={240} />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-3 text-base">
                <span className="text-gray-500">Avg Monthly: ${S.summary.avgMonthlySpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              </div>
            </Card>

            <SectionTitle badge="10 Alerts" badgeColor="red">
              Top Alerts
            </SectionTitle>
            <Card>
              <div className="space-y-2">
                <div className="flex items-start gap-3 pb-2 border-b border-gray-800/30">
                  <span className="text-red-400 text-lg flex-shrink-0">🚨</span>
                  <div className="flex-1">
                    <div className="text-base font-semibold text-gray-100">Subscriptions: $1,274/mo</div>
                    <div className="text-base text-gray-500">Review flagged subscriptions: Cursor ($430/mo), Mint Mobile (duplicate), BeenVerified</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 pb-2 border-b border-gray-800/30">
                  <span className="text-yellow-400 text-lg flex-shrink-0">⚠️</span>
                  <div className="flex-1">
                    <div className="text-base font-semibold text-gray-100">Spending Spike in Jun 2025</div>
                    <div className="text-base text-gray-500">$15,347 (+79% above average) — Travel expenses detected</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-blue-400 text-lg flex-shrink-0">ℹ️</span>
                  <div className="flex-1">
                    <div className="text-base font-semibold text-gray-100">Tax Deadline: {daysLeft} days</div>
                    <div className="text-base text-gray-500">File 2025 taxes by April 15, 2026 — Estimated penalty if missed</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* =============== SPENDING =============== */}
        {tab === "spending" && (
          <div>
            <SectionTitle badge={S.summary.dateRange} badgeColor="blue">
              Spending Analysis — All Sources
            </SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <Label>Total Spend</Label>
                <div className="text-xl font-bold text-gray-100">${totalSpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                <div className="text-base text-gray-500">{S.summary.transactions} transactions</div>
              </Card>
              <Card>
                <Label>Avg Monthly</Label>
                <div className="text-xl font-bold text-yellow-400">${S.summary.avgMonthlySpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                <div className="text-base text-gray-500">{S.monthly.length} months tracked</div>
              </Card>
              <Card>
                <Label>Top Category</Label>
                <div className="text-xl font-bold text-gray-100">{topCategory.name}</div>
                <div className="text-base text-gray-500">${topCategory.total.toLocaleString("en-US", { maximumFractionDigits: 0 })} ({topCategory.pct}%)</div>
              </Card>
              <Card>
                <Label>Sources</Label>
                <div className="text-xl font-bold text-gray-100">{(S.sources || []).length}</div>
                <div className="text-base text-gray-500">AMEX, WF, Cap One</div>
              </Card>
            </div>

            <SectionTitle>Monthly Trend</SectionTitle>
            <Card>
              <div style={{ height: "240px" }}>
                <BarChart data={monthlySpendData} height={240} />
              </div>
            </Card>

            <SectionTitle>Spending by Category</SectionTitle>
            <Card>
              <div className="space-y-3">
                {S.categories.map((c: any) => (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-base text-gray-300 min-w-[120px]">{c.name}</span>
                    <MiniBar value={c.total} max={Math.max(...S.categories.map((x: any) => x.total))} color={c.color} />
                    <span className="text-base font-semibold text-gray-100 min-w-[90px] text-right font-mono">${c.total.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                    <span className="text-base text-gray-500 min-w-[40px] text-right">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </Card>

            <SectionTitle>Top 20 Merchants</SectionTitle>
            <Card>
              <table className="w-full text-base">
                <thead>
                  <tr className="text-left text-base text-gray-500 uppercase tracking-wider border-b border-gray-800">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Merchant</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium text-right">Txns</th>
                    <th className="pb-2 font-medium text-right">Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {S.topMerchants.slice(0, 20).map((m: any, i: number) => (
                    <tr key={m.name} className="border-b border-gray-800/30 last:border-0 hover:bg-gray-800/20">
                      <td className="py-2.5 text-gray-500">{i + 1}</td>
                      <td className="py-2.5 text-gray-100">{m.name}</td>
                      <td className="py-2.5 text-right font-mono">${m.total.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                      <td className="py-2.5 text-right text-gray-500">{m.count}</td>
                      <td className="py-2.5 text-right text-gray-500 font-mono">${m.avg?.toLocaleString("en-US", { maximumFractionDigits: 0 }) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <SectionTitle>Spending by Day of Week</SectionTitle>
            <Card>
              <div style={{ height: "200px" }}>
                <BarChart data={dayOfWeekData} height={200} />
              </div>
            </Card>
          </div>
        )}

        {/* =============== INCOME =============== */}
        {tab === "income" && (
          <div>
            <SectionTitle badge="Est. Annual">Income Dashboard</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card>
                <Label>Total Income (13mo)</Label>
                <div className="text-xl font-bold text-emerald-400">${totalIncome.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                <div className="text-base text-gray-500">Monthly avg: ${(totalIncome / 13).toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
              </Card>
              <Card>
                <Label>Income Streams</Label>
                <div className="text-xl font-bold text-gray-100">{P.profile.incomeStreams.length}</div>
                <div className="text-base text-gray-500">{P.profile.incomeStreams.join(", ")}</div>
              </Card>
              <Card>
                <Label>Income vs Expenses</Label>
                <div className="text-xl font-bold text-emerald-400">
                  {((totalIncome / A.summary.totalSpend) * 100).toFixed(0)}%
                </div>
                <div className="text-base text-gray-500">Ratio of income to spending</div>
              </Card>
            </div>

            <SectionTitle>Monthly Income Trend</SectionTitle>
            <Card>
              <div style={{ height: "220px" }}>
                <BarChart
                  data={[
                    { label: "Feb", value: 8500, color: "#10b981" },
                    { label: "Mar", value: 9200, color: "#10b981" },
                    { label: "Apr", value: 9800, color: "#10b981" },
                    { label: "May", value: 9100, color: "#10b981" },
                    { label: "Jun", value: 9500, color: "#10b981" },
                    { label: "Jul", value: 8800, color: "#10b981" },
                  ]}
                  height={220}
                />
              </div>
            </Card>

            <SectionTitle>Income vs Expenses Comparison</SectionTitle>
            <Card>
              <table className="w-full text-base">
                <thead>
                  <tr className="text-left text-base text-gray-500 uppercase border-b border-gray-800">
                    <th className="pb-2 font-medium">Month</th>
                    <th className="pb-2 font-medium text-right">Income</th>
                    <th className="pb-2 font-medium text-right">Expenses</th>
                    <th className="pb-2 font-medium text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {A.monthly.slice(-6).map((m) => {
                    const monthIncome = (totalIncome / 13) * 1.02; // Approximate
                    const net = monthIncome - m.total;
                    return (
                      <tr key={m.month} className="border-b border-gray-800/30 last:border-0 hover:bg-gray-800/20">
                        <td className="py-2.5 font-medium text-gray-100">{m.month}</td>
                        <td className="py-2.5 text-right text-emerald-400 font-mono">${monthIncome.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                        <td className="py-2.5 text-right text-red-400 font-mono">${m.total.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                        <td className={cn("py-2.5 text-right font-mono font-semibold", net > 0 ? "text-emerald-400" : "text-red-400")}>
                          ${net.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* =============== SUBSCRIPTIONS =============== */}
        {tab === "subscriptions" && (
          <div>
            <SectionTitle badge={`$${SUB.total.monthly.toFixed(0)}/mo`} badgeColor="purple">
              Subscription Audit
            </SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card>
                <Label>Total Monthly</Label>
                <div className="text-xl font-bold text-purple-400">${SUB.total.monthly.toFixed(0)}/mo</div>
                <div className="text-base text-gray-500">${SUB.total.annual.toLocaleString("en-US", { maximumFractionDigits: 0 })}/yr</div>
              </Card>
              <Card>
                <Label>% of Spending</Label>
                <div className="text-xl font-bold text-yellow-400">
                  {((SUB.total.monthly / S.summary.avgMonthlySpend) * 100).toFixed(1)}%
                </div>
                <div className="text-base text-gray-500">Of monthly budget</div>
              </Card>
              <Card>
                <Label>Flagged for Review</Label>
                <div className="text-xl font-bold text-red-400">{SUB.items.filter((s: any) => s.status !== "keep").length}</div>
                <div className="text-base text-gray-500">Need attention</div>
              </Card>
            </div>

            <SectionTitle badge="Critical Issues">Alerts</SectionTitle>
            <Card>
              <div className="space-y-3">
                <div className="border-l-4 border-l-red-500 bg-red-500/10 p-3 rounded-r">
                  <div className="text-base font-semibold text-red-400">Cursor: $430/mo + $271/mo usage = $701/mo total</div>
                  <div className="text-base text-gray-400">Potential savings: $4,200+/yr if subscription cancelled</div>
                </div>
                <div className="border-l-4 border-l-yellow-500 bg-yellow-500/10 p-3 rounded-r">
                  <div className="text-base font-semibold text-yellow-400">Mint Mobile: 2 subscriptions</div>
                  <div className="text-base text-gray-400">Duplicate recurring payments detected. Consolidate to save ~$60/mo</div>
                </div>
                <div className="border-l-4 border-l-yellow-500 bg-yellow-500/10 p-3 rounded-r">
                  <div className="text-base font-semibold text-yellow-400">BeenVerified: $335.84 (11 months)</div>
                  <div className="text-base text-gray-400">Verify necessity. Potential savings: $360/yr</div>
                </div>
              </div>
            </Card>

            <SectionTitle>Full Subscription List</SectionTitle>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-base">
                  <thead>
                    <tr className="text-left text-base text-gray-500 uppercase tracking-wider border-b border-gray-800">
                      <th className="pb-2 font-medium">Service</th>
                      <th className="pb-2 font-medium text-right">Monthly</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                      <th className="pb-2 font-medium text-right">Months</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SUB.items.map((s: any) => {
                      const statusColors: Record<string, string> = {
                        keep: "bg-emerald-500/15 text-emerald-400",
                        review: "bg-yellow-500/15 text-yellow-400",
                        cancel: "bg-red-500/15 text-red-400",
                        flag: "bg-blue-500/15 text-blue-400",
                      };
                      return (
                        <tr key={s.name} className="border-b border-gray-800/30 last:border-0 hover:bg-gray-800/20">
                          <td className="py-2.5 text-gray-100">{s.name}</td>
                          <td className="py-2.5 text-right font-mono text-purple-400">${s.monthlyEst.toFixed(2)}</td>
                          <td className="py-2.5 text-right font-mono">${s.total.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                          <td className="py-2.5 text-right text-gray-500">{s.months}</td>
                          <td className="py-2.5">
                            <span className={cn("text-sm px-2 py-0.5 rounded font-semibold", statusColors[s.status] || statusColors.keep)}>{s.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-700 bg-gray-800/20">
                      <td className="py-2.5 font-semibold text-gray-100">TOTAL</td>
                      <td className="py-2.5 text-right font-mono font-semibold text-purple-400">${SUB.total.monthly.toFixed(2)}/mo</td>
                      <td className="py-2.5 text-right font-mono font-semibold">${SUB.total.annual.toLocaleString("en-US", { maximumFractionDigits: 0 })}/yr</td>
                      <td />
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            <SectionTitle badge="Potential Savings">Annual Impact</SectionTitle>
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-base text-gray-500 mb-1">Current Annual Cost</div>
                  <div className="text-2xl font-bold text-purple-400">${SUB.total.annual.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                </div>
                <div>
                  <div className="text-base text-gray-500 mb-1">Flagged for Review</div>
                  <div className="text-2xl font-bold text-yellow-400">${SUB.potentialSavings.annual.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                </div>
                <div>
                  <div className="text-base text-gray-500 mb-1">Potential Savings</div>
                  <div className="text-2xl font-bold text-emerald-400">-${SUB.potentialSavings.monthly.toFixed(0)}/mo</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* =============== CRYPTO =============== */}
        {tab === "crypto" && (
          <div>
            <SectionTitle badge="Portfolio Summary" badgeColor="purple">
              Crypto Holdings
            </SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <Label>Total Invested</Label>
                <div className="text-xl font-bold text-purple-400">${cryptoSummary.totalInvested.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                <div className="text-base text-gray-500">{cryptoSummary.assets} assets</div>
              </Card>
              <Card>
                <Label>Sold / Realized</Label>
                <div className="text-xl font-bold text-gray-100">${cryptoSummary.totalSold.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                <div className="text-base text-gray-500">Realized sales</div>
              </Card>
              <Card>
                <Label>Net P&L</Label>
                <div className={cn("text-xl font-bold", cryptoSummary.netPnL > 0 ? "text-emerald-400" : "text-red-400")}>
                  ${cryptoSummary.netPnL.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </div>
                <div className="text-base text-gray-500">{cryptoSummary.pnlPct.toFixed(1)}% return</div>
              </Card>
              <Card>
                <Label>Fees Paid</Label>
                <div className="text-xl font-bold text-yellow-400">${cryptoSummary.totalFees.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                <div className="text-base text-gray-500">Trading + withdraw fees</div>
              </Card>
            </div>

            <SectionTitle>Holdings & P&L</SectionTitle>
            <Card>
              <table className="w-full text-base">
                <thead>
                  <tr className="text-left text-base text-gray-500 uppercase tracking-wider border-b border-gray-800">
                    <th className="pb-2 font-medium">Asset</th>
                    <th className="pb-2 font-medium text-right">Invested</th>
                    <th className="pb-2 font-medium text-right">Sold</th>
                    <th className="pb-2 font-medium text-right">P&L</th>
                    <th className="pb-2 font-medium text-right">% Change</th>
                  </tr>
                </thead>
                <tbody>
                  {cryptoPositions.map((p: any) => (
                    <tr key={p.asset} className="border-b border-gray-800/30 last:border-0 hover:bg-gray-800/20">
                      <td className="py-2.5 font-medium text-gray-100">{p.asset}</td>
                      <td className="py-2.5 text-right font-mono">${p.invested.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                      <td className="py-2.5 text-right font-mono text-gray-500">${p.sold.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                      <td className={cn("py-2.5 text-right font-mono font-semibold", p.pnl > 0 ? "text-emerald-400" : "text-red-400")}>
                        ${p.pnl.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </td>
                      <td className={cn("py-2.5 text-right font-mono", p.pnlPct > 0 ? "text-emerald-400" : "text-red-400")}>
                        {p.pnlPct > 0 ? "+" : ""}{p.pnlPct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <SectionTitle>By-Type Breakdown</SectionTitle>
            <Card>
              <div className="space-y-3">
                {(CR.byType || []).map((item: any, i: number) => {
                  const maxCount = Math.max(...(CR.byType || []).map((x: any) => x.count));
                  const colors = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6","#6366f1","#f97316","#a855f7","#0ea5e9","#84cc16"];
                  return (
                    <div key={item.type} className="flex items-center gap-3">
                      <span className="text-base text-gray-300 min-w-[140px]">{item.type}</span>
                      <MiniBar value={item.count} max={maxCount} color={colors[i % colors.length]} />
                      <span className="text-base font-semibold text-gray-100 min-w-[40px] text-right">{item.count}</span>
                      <span className="text-base text-gray-500 min-w-[80px] text-right font-mono">${item.total.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                    </div>
                  );
                })}
              </div>
            </Card>

            <SectionTitle>Risk Disclosure</SectionTitle>
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <div className="text-base text-yellow-300">
                ⚠️ Crypto is highly volatile. {P.profile.cryptoExperience} trader with {P.profile.cryptoBudget} budget. DCA recommended. Never invest more than you can afford to lose.
              </div>
            </Card>
          </div>
        )}

        {/* =============== FORECAST =============== */}
        {tab === "forecast" && (
          <div>
            <SectionTitle badge="6-Month Outlook">Financial Forecast</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {forecastScenarios.map((scenario) => (
                <Card key={scenario.name} className={cn("border-2", scenario.name === "Baseline" ? "border-blue-500/30 bg-blue-500/5" : "border-gray-800")}>
                  <div className="text-base font-semibold text-gray-100 mb-3">{scenario.name}</div>
                  <div className="space-y-2">
                    <div>
                      <Label>Monthly Income</Label>
                      <div className="text-lg font-bold text-emerald-400">${scenario.income.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div>
                      <Label>Monthly Spending</Label>
                      <div className="text-lg font-bold text-red-400">${scenario.spending.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div>
                      <Label>Monthly Savings</Label>
                      <div className={cn("text-lg font-bold", scenario.savings > 0 ? "text-emerald-400" : "text-red-400")}>
                        ${scenario.savings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-800">
                      <Label>6-Month Growth</Label>
                      <div className={cn("text-lg font-bold", scenario.growth.startsWith("+") ? "text-emerald-400" : "text-red-400")}>
                        {scenario.growth}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <SectionTitle>6-Month Projection (Baseline)</SectionTitle>
            <Card>
              <div style={{ height: "220px" }}>
                <BarChart
                  data={[
                    { label: "Apr", value: 2500, color: "#10b981" },
                    { label: "May", value: 2500, color: "#10b981" },
                    { label: "Jun", value: 2500, color: "#10b981" },
                    { label: "Jul", value: 2500, color: "#10b981" },
                    { label: "Aug", value: 2500, color: "#10b981" },
                    { label: "Sep", value: 2500, color: "#10b981" },
                  ]}
                  height={220}
                />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-800 text-base text-gray-400">
                Projected net savings: $15,000 over 6 months (baseline scenario)
              </div>
            </Card>

            <SectionTitle badge="Potential Annual Savings" badgeColor="green">
              Subscription Optimization
            </SectionTitle>
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-base text-gray-500 mb-2">Current Annual Subscriptions</div>
                  <div className="text-3xl font-bold text-purple-400">${SUB.total.annual.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
                </div>
                <div>
                  <div className="text-base text-gray-500 mb-2">If Optimized</div>
                  <div className="text-3xl font-bold text-emerald-400">$10,793</div>
                  <div className="text-base text-emerald-400 mt-1">Save $4,500 (~29%)</div>
                </div>
              </div>
            </Card>

            <SectionTitle>Annual Comparison</SectionTitle>
            <Card>
              <table className="w-full text-base">
                <thead>
                  <tr className="text-left text-base text-gray-500 uppercase border-b border-gray-800">
                    <th className="pb-2 font-medium">Scenario</th>
                    <th className="pb-2 font-medium text-right">Income</th>
                    <th className="pb-2 font-medium text-right">Spending</th>
                    <th className="pb-2 font-medium text-right">Net Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { scenario: "Optimistic", income: 144000, spending: 90000, savings: 54000 },
                    { scenario: "Baseline", income: 132000, spending: 102000, savings: 30000 },
                    { scenario: "Pessimistic", income: 114000, spending: 114000, savings: 0 },
                  ].map((row) => (
                    <tr key={row.scenario} className="border-b border-gray-800/30 last:border-0 hover:bg-gray-800/20">
                      <td className="py-2.5 font-medium text-gray-100">{row.scenario}</td>
                      <td className="py-2.5 text-right text-emerald-400 font-mono">${row.income.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                      <td className="py-2.5 text-right text-red-400 font-mono">${row.spending.toLocaleString("en-US", { maximumFractionDigits: 0 })}</td>
                      <td className={cn("py-2.5 text-right font-mono font-semibold", row.savings > 0 ? "text-emerald-400" : "text-red-400")}>
                        ${row.savings.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* =============== MARKETS =============== */}
        {tab === "markets" && (
          <div>
            <SectionTitle badge={M.regime} badgeColor="red">
              Market Snapshot
            </SectionTitle>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {M.indices.map((i) => (
                <Card key={i.name}>
                  <Label>{i.name}</Label>
                  <div className="text-xl font-bold text-gray-100">{i.value}</div>
                  <div className="mt-0.5">
                    <Change value={i.change} />
                    {i.note && <span className="text-base text-gray-500 ml-2">{i.note}</span>}
                  </div>
                </Card>
              ))}
            </div>

            <SectionTitle>Crypto Prices</SectionTitle>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {M.crypto.filter((c) => c.price).map((c) => (
                <Card key={c.ticker}>
                  <Label>
                    {c.name} ({c.ticker})
                  </Label>
                  <div className="text-xl font-bold text-gray-100">${c.price!.toLocaleString()}</div>
                  <Change value={c.change24h} />
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
              <Card>
                <Label>Fear & Greed Index</Label>
                <div className="text-center py-4">
                  <div className="text-5xl font-extrabold text-red-400">{M.fearGreed.value}</div>
                  <div className="text-base font-semibold text-red-400 mt-1">{M.fearGreed.label}</div>
                </div>
                <div className="space-y-2 mt-2">
                  {M.fearGreed.history.map((h) => (
                    <div key={h.label} className="flex items-center gap-2">
                      <span className="text-base text-gray-500 min-w-[120px]">{h.label}</span>
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${h.value}%`, background: h.value < 20 ? "#ef4444" : h.value < 40 ? "#f59e0b" : "#3b82f6" }} />
                      </div>
                      <span className="text-base font-semibold text-gray-100 min-w-[24px] text-right">{h.value}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <Label>Top Headlines</Label>
                <div className="divide-y divide-gray-800/50">
                  {M.news.slice(0, 3).map((n, i) => (
                    <div key={i} className="py-3 first:pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={cn("text-sm px-2 py-0.5 rounded font-semibold", n.impact === "positive" ? "bg-emerald-500/15 text-emerald-400" : n.impact === "negative" ? "bg-red-500/15 text-red-400" : "bg-yellow-500/15 text-yellow-400")}
                        >
                          {n.impact}
                        </span>
                        <span className="text-base font-semibold text-gray-100">{n.title}</span>
                      </div>
                      <p className="text-base text-gray-500 leading-relaxed">{n.detail}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <SectionTitle>Commodities</SectionTitle>
            <Card>
              <table className="w-full text-base">
                <thead>
                  <tr className="text-left text-base text-gray-500 uppercase tracking-wider border-b border-gray-800">
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
                      <td className="py-2.5">
                        <Change value={c.change} />
                      </td>
                      <td className="py-2.5 text-gray-500">{c.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <SectionTitle badge="CAUTION" badgeColor="yellow">
              Macro Dashboard
            </SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card>
                <Label>CPI</Label>
                <div className="text-xl font-bold text-gray-100">{M.macro.cpi}</div>
                <div className="text-base text-yellow-400">Core: {M.macro.coreCpi}</div>
              </Card>
              <Card>
                <Label>Fed Rate</Label>
                <div className="text-xl font-bold text-gray-100">{M.macro.fedRate}</div>
                <div className="text-base text-gray-500">{M.macro.fedOutlook}</div>
              </Card>
              <Card>
                <Label>Recession Prob</Label>
                <div className="text-xl font-bold text-yellow-400">{M.macro.recessionProb}</div>
              </Card>
            </div>

            <SectionTitle>Key Indicators</SectionTitle>
            <Card>
              <table className="w-full text-base">
                <thead>
                  <tr className="text-left text-base text-gray-500 uppercase border-b border-gray-800">
                    <th className="pb-2 font-medium">Indicator</th>
                    <th className="pb-2 font-medium">Value</th>
                    <th className="pb-2 font-medium">Trend</th>
                    <th className="pb-2 font-medium">Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["CPI", M.macro.cpi, "→ risk ↑", "Cost of living"],
                    ["Fed Rate", M.macro.fedRate, "→ pause", "HYSA yield"],
                    ["Unemployment", M.macro.unemployment, "↑ rising", "Freelance demand"],
                    ["GDP Q1", M.macro.gdpQ1, "↓ slowing", "Economy"],
                    ["10Y Treasury", "4.41%", "↑ 8mo high", "Risk assets"],
                    ["Recession", M.macro.recessionProb, "↑ Goldman", "Overall risk"],
                    ["Next FOMC", M.macro.nextFomc, "—", "Policy"],
                  ].map(([n, v, t, im]) => (
                    <tr key={n} className="border-b border-gray-800/30 last:border-0">
                      <td className="py-2.5 font-medium text-gray-100">{n}</td>
                      <td className="py-2.5">{v}</td>
                      <td className="py-2.5 text-yellow-400">{t}</td>
                      <td className="py-2.5 text-gray-500">{im}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* =============== ALERTS =============== */}
        {tab === "alerts" && (
          <div>
            <SectionTitle badge="10 Active" badgeColor="red">
              All Alerts
            </SectionTitle>

            <div className="space-y-3">
              {[
                { severity: "critical", title: "Subscriptions: $1,274/mo", detail: "5 flagged for review. Cursor alone is $701/mo.", action: "Review and consolidate" },
                { severity: "critical", title: "Tax Deadline: 19 days", detail: "2025 taxes due April 15, 2026. Filing status: MFJ. Penalty likely if late.", action: "Contact CPA today" },
                { severity: "high", title: "Spending Spike: Jun 2025", detail: "$15,347 (+79% above average). Travel category detected.", action: "Investigate transaction categories" },
                { severity: "high", title: "Mint Mobile Duplicate", detail: "Two subscriptions: $107.79 + $113.11/mo from PayPal + direct", action: "Cancel duplicate immediately" },
                { severity: "medium", title: "Cursor Usage Overages", detail: "$270.61/mo in usage charges on top of $160/mo subscription", action: "Consider alternative tools or lower tier" },
                { severity: "medium", title: "Crypto Volatility", detail: "Market in EXTREME FEAR (10/100). SOL -5.6%, ETH -4.5%.", action: "Maintain DCA discipline" },
                { severity: "medium", title: "No Emergency Fund Data", detail: "Cannot assess emergency fund adequacy. 3-6 months recommended.", action: "Provide savings account balance" },
                { severity: "info", title: "Goldman: Recession Prob 30%", detail: "Increased from 25%. Geopolitical risks, slowdown GDP", action: "Review asset allocation" },
                { severity: "info", title: "BeenVerified: $335.84", detail: "11 months of charges. Verify if actively used.", action: "Review/cancel if unnecessary" },
                { severity: "info", title: "Markets: Risk-Off Mode", detail: "VIX +9.0 to 27.6. S&P -1.74%, Nasdaq -2.19%", action: "Monitor positioning" },
              ].map((alert, i) => {
                const severityColor = { critical: "red", high: "yellow", medium: "blue", info: "gray" }[alert.severity];
                const severityBg = { critical: "bg-red-500/15 text-red-400", high: "bg-yellow-500/15 text-yellow-400", medium: "bg-blue-500/15 text-blue-400", info: "bg-gray-500/15 text-gray-400" }[alert.severity];
                const borderColor = { critical: "border-l-red-500", high: "border-l-yellow-500", medium: "border-l-blue-500", info: "border-l-gray-600" }[alert.severity];

                return (
                  <div key={i} className={cn("border-l-4 bg-gray-900/60 border border-gray-800 rounded-r-lg p-4", borderColor)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn("text-sm px-2 py-0.5 rounded font-semibold uppercase", severityBg)}>{alert.severity}</span>
                          <div className="text-base font-semibold text-gray-100">{alert.title}</div>
                        </div>
                        <div className="text-base text-gray-400 leading-relaxed">{alert.detail}</div>
                        <div className="text-base text-blue-400 mt-2 font-medium">→ {alert.action}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =============== PERSONAL =============== */}
        {tab === "personal" && unlocked && (
          <div>
            <SectionTitle badge={`CRITICAL — ${daysLeft} days`} badgeColor="red">
              Tax Alert
            </SectionTitle>
            <Card className="text-center border-red-500/30 mb-4">
              <div className="text-6xl font-extrabold text-red-400 py-4">{daysLeft > 0 ? daysLeft : "OVERDUE"}</div>
              <div className="text-base font-semibold text-red-400">days until April 15, 2026</div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
              <Card>
                <Label>Tax Profile</Label>
                <table className="w-full text-base mt-2">
                  <tbody>
                    {[
                      ["Filing Status", P.profile.filingStatus],
                      ["State", P.profile.state],
                      ["Employment", P.profile.employment],
                      ["Income Streams", P.profile.incomeStreams.join(", ")],
                      ["Est. Tax 2025", "NOT PAID"],
                      ["Penalty", "Likely"],
                    ].map(([k, v]) => (
                      <tr key={k} className="border-b border-gray-800/30 last:border-0">
                        <td className="py-2 text-gray-500">{k}</td>
                        <td className={cn("py-2 text-right", k === "Est. Tax 2025" || k === "Penalty" ? "text-red-400 font-semibold" : "text-gray-300")}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
              <Card>
                <Label>Potential Deductions</Label>
                <table className="w-full text-base mt-2">
                  <thead>
                    <tr className="text-left text-base text-gray-500 uppercase border-b border-gray-800">
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
                          <span className={cn("text-sm px-2 py-0.5 rounded font-semibold", d.confidence >= 85 ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-400")}>
                            {d.confidence}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>

            <SectionTitle badge="AWAITING DATA" badgeColor="yellow">
              Financial Health
            </SectionTitle>
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
                    <div className="text-base text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            </Card>

            <SectionTitle badge="ELEVATED" badgeColor="red">
              Risk Matrix
            </SectionTitle>
            <Card className="mb-4">
              <table className="w-full text-base">
                <thead>
                  <tr className="text-left text-base text-gray-500 uppercase border-b border-gray-800">
                    <th className="pb-2 font-medium">Risk</th>
                    <th className="pb-2 font-medium">Prob.</th>
                    <th className="pb-2 font-medium">Impact</th>
                    <th className="pb-2 font-medium">Level</th>
                    <th className="pb-2 font-medium">Mitigation</th>
                  </tr>
                </thead>
                <tbody>
                  {P.risks.map((r) => {
                    const lc: Record<string, string> = {
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
                          <span className={cn("text-sm px-2 py-0.5 rounded font-semibold", lc[r.level])}>{r.level}</span>
                        </td>
                        <td className="py-2 text-gray-500">{r.mitigation}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>

            <SectionTitle>Recommended Actions</SectionTitle>
            <div className="space-y-2 mb-4">
              {P.actions.map((a) => {
                const bc: Record<string, string> = { P0: "border-l-red-500", P1: "border-l-yellow-500", P2: "border-l-blue-500", P3: "border-l-emerald-500" };
                return (
                  <div key={a.title} className={cn("border-l-[3px] bg-gray-900/60 border border-gray-800 rounded-r-lg p-4", bc[a.priority])}>
                    <div className="text-xs font-semibold text-gray-100 mb-1">
                      {a.priority}: {a.title}
                    </div>
                    <div className="text-base text-gray-400 leading-relaxed">
                      {a.steps.map((s, i) => (
                        <div key={i}>• {s}</div>
                      ))}
                    </div>
                    <div className="flex gap-4 mt-2 text-base text-gray-600">
                      <span>Urgency: {a.urgency}</span>
                      <span>Confidence: {a.confidence}%</span>
                      {a.professional && <span className="text-yellow-400">CPA review needed</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <SectionTitle badge={`${activeAgents}/${P.agents.length} Active`} badgeColor="green">
              Agent Status
            </SectionTitle>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
              {P.agents.map((a) => {
                const sc: Record<string, string> = {
                  active: "text-emerald-400",
                  awaiting_data: "text-yellow-400",
                  partial: "text-blue-400",
                  alert: "text-red-400",
                };
                const sl: Record<string, string> = { active: "Active", awaiting_data: "Awaiting", partial: "Partial", alert: "ALERT" };
                return (
                  <Card key={a.name} className="!p-3 text-center">
                    <div className="text-xl mb-1">{a.icon}</div>
                    <div className="text-base font-medium text-gray-300">{a.name}</div>
                    <div className={cn("text-sm mt-0.5", sc[a.status])}>● {sl[a.status]}</div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <footer className="text-base text-gray-600 text-center py-4 border-t border-gray-800 mt-6 leading-relaxed px-6">
        <strong>DISCLAIMER:</strong> Analytics only, NOT financial/tax/legal advice. Consult a CPA/advisor.
        <br />
        Cripta Finance HQ v3.0 · Powered by Financial Intelligence Office (14 agents)
      </footer>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-7 w-[340px] text-center" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-gray-100 mb-1">🔒 Personal Section</h2>
            <p className="text-xs text-gray-500 mb-4">Enter password to access personal data</p>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && checkPassword()}
              placeholder="Password"
              autoFocus
              className="w-full px-4 py-2.5 border border-gray-700 rounded-lg bg-gray-950 text-gray-100 text-sm outline-none focus:border-blue-500 mb-3"
            />
            <button onClick={checkPassword} className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 transition-colors">
              Enter
            </button>
            <button onClick={() => setShowModal(false)} className="w-full py-2.5 rounded-lg border border-gray-700 text-gray-500 text-sm mt-2 hover:bg-gray-800 transition-colors">
              Cancel
            </button>
            {pwdError && <p className="text-red-400 text-xs mt-2">Wrong password</p>}
          </div>
        </div>
      )}
    </div>
  );
}
