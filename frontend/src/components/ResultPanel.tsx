'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck,
  ShieldAlert,
  ShieldX,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Hash,
  Fuel,
  ExternalLink,
  Activity,
} from 'lucide-react';
import type { FinalResult, StepEvent } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import RiskMeter from './RiskMeter';
import PortfolioChart from './PortfolioChart';
import PortfolioHoldings from './PortfolioHoldings';
import DataSourceInfo from './DataSourceInfo';

interface ResultPanelProps {
  result: FinalResult | null;
  steps?: StepEvent[];
  onConfirmWeb3?: () => void;
  web3Confirming?: boolean;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ result, steps = [], onConfirmWeb3, web3Confirming = false }) => {
  const { t } = useI18n();

  const marketStep = steps.find(s => s.step === 'market_data' && s.status === 'completed');
  const newsStep = steps.find(s => s.step === 'news_sentiment' && s.status === 'completed');
  const web3Step = steps.find(s => s.step === 'web3_simulation');
  const marketData = marketStep?.data?.data || {};
  const web3Data = web3Step?.data?.data || {};
  const web3Pending = web3Step?.status === 'pending';
  const marketQuality = marketStep?.data?.overall_quality;
  const newsQuality = newsStep?.data?.overall_quality;

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <motion.div
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ repeat: Infinity, duration: 4 }}
        >
          <Activity size={40} className="text-slate-600 mb-4" />
        </motion.div>
        <p className="text-sm text-slate-500">{t.result.waitingTitle}</p>
        <p className="text-xs text-slate-600 mt-1">{t.result.waitingDesc}</p>
      </div>
    );
  }

  const { decision, portfolio, simulation, risk_score, confidence } = result.data;
  const confidencePct = Math.round(confidence * 100);
  const riskScorePct = Math.round(risk_score * 100);

  const getActionConfig = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes('INVEST') || a.includes('BUY')) {
      return {
        icon: TrendingUp,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10 border-emerald-500/30',
        glowColor: 'shadow-emerald-500/20',
        label: a,
      };
    }
    if (a.includes('AVOID') || a.includes('SELL')) {
      return {
        icon: TrendingDown,
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/10 border-rose-500/30',
        glowColor: 'shadow-rose-500/20',
        label: a,
      };
    }
    return {
      icon: Minus,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/30',
      glowColor: 'shadow-amber-500/20',
      label: a,
    };
  };

  const actionConfig = decision ? getActionConfig(decision.action) : null;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto overflow-x-hidden pr-1">
      {/* Data Source Info - Always show when we have step data */}
      {(Object.keys(marketData).length > 0 || Object.keys(web3Data).length > 0) && (
        <DataSourceInfo
          marketData={marketData}
          web3Data={web3Data}
          marketQuality={marketQuality}
          newsQuality={newsQuality}
        />
      )}
      
      <AnimatePresence mode="wait">
        {/* Decision Card */}
        {decision && actionConfig && (
          <motion.div
            key="decision"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className={`glass-card p-5 border ${actionConfig.bgColor}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {t.result.decisionTitle}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <BadgeCheck size={12} />
                {t.result.aiVerified}
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${actionConfig.bgColor} shadow-lg ${actionConfig.glowColor}`}
              >
                <actionConfig.icon size={24} className={actionConfig.color} />
                <span className={`text-xl font-bold ${actionConfig.color}`}>
                  {actionConfig.label}
                </span>
              </div>

              <div className="flex-1">
                <div className="text-xs text-slate-500 mb-1">{t.result.confidence}</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${confidencePct}%` }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                    />
                  </div>
                  <span className="text-sm font-bold text-cyan-400 font-mono">
                    {confidencePct}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Portfolio Allocation */}
        {decision?.allocation && Object.keys(decision.allocation).length > 0 && (
          <motion.div
            key="allocation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="glass-card p-5 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-cyan-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {t.result.portfolioAllocation}
              </span>
            </div>
            <PortfolioChart allocation={decision.allocation} />
          </motion.div>
        )}

        {/* Portfolio Holdings & P&L */}
        {portfolio && portfolio.allocation && Object.keys(portfolio.allocation).length > 0 && (
          <motion.div
            key="holdings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="glass-card p-5 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                持仓盈亏分析
              </span>
            </div>
            <PortfolioHoldings allocation={portfolio.allocation} capital={portfolio.capital || 10000} />
          </motion.div>
        )}

        {/* Risk Meter */}
        <motion.div
          key="risk"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="glass-card p-5 overflow-hidden"
        >
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              {t.result.riskAssessment}
            </span>
          </div>
          <div className="flex justify-center">
            <RiskMeter score={riskScorePct} />
          </div>

          {portfolio && (
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-700/20">
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{t.result.projectedReturn}</div>
                <div className="text-sm font-semibold text-emerald-400 font-mono mt-0.5 truncate">
                  {portfolio.projected_return}
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{t.result.riskLevel}</div>
                <div className="text-sm font-semibold text-amber-400 mt-0.5 truncate">
                  {portfolio.risk_level}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Web3 Simulation */}
        {web3Pending && portfolio && (
          <motion.div
            key="web3-pending"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="glass-card p-4 border-2 border-dashed border-purple-500/30 bg-purple-500/5"
          >
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink size={14} className="text-purple-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Web3 模拟执行
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              AI 已生成投资策略，确认后将执行 Web3 链上模拟交易（基于真实市场价格的模拟操作，不会产生真实交易）。
            </p>
            <button
              onClick={onConfirmWeb3}
              disabled={web3Confirming}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {web3Confirming ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  模拟执行中...
                </>
              ) : (
                <>
                  <ExternalLink size={14} />
                  确认执行 Web3 模拟
                </>
              )}
            </button>
          </motion.div>
        )}

        {simulation && (
          <motion.div
            key="simulation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="glass-card p-5 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-4">
              <ExternalLink size={14} className="text-purple-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                交易执行模拟
              </span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                模拟
              </span>
            </div>

            {/* 总览 */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="glass-card-inner p-2.5 text-center">
                <div className="text-[10px] text-slate-400 mb-1">总Gas费</div>
                <div className="text-xs font-bold text-slate-200 font-mono">{simulation.gas_fee}</div>
              </div>
              <div className="glass-card-inner p-2.5 text-center">
                <div className="text-[10px] text-slate-400 mb-1">交易笔数</div>
                <div className="text-xs font-bold text-slate-200 font-mono">
                  {(web3Step?.data?.data?.transactions || []).length} 笔
                </div>
              </div>
              <div className="glass-card-inner p-2.5 text-center">
                <div className="text-[10px] text-slate-400 mb-1">执行链</div>
                <div className="text-xs font-bold text-cyan-400 font-mono">
                  {(web3Step?.data?.data?.chain || 'ethereum').toUpperCase()}
                </div>
              </div>
            </div>

            {/* 交易明细 */}
            {web3Step?.data?.data?.transactions && web3Step.data.data.transactions.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">交易明细</div>
                <div className="space-y-2">
                  {web3Step.data.data.transactions.map((tx: any, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="glass-card-inner p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                            tx.type === 'swap' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {tx.type === 'swap' ? 'B' : 'S'}
                          </div>
                          <span className="text-xs font-medium text-slate-200">
                            买入 {tx.to_token}
                          </span>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          tx.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {tx.status === 'confirmed' ? '已确认' : '待确认'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400">支付 </span>
                          <span className="text-slate-200 font-mono">${tx.from_amount_usd?.toFixed(2)}</span>
                          <span className="text-slate-400"> USDC</span>
                        </div>
                        <div>
                          <span className="text-slate-400">获得 </span>
                          <span className="text-emerald-400 font-mono">{tx.to_amount_token?.toFixed(6)}</span>
                          <span className="text-slate-400"> {tx.to_token}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">价格 </span>
                          <span className="text-slate-200 font-mono">${tx.price_at_execution?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Gas </span>
                          <span className="text-slate-200 font-mono">${tx.gas_fee_usd}</span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-700/20 flex items-center gap-2 text-[10px] text-slate-500">
                        <Hash size={10} />
                        <span className="font-mono truncate">{tx.tx_hash}</span>
                        <span className="ml-auto">Block #{tx.block_number}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* 持仓结果 */}
            {simulation.new_allocation && Object.keys(simulation.new_allocation).length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">执行后持仓</div>
                <div className="glass-card-inner p-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {Object.entries(simulation.new_allocation).map(([key, val]) => {
                      const price = web3Step?.data?.data?.transactions?.find((t: any) => t.to_token === key)?.price_at_execution;
                      return (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-slate-400">{key}</span>
                          <div className="text-right">
                            <span className="text-slate-200 font-mono">{Number(val).toFixed(6)}</span>
                            {price && <span className="text-slate-500 ml-1">(${(Number(val) * price).toFixed(2)})</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* DeFi 收益机会 */}
            {web3Step?.data?.data?.defi_yield && (
              <div className="glass-card-inner p-3 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5 border border-emerald-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={12} className="text-emerald-400" />
                  <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">DeFi 收益机会</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">协议 </span>
                    <span className="text-slate-200">{web3Step.data.data.defi_yield.protocol}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">APY </span>
                    <span className="text-emerald-400 font-mono font-bold">{web3Step.data.data.defi_yield.apy}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">存入价值 </span>
                    <span className="text-slate-200 font-mono">${web3Step.data.data.defi_yield.total_deposit_value}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">年化预期 </span>
                    <span className="text-emerald-400 font-mono">${web3Step.data.data.defi_yield.projected_annual_return}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 免责声明 */}
            <div className="mt-3 text-[10px] text-slate-500 leading-relaxed">
              {web3Step?.data?.data?.warning || '模拟交易基于实时市场价格，不涉及真实区块链交互。'}
            </div>
          </motion.div>
        )}

        {/* Reasoning */}
        {decision?.reasoning && decision.reasoning.length > 0 && (
          <motion.div
            key="reasoning"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="glass-card p-5 overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText size={14} className="text-blue-400" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {t.result.aiReasoning}
              </span>
            </div>

            <div className="space-y-3">
              {decision.reasoning.map((reason, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="flex gap-3 text-sm"
                >
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-xs font-bold text-blue-400">
                    {i + 1}
                  </div>
                  <p className="text-slate-300 leading-relaxed">{reason}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResultPanel;
