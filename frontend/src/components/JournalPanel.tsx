'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  User,
  Target,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Lightbulb,
  BarChart3,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { API_BASE } from '@/lib/api';

interface JournalEntry {
  entry_id: string;
  timestamp: string;
  user_id: string;
  query: string;
  risk_profile: string;
  capital: number;
  market_snapshot: Record<string, any>;
  ai_reasoning: string;
  strategy_suggestion: Record<string, any>;
  user_decision: Record<string, any> | null;
  user_action: string;
  actual_outcome: Record<string, any> | null;
  reflection: string | null;
  iteration_notes: string[];
  status: 'created' | 'user_responded' | 'reviewed';
  accuracy_score?: number;
  updated_at?: string;
}

const JournalPanel: React.FC = () => {
  const { t } = useI18n();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const fetchEntries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/journal/entries?date=${selectedDate}&limit=30`);
      if (!res.ok) throw new Error('Failed to fetch journal entries');
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch journal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [selectedDate]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'created':
        return { label: t.journal.statusPending, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock };
      case 'user_responded':
        return { label: t.journal.statusResponded, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: CheckCircle };
      case 'reviewed':
        return { label: t.journal.statusReviewed, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Sparkles };
      default:
        return { label: status, color: 't-label', bg: 'bg-slate-500/10 border-slate-500/20', icon: AlertCircle };
    }
  };

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (val: number) => {
    if (!val) return '$0';
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
  };

  const getMarketSummary = (snapshot: Record<string, any>) => {
    if (!snapshot || !snapshot.coins) return null;
    const coins = snapshot.coins;
    const btc = coins.BTC;
    const eth = coins.ETH;
    if (!btc && !eth) return null;
    
    const btcChange = btc?.price_change_24h ?? 0;
    const ethChange = eth?.price_change_24h ?? 0;
    const avg = (btcChange + ethChange) / 2;
    
    return {
      btcPrice: btc?.price,
      btcChange,
      ethPrice: eth?.price,
      ethChange,
      trend: avg > 3 ? 'bullish' : avg < -3 ? 'bearish' : 'neutral',
    };
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return <TrendingUp size={14} className="text-emerald-400" />;
      case 'bearish':
        return <TrendingDown size={14} className="text-rose-400" />;
      default:
        return <Minus size={14} className="t-label" />;
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return t.journal.trendBullish;
      case 'bearish':
        return t.journal.trendBearish;
      default:
        return t.journal.trendNeutral;
    }
  };

  const renderStrategySummary = (strategy: Record<string, any>) => {
    if (!strategy) return null;
    const portfolio = strategy.portfolio || strategy.allocation;
    if (Array.isArray(portfolio)) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {portfolio.slice(0, 4).map((item: any, i: number) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
            >
              {item.symbol || item.token}
              <span className="text-cyan-400/70">
                {item.percentage != null ? `${item.percentage}%` : item.weight != null ? `${item.weight}%` : ''}
              </span>
            </span>
          ))}
        </div>
      );
    }
    return <span className="text-xs t-muted">策略已生成</span>;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-divider">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-cyan-400" />
          <h3 className="text-sm font-medium t-primary">{t.journal.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="t-muted" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs t-label outline-none cursor-pointer hover:t-primary"
            />
          </div>
          <button
            onClick={fetchEntries}
            className="p-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--bg-btn-hover)' }}
          >
            <RefreshCw size={14} className="t-muted" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <BookOpen size={32} className="t-faint" />
              </motion.div>
              <p className="text-xs t-muted mt-3">{t.journal.loading}</p>
            </div>
          ) : error ? (
            <div className="glass-card p-4 text-center">
              <AlertCircle size={24} className="text-rose-400 mx-auto mb-2" />
              <p className="text-sm t-label">{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <BookOpen size={32} className="t-faint mb-2" />
              <p className="text-xs t-muted">{t.journal.noEntries}</p>
              <p className="text-[10px] t-faint mt-1">每次Agent运行后会自动生成交易日记</p>
            </div>
          ) : (
            <>
              <div className="text-[10px] t-muted bg-card-inner rounded-lg p-2.5 mb-2">
                <span className="text-amber-400">待回应</span> = 系统已记录推荐，等待用户确认是否采纳
                <span className="text-blue-400 ml-2">已回应</span> = 用户已确认操作
                <span className="text-emerald-400 ml-2">已复盘</span> = 已完成回顾分析
              </div>
              {entries.map((entry, index) => {
              const statusConfig = getStatusConfig(entry.status);
              const StatusIcon = statusConfig.icon;
              const isExpanded = expandedId === entry.entry_id;
              const marketSummary = getMarketSummary(entry.market_snapshot);

              return (
                <motion.div
                  key={entry.entry_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  layout
                  transition={{ delay: index * 0.05 }}
                  className={`glass-card overflow-hidden border ${statusConfig.bg}`}
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : entry.entry_id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-6 h-6 rounded-md ${statusConfig.bg} flex items-center justify-center ${statusConfig.color}`}>
                            <StatusIcon size={12} />
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.bg.split(' ')[1]}`}>
                            {statusConfig.label}
                          </span>
                          {entry.accuracy_score != null && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              准确率 {entry.accuracy_score.toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <p className="text-sm t-primary line-clamp-2 leading-snug">
                          {entry.query}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] t-muted">
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {formatDateTime(entry.timestamp)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target size={10} />
                            ${entry.capital.toLocaleString()}
                          </span>
                          {marketSummary && (
                            <span className="flex items-center gap-1">
                              {getTrendIcon(marketSummary.trend)}
                              {getTrendLabel(marketSummary.trend)}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={16} className="t-label shrink-0 mt-1" />
                      ) : (
                        <ChevronDown size={16} className="t-label shrink-0 mt-1" />
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-4 pb-4 space-y-3">
                          {marketSummary && (
                            <div className="glass-card-inner p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <BarChart3 size={12} className="t-label" />
                                <span className="text-[11px] font-medium t-label">{t.journal.marketSnapshot}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-card-inner">
                                   <span className="text-[10px] t-muted">BTC</span>
                                   <div className="text-right">
                                     <div className="text-[11px] t-secondary font-mono">
                                       {marketSummary.btcPrice ? `$${marketSummary.btcPrice.toLocaleString()}` : '-'}
                                     </div>
                                    <div className={`text-[10px] ${marketSummary.btcChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {marketSummary.btcChange >= 0 ? '+' : ''}{marketSummary.btcChange?.toFixed(2)}%
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between px-2 py-1.5 rounded bg-card-inner">
                                   <span className="text-[10px] t-muted">ETH</span>
                                   <div className="text-right">
                                     <div className="text-[11px] t-secondary font-mono">
                                       {marketSummary.ethPrice ? `$${marketSummary.ethPrice.toLocaleString()}` : '-'}
                                     </div>
                                    <div className={`text-[10px] ${marketSummary.ethChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {marketSummary.ethChange >= 0 ? '+' : ''}{marketSummary.ethChange?.toFixed(2)}%
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {entry.ai_reasoning && (
                            <div className="glass-card-inner p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Brain size={12} className="text-purple-400" />
                                <span className="text-[11px] font-medium t-label">{t.journal.aiReasoning}</span>
                              </div>
                              <p className="text-xs t-secondary leading-relaxed whitespace-pre-wrap">
                                {entry.ai_reasoning}
                              </p>
                            </div>
                          )}

                          <div className="glass-card-inner p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <Lightbulb size={12} className="text-amber-400" />
                              <span className="text-[11px] font-medium t-label">{t.journal.strategyAdvice}</span>
                            </div>
                            {renderStrategySummary(entry.strategy_suggestion)}
                            {entry.strategy_suggestion?.expected_return && (
                              <p className="text-xs t-muted mt-2">
                                预期收益: <span className="text-emerald-400">{entry.strategy_suggestion.expected_return}</span>
                              </p>
                            )}
                          </div>

                          {entry.user_decision && entry.status !== 'created' && (
                            <div className="glass-card-inner p-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <User size={12} className="text-blue-400" />
                              <span className="text-[11px] font-medium t-label">{t.journal.userDecision}</span>
                            </div>
                            <p className="text-xs t-secondary">
                                {entry.user_action === 'accepted' ? t.journal.adopt :
                                 entry.user_action === 'modified' ? t.journal.modify :
                                 entry.user_action === 'rejected' ? t.journal.reject : entry.user_action}
                              </p>
                              {entry.user_decision.notes && (
                                <p className="text-xs t-label mt-1">{entry.user_decision.notes}</p>
                              )}
                            </div>
                          )}

                          {entry.reflection && (
                            <div className="glass-card-inner p-3 border-l-2 border-l-emerald-500/50">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Sparkles size={12} className="text-emerald-400" />
                              <span className="text-[11px] font-medium t-label">{t.journal.reflection}</span>
                            </div>
                            <p className="text-xs t-secondary leading-relaxed whitespace-pre-wrap">
                                {entry.reflection}
                              </p>
                              {entry.iteration_notes && entry.iteration_notes.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-divider">
                                  <p className="text-[10px] t-muted mb-1">迭代改进:</p>
                                  <ul className="space-y-0.5">
                                    {entry.iteration_notes.map((note, i) => (
                                      <li key={i} className="text-[11px] t-label flex items-start gap-1.5">
                                        <span className="text-emerald-400 mt-0.5">•</span>
                                        {note}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default JournalPanel;
