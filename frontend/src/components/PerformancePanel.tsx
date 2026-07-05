'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  RefreshCw,
  Loader2,
  DollarSign,
  Activity,
} from 'lucide-react';
import { getBacktestPerformance } from '@/lib/api';

interface PerformanceData {
  total_recommendations: number;
  tracked: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  avg_return: number;
  current_prices: Record<string, number>;
  recommendations: Array<{
    id: string;
    query: string;
    action: string;
    capital: number;
    total_pnl: number;
    pnl_percent: number;
    holding_days: number;
    status: 'win' | 'loss' | 'breakeven';
    details: Array<{
      symbol: string;
      entry_price: number;
      current_price: number;
      pnl_amount: number;
      pnl_percent: number;
      token_quantity: number;
    }>;
    created_at: string;
  }>;
}

const PerformancePanel: React.FC = () => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getBacktestPerformance();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Loader2 size={32} className="text-cyan-400 animate-spin" />
        <p className="text-xs text-slate-400 mt-3">加载表现数据...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <p className="text-sm text-rose-400 mb-3">{error}</p>
        <button onClick={fetchData} className="text-xs text-cyan-400 hover:text-cyan-300">
          重试
        </button>
      </div>
    );
  }

  if (!data || data.total_recommendations === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <BarChart3 size={40} className="text-slate-500 mb-4" />
        <p className="text-sm text-slate-400 text-center">
          还没有推荐记录<br />
          <span className="text-xs text-slate-500">运行一次 Agent 分析后开始追踪</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4">
      {/* 总览卡片 */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card-inner p-3"
        >
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
            <Target size={10} />
            胜率
          </div>
          <div className={`text-xl font-bold font-mono ${data.win_rate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {data.win_rate}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {data.wins}胜 / {data.losses}负
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card-inner p-3"
        >
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
            <DollarSign size={10} />
            总盈亏
          </div>
          <div className={`text-xl font-bold font-mono ${data.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {data.total_pnl >= 0 ? '+' : ''}${data.total_pnl.toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            平均 {data.avg_return >= 0 ? '+' : ''}{data.avg_return.toFixed(2)}%
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card-inner p-3"
        >
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
            <Activity size={10} />
            总推荐
          </div>
          <div className="text-xl font-bold font-mono text-slate-200">
            {data.total_recommendations}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            已追踪 {data.tracked} 笔
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card-inner p-3"
        >
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
            <RefreshCw size={10} />
            当前价格
          </div>
          <div className="space-y-0.5">
            {Object.entries(data.current_prices).slice(0, 3).map(([sym, price]) => (
              <div key={sym} className="flex justify-between text-[10px]">
                <span className="text-slate-400">{sym}</span>
                <span className="text-slate-200 font-mono">${price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* 推荐历史明细 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">推荐历史</span>
          <button
            onClick={fetchData}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <RefreshCw size={10} />
            刷新
          </button>
        </div>
        <div className="space-y-2">
          {data.recommendations.map((rec, i) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="glass-card-inner overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                className="w-full p-3 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                      rec.status === 'win' ? 'bg-emerald-500/10 text-emerald-400' :
                      rec.status === 'loss' ? 'bg-rose-500/10 text-rose-400' :
                      'bg-slate-500/10 text-slate-400'
                    }`}>
                      {rec.action.toUpperCase().includes('INVEST') || rec.action.toUpperCase().includes('BUY') ? 'B' :
                       rec.action.toUpperCase().includes('SELL') || rec.action.toUpperCase().includes('AVOID') ? 'S' : 'H'}
                    </div>
                    <div>
                      <div className="text-xs text-slate-200 truncate max-w-[150px]">{rec.query}</div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(rec.created_at).toLocaleDateString()} · {rec.holding_days}天
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold font-mono ${
                      rec.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {rec.total_pnl >= 0 ? '+' : ''}{rec.pnl_percent.toFixed(2)}%
                    </div>
                    <div className={`text-[10px] font-mono ${
                      rec.total_pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {rec.total_pnl >= 0 ? '+' : ''}${rec.total_pnl.toFixed(2)}
                    </div>
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {expandedId === rec.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-700/20"
                  >
                    <div className="p-3 space-y-2">
                      {rec.details.map((d) => (
                        <div key={d.symbol} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">{d.symbol}</span>
                            <span className="text-slate-500">
                              ${d.entry_price.toLocaleString()} → ${d.current_price.toLocaleString()}
                            </span>
                          </div>
                          <div className={`font-mono font-medium ${
                            d.pnl_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {d.pnl_percent >= 0 ? '+' : ''}{d.pnl_percent.toFixed(2)}%
                            <span className="text-[10px] ml-1">
                              ({d.pnl_amount >= 0 ? '+' : ''}${d.pnl_amount.toFixed(2)})
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-slate-700/20 text-[10px] text-slate-500">
                        投入 ${rec.capital.toLocaleString()} · 持有 {rec.holding_days} 天
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PerformancePanel;
