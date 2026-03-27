"use client";

import { useState } from "react";

const portfolioData = [
  { name: "Bitcoin", symbol: "BTC", allocation: 40, value: 4000, change24h: 2.3 },
  { name: "Ethereum", symbol: "ETH", allocation: 30, value: 3000, change24h: -1.2 },
  { name: "Solana", symbol: "SOL", allocation: 15, value: 1500, change24h: 5.7 },
  { name: "USDT", symbol: "USDT", allocation: 10, value: 1000, change24h: 0.01 },
  { name: "Другие", symbol: "ALT", allocation: 5, value: 500, change24h: -3.1 },
];

function ChangeIndicator({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span className={`font-mono text-sm ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
      {isPositive ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-gray-800 bg-gray-900/60 p-6 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"portfolio" | "transactions">("portfolio");

  const totalValue = portfolioData.reduce((sum, item) => sum + item.value, 0);
  const totalChange = portfolioData.reduce(
    (sum, item) => sum + (item.value * item.change24h) / 100,
    0
  );
  const totalChangePercent = (totalChange / totalValue) * 100;

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-emerald-400">₿</span> Cripta
          </h1>
          <p className="text-gray-400 text-sm mt-1">Финансовый дашборд</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Последнее обновление</p>
          <p className="text-sm text-gray-300">{new Date().toLocaleDateString("ru-RU")}</p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <p className="text-gray-400 text-sm mb-1">Общий портфель</p>
          <p className="text-3xl font-bold">${totalValue.toLocaleString()}</p>
          <ChangeIndicator value={totalChangePercent} />
        </Card>
        <Card>
          <p className="text-gray-400 text-sm mb-1">Прибыль / убыток (24ч)</p>
          <p className={`text-3xl font-bold ${totalChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {totalChange >= 0 ? "+" : ""}${Math.abs(totalChange).toFixed(2)}
          </p>
          <span className="text-gray-500 text-sm">за последние 24 часа</span>
        </Card>
        <Card>
          <p className="text-gray-400 text-sm mb-1">Активы</p>
          <p className="text-3xl font-bold">{portfolioData.length}</p>
          <span className="text-gray-500 text-sm">криптовалют в портфеле</span>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["portfolio", "transactions"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-gray-400 hover:text-gray-200 border border-transparent"
            }`}
          >
            {tab === "portfolio" ? "Портфель" : "Транзакции"}
          </button>
        ))}
      </div>

      {/* Portfolio Table */}
      {activeTab === "portfolio" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-800">
                  <th className="pb-3 font-medium">Актив</th>
                  <th className="pb-3 font-medium">Доля</th>
                  <th className="pb-3 font-medium text-right">Стоимость</th>
                  <th className="pb-3 font-medium text-right">24ч</th>
                </tr>
              </thead>
              <tbody>
                {portfolioData.map((item) => (
                  <tr key={item.symbol} className="border-b border-gray-800/50 last:border-0">
                    <td className="py-4">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-gray-500 text-xs">{item.symbol}</p>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-gray-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${item.allocation}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400">{item.allocation}%</span>
                      </div>
                    </td>
                    <td className="py-4 text-right font-mono">${item.value.toLocaleString()}</td>
                    <td className="py-4 text-right">
                      <ChangeIndicator value={item.change24h} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Transactions placeholder */}
      {activeTab === "transactions" && (
        <Card className="text-center py-12">
          <p className="text-gray-500 text-lg">Транзакции скоро будут доступны</p>
          <p className="text-gray-600 text-sm mt-2">Подключите API биржи для отслеживания</p>
        </Card>
      )}

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-600 text-xs">
        Cripta Dashboard &copy; {new Date().getFullYear()} &mdash; Данные носят информационный характер
      </footer>
    </main>
  );
}
