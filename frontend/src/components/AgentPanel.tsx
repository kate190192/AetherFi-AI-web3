'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Search,
  Newspaper,
  PieChart,
  Cpu,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Target,
  Wallet,
  Fuel,
  Hash,
  Clock,
  Tag,
} from 'lucide-react';
import type { StepEvent } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface AgentPanelProps {
  steps: StepEvent[];
  isRunning: boolean;
}

const STEP_ICONS: Record<string, React.ElementType> = {
  parse_intent: Brain,
  market_data: Search,
  news_sentiment: Newspaper,
  portfolio_simulation: PieChart,
  llm_reasoning: Cpu,
  web3_simulation: Globe,
};

const AgentPanel: React.FC<AgentPanelProps> = ({ steps, isRunning }) => {
  const { t } = useI18n();
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const STEP_LABELS: Record<string, string> = {
    parse_intent: t.agent.stepParseIntent,
    market_data: t.agent.stepMarketData,
    news_sentiment: t.agent.stepNewsSentiment,
    portfolio_simulation: t.agent.stepPortfolioSim,
    llm_reasoning: t.agent.stepAIReasoning,
    web3_simulation: t.agent.stepWeb3Sim,
  };

  const STEP_DESCRIPTIONS: Record<string, string> = {
    parse_intent: t.agent.descParseIntent,
    market_data: t.agent.descMarketData,
    news_sentiment: t.agent.descNewsSentiment,
    portfolio_simulation: t.agent.descPortfolioSim,
    llm_reasoning: t.agent.descAIReasoning,
    web3_simulation: t.agent.descWeb3Sim,
  };

  const toggleExpand = (stepName: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepName)) {
        next.delete(stepName);
      } else {
        next.add(stepName);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 size={16} className="text-cyan-400 animate-spin" />;
      case 'completed':
        return <CheckCircle2 size={16} className="text-emerald-400" />;
      case 'error':
        return <AlertCircle size={16} className="text-rose-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'border-cyan-500/40 bg-cyan-500/5';
      case 'completed':
        return 'border-emerald-500/30 bg-emerald-500/5';
      case 'error':
        return 'border-rose-500/30 bg-rose-500/5';
      default:
        return 'border-divider bg-card-inner';
    }
  };

  const summarizeData = (step: string, data: Record<string, any>): string => {
    if (!data || Object.keys(data).length === 0) return '';
    switch (step) {
      case 'parse_intent':
        if (data.symbols && data.symbols.length > 0) {
          return `Assets: ${data.symbols.join(', ')} | Type: ${data.query_type || 'general'}`;
        }
        return data.message || '';
      case 'market_data':
        if (data.symbols) {
          const marketData = data.data || {};
          const isReal = Object.values(marketData).some((v: any) => v?.is_real_data);
          const sourceLabel = isReal ? '✓ CoinGecko Live' : '⚡ Simulated';
          return `${data.symbols.length} assets (${sourceLabel})`;
        }
        return data.message || '';
      case 'news_sentiment':
        if (data.symbols) return `${data.symbols.length} assets analyzed`;
        return data.message || '';
      case 'portfolio_simulation':
        if (data.data && data.data.expected_return) return `Projected: ${data.data.expected_return}`;
        return data.message || '';
      case 'llm_reasoning':
        if (data.action) return `Action: ${data.action} | Confidence: ${Math.round((data.confidence || 0) * 100)}%`;
        return data.message || '';
      case 'web3_simulation':
        if (data.data && data.data.total_gas) {
          const warning = data.data.is_real_transaction === false ? '(Virtual)' : '';
          return `Gas: ${data.data.total_gas} ${warning}`;
        }
        return data.message || '';
      default:
        return data.message || '';
    }
  };

  const renderStepDetail = (step: string, data: Record<string, any>) => {
    if (!data || Object.keys(data).length === 0) return null;

    switch (step) {
      case 'parse_intent':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Tag size={12} className="t-muted" />
              <span className="t-label">Query Type:</span>
              <span className="t-primary font-medium">{data.query_type || 'general'}</span>
            </div>
            {data.symbols && data.symbols.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <Target size={12} className="t-muted" />
                <span className="t-label">Target Assets:</span>
                <div className="flex flex-wrap gap-1">
                  {data.symbols.map((s: string) => (
                    <span key={s} className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.capital_from_query && (
              <div className="flex items-center gap-2 text-xs">
                <DollarSign size={12} className="t-muted" />
                <span className="t-label">Detected Capital:</span>
                <span className="t-primary font-medium font-mono">${data.capital_from_query}</span>
              </div>
            )}
          </div>
        );

      case 'market_data': {
        const marketData = data.data || {};
        return (
          <div className="space-y-3">
            {Object.entries(marketData).map(([symbol, info]: [string, any]) => (
              <div key={symbol} className="glass-card-inner p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium t-primary">{symbol}</span>
                  <div className="flex items-center gap-1">
                    {info.is_real_data ? (
                      <CheckCircle2 size={10} className="text-emerald-400" />
                    ) : (
                      <AlertCircle size={10} className="text-amber-400" />
                    )}
                    <span className="text-[10px] t-muted">
                      {info.is_real_data ? 'Live' : 'Sim'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="t-muted">Price</span>
                    <div className="t-primary font-mono">${info.price?.toLocaleString() || '-'}</div>
                  </div>
                  <div>
                    <span className="t-muted">24h Change</span>
                    <div className={`font-mono flex items-center gap-1 ${
                      info.change_24h !== undefined && info.change_24h >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}>
                      {info.change_24h !== undefined ? (
                        <>
                          {info.change_24h >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {Math.abs(info.change_24h).toFixed(2)}%
                        </>
                      ) : '-'}
                    </div>
                  </div>
                  <div>
                    <span className="t-muted">Volume</span>
                    <div className="t-primary">{info.volume || '-'}</div>
                  </div>
                  <div>
                    <span className="t-muted">Trend</span>
                    <div className={`${
                      info.trend === 'bullish' ? 'text-emerald-400' :
                      info.trend === 'bearish' ? 'text-rose-400' :
                      info.trend === 'volatile' ? 'text-amber-400' : 't-label'
                    }`}>
                      {info.trend || '-'}
                    </div>
                  </div>
                </div>
                {info.source && (
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] t-faint">
                    <Clock size={8} />
                    {info.last_updated}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }

      case 'news_sentiment': {
        const newsData = data.data || {};
        return (
          <div className="space-y-3">
            {Object.entries(newsData).map(([symbol, info]: [string, any]) => (
              <div key={symbol} className="glass-card-inner p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium t-primary">{symbol}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    info.sentiment === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' :
                    info.sentiment === 'bearish' ? 'bg-rose-500/20 text-rose-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {info.sentiment || 'neutral'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <TrendingUp size={10} className="text-emerald-400" />
                    <span className="t-muted">Bullish:</span>
                    <span className="text-emerald-400 font-mono">{info.bullish_signals || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingDown size={10} className="text-rose-400" />
                    <span className="t-muted">Bearish:</span>
                    <span className="text-rose-400 font-mono">{info.bearish_signals || 0}</span>
                  </div>
                </div>
                {info.headlines && info.headlines.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-divider">
                    <div className="text-[10px] t-muted mb-1">Latest Headlines:</div>
                    {info.headlines.slice(0, 3).map((h: string, i: number) => (
                      <div key={i} className="text-[10px] t-label line-clamp-1">{h}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }

      case 'portfolio_simulation': {
        const portfolio = data.data || {};
        const allocation = portfolio.allocation || {};
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="glass-card-inner p-2">
                <span className="t-muted">Expected Return</span>
                <div className="text-emerald-400 font-mono text-sm">{portfolio.expected_return || '-'}</div>
              </div>
              <div className="glass-card-inner p-2">
                <span className="t-muted">Risk Level</span>
                <div className={`${
                  portfolio.risk_level === 'low' ? 'text-emerald-400' :
                  portfolio.risk_level === 'high' ? 'text-rose-400' : 'text-amber-400'
                } text-sm`}>
                  {portfolio.risk_level || '-'}
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs t-muted mb-2">Allocation</div>
              <div className="space-y-1.5">
                {Object.entries(allocation).map(([asset, details]: [string, any]) => (
                  <div key={asset} className="flex items-center gap-2">
                    <span className="text-xs t-secondary w-8">{asset}</span>
                    <div className="flex-1 h-2 rounded-full bg-card-inner overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${details.percentage || 0}%` }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className={`h-full rounded-full ${
                          asset === 'USDC' ? 'bg-slate-400' :
                          asset === 'BTC' ? 'bg-orange-400' :
                          asset === 'ETH' ? 'bg-blue-400' : 'bg-purple-400'
                        }`}
                      />
                    </div>
                    <span className="text-xs t-label w-16 text-right">{details.percentage || 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      case 'llm_reasoning':
        return (
          <div className="space-y-3">
            {data.action && (
              <div className="flex items-center gap-2">
                <span className="text-xs t-muted">Decision:</span>
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  data.action === 'invest' ? 'bg-emerald-500/20 text-emerald-400' :
                  data.action === 'avoid' ? 'bg-rose-500/20 text-rose-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {data.action}
                </span>
              </div>
            )}
            {data.confidence !== undefined && (
              <div className="flex items-center gap-2">
                <span className="text-xs t-muted">Confidence:</span>
                <div className="flex-1 h-1.5 rounded-full bg-card-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.confidence * 100}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500"
                  />
                </div>
                <span className="text-xs text-cyan-400 font-mono w-12 text-right">
                  {Math.round(data.confidence * 100)}%
                </span>
              </div>
            )}
          </div>
        );

      case 'web3_simulation': {
        const web3 = data.data || {};
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs">
              <Wallet size={12} className="t-muted" />
              <span className="t-label">Wallet:</span>
              <span className="t-primary font-mono">{web3.wallet_address || '-'}</span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Fuel size={12} className="t-muted" />
              <span className="t-label">Total Gas:</span>
              <span className="text-amber-400 font-mono">{web3.total_gas || '-'}</span>
            </div>

            {web3.price_basis && (
              <div className="flex items-center gap-2 text-xs">
                <TrendingUp size={12} className="text-emerald-400" />
                <span className="text-emerald-400">Price Basis: {web3.price_basis}</span>
              </div>
            )}

            {web3.transactions && web3.transactions.length > 0 && (
              <div>
                <div className="text-xs t-muted mb-2">Simulated Transactions:</div>
                <div className="space-y-1.5">
                  {web3.transactions.map((tx: any, i: number) => (
                    <div key={i} className="glass-card-inner p-2 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-cyan-400">{tx.type}</span>
                        <span className="text-emerald-400">{tx.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="t-muted">{tx.from_token}</span>
                        <span className="t-faint">→</span>
                        <span className="t-primary">{tx.to_token}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="t-label">${tx.from_amount_usd}</span>
                        <span className="t-label">≈ {tx.to_amount_token} {tx.to_token}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Hash size={8} className="t-muted" />
                        <span className="text-[10px] t-muted font-mono">{tx.tx_hash}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {web3.defi_yield && (
              <div className="glass-card-inner p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium t-primary">DeFi Yield</span>
                  <span className="text-xs text-emerald-400">{web3.defi_yield.apy}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="t-muted">Protocol:</span>
                  <span className="t-secondary">{web3.defi_yield.protocol}</span>
                </div>
                <div className="flex items-center gap-4 text-xs mt-1">
                  <span className="t-muted">Projected Annual:</span>
                  <span className="text-emerald-400 font-mono">${web3.defi_yield.projected_annual_return}</span>
                </div>
              </div>
            )}

            {web3.new_wallet_state && (
              <div>
                <div className="text-xs t-muted mb-2">Wallet State:</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(web3.new_wallet_state).map(([token, amount]: [string, any]) => (
                    <div key={token} className="glass-card-inner p-2 text-xs">
                      <span className="t-label">{token}</span>
                      <div className="t-primary font-mono">{amount}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return (
          <pre className="text-xs t-label font-mono whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="glass-card p-4 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={18} className="text-cyan-400" />
          <h2 className="text-sm font-semibold t-primary">{t.agent.pipelineTitle}</h2>
        </div>
        <p className="text-xs t-muted">
          {isRunning
            ? t.agent.processing
            : steps.length > 0
            ? t.agent.complete
            : t.agent.waiting}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-0">
        {steps.length === 0 && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              <Cpu size={40} className="t-faint mb-4" />
            </motion.div>
            <p className="text-sm t-muted">{t.agent.waitingTitle}</p>
            <p className="text-xs t-faint mt-1">{t.agent.waitingDesc}</p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[step.step] || Cpu;
            const isExpanded = expandedSteps.has(step.step);
            const isLast = index === steps.length - 1;
            const summary = summarizeData(step.step, step.data);
            const hasData = step.data && Object.keys(step.data).length > 0;

            return (
              <React.Fragment key={`${step.step}-${index}`}>
                {index > 0 && (
                  <div className="flex justify-center py-0">
                    <div
                      className={`w-0.5 h-5 rounded-full ${
                        step.status === 'running'
                          ? 'step-line-animated'
                          : step.status === 'completed'
                          ? 'bg-emerald-500/30'
                          : 'bg-card-inner'
                      }`}
                    />
                  </div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`rounded-xl border p-3 transition-all duration-300 ${getStatusColor(step.status)}`}
                >
                  <div
                    className="flex items-center gap-2.5 cursor-pointer"
                    onClick={() => hasData && toggleExpand(step.step)}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        step.status === 'running'
                          ? 'bg-cyan-500/15 animate-pulse-glow'
                          : step.status === 'completed'
                          ? 'bg-emerald-500/10'
                          : step.status === 'error'
                          ? 'bg-rose-500/10'
                          : 'bg-card-inner'
                      }`}
                    >
                      <Icon
                        size={16}
                        className={
                          step.status === 'running'
                            ? 'text-cyan-400'
                            : step.status === 'completed'
                            ? 'text-emerald-400'
                            : step.status === 'error'
                            ? 'text-rose-400'
                            : 't-muted'
                        }
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium t-primary">{STEP_LABELS[step.step] || step.step}</span>
                        {getStatusIcon(step.status)}
                      </div>
                      {step.status === 'running' && (
                        <p className="text-xs t-muted mt-0.5">
                          {STEP_DESCRIPTIONS[step.step] || 'Processing...'}
                        </p>
                      )}
                      {step.status === 'completed' && summary && (
                        <p className="text-xs text-emerald-400/70 mt-0.5 truncate">{summary}</p>
                      )}
                    </div>

                    {hasData && (
                      <div className="shrink-0 t-muted">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {isExpanded && hasData && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-divider">
                          {renderStepDetail(step.step, step.data)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </React.Fragment>
            );
          })}
        </AnimatePresence>

        {isRunning && steps.length > 0 && steps[steps.length - 1].status === 'running' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 py-3 px-2"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                />
              ))}
            </div>
            <span className="text-xs text-cyan-400/60">{t.agent.processingNext}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AgentPanel;
