'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  BarChart3,
} from 'lucide-react';

interface HoldingItem {
  symbol: string;
  percentage: number;
  amount: number;
  currentPrice?: number;
  change24h?: number;
  expectedReturn?: string;
}

interface PortfolioHoldingsProps {
  allocation: Record<string, { percentage: number; amount: number; current_price?: number; change_24h?: number; expected_annual_return?: string }>;
  capital: number;
}

const PortfolioHoldings: React.FC<PortfolioHoldingsProps> = ({ allocation, capital }) => {
  if (!allocation || Object.keys(allocation).length === 0) return null;

  const holdings: HoldingItem[] = Object.entries(allocation).map(([symbol, data]) => ({
    symbol,
    percentage: data.percentage || 0,
    amount: data.amount || 0,
    currentPrice: data.current_price,
    change24h: data.change_24h,
    expectedReturn: data.expected_annual_return,
  }));

  const totalInvested = holdings.reduce((sum, h) => sum + h.amount, 0);

  // 模拟买入后基于 24h 变化的盈亏
  const holdingsWithPnl = holdings.map(h => {
    const change = h.change24h || 0;
    // 模拟：假设当前价格已经是买入价，24h 变化代表短期波动
    const pnlPercent = change;
    const pnlAmount = h.amount * (pnlPercent / 100);
    return { ...h, pnlPercent, pnlAmount };
  });

  const totalPnl = holdingsWithPnl.reduce((sum, h) => sum + h.pnlAmount, 0);
  const totalValue = totalInvested + totalPnl;
  const totalPnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* 总览卡片 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card-inner p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Wallet size={12} />
            投入资金
          </div>
          <div className="text-sm font-bold text-slate-200 font-mono">
            ${totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="glass-card-inner p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <BarChart3 size={12} />
            当前市值
          </div>
          <div className="text-sm font-bold text-slate-200 font-mono">
            ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="glass-card-inner p-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <DollarSign size={12} />
            模拟盈亏
          </div>
          <div className={`text-sm font-bold font-mono ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
            <span className="text-xs ml-1">
              ({totalPnlPercent >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* 持仓明细 */}
      <div className="overflow-hidden rounded-lg border border-slate-700/30">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-800/50 text-slate-400">
              <th className="text-left px-3 py-2 font-medium">资产</th>
              <th className="text-right px-3 py-2 font-medium">配置</th>
              <th className="text-right px-3 py-2 font-medium">金额</th>
              <th className="text-right px-3 py-2 font-medium">24h涨跌</th>
              <th className="text-right px-3 py-2 font-medium">模拟盈亏</th>
            </tr>
          </thead>
          <tbody>
            {holdingsWithPnl.map((h, i) => (
              <motion.tr
                key={h.symbol}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border-t border-slate-700/20 hover:bg-slate-800/30"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                      {h.symbol.slice(0, 2)}
                    </div>
                    <span className="text-slate-200 font-medium">{h.symbol}</span>
                  </div>
                </td>
                <td className="text-right px-3 py-2.5 text-slate-300 font-mono">
                  {h.percentage.toFixed(1)}%
                </td>
                <td className="text-right px-3 py-2.5 text-slate-200 font-mono">
                  ${h.amount.toFixed(2)}
                </td>
                <td className="text-right px-3 py-2.5">
                  <span className={`font-mono ${(h.change24h || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(h.change24h || 0) >= 0 ? '+' : ''}{(h.change24h || 0).toFixed(2)}%
                  </span>
                </td>
                <td className="text-right px-3 py-2.5">
                  <div className={`font-mono font-medium ${h.pnlAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {h.pnlAmount >= 0 ? '+' : ''}${h.pnlAmount.toFixed(2)}
                  </div>
                  <div className={`text-[10px] font-mono ${h.pnlPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {h.pnlPercent >= 0 ? '+' : ''}{h.pnlPercent.toFixed(2)}%
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 年化预期 */}
      <div className="glass-card-inner p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">加权平均年化预期</span>
          <span className="text-xs font-bold text-emerald-400 font-mono">
            {(() => {
              let weightedReturn = 0;
              holdings.forEach(h => {
                const rate = parseFloat(h.expectedReturn || '5') / 100;
                weightedReturn += (h.percentage / 100) * rate;
              });
              return (weightedReturn * 100).toFixed(1);
            })()}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default PortfolioHoldings;
