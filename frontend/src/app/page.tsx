'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hexagon,
  Settings,
  Languages,
  Send,
  Wallet,
  BarChart3,
  Zap,
  Shield,
  Target,
} from 'lucide-react';
import AgentPanel from '@/components/AgentPanel';
import ResultPanel from '@/components/ResultPanel';
import SettingsPanel from '@/components/SettingsPanel';
import TabSwitcher, { TabType } from '@/components/TabSwitcher';
import ReviewPanel from '@/components/ReviewPanel';
import MarketLivePanel from '@/components/MarketLivePanel';
import JournalPanel from '@/components/JournalPanel';
import PerformancePanel from '@/components/PerformancePanel';
import MarketTickerBar from '@/components/MarketTickerBar';
import ActionSuggestions from '@/components/ActionSuggestions';
import { streamAgentRun, StepEvent, FinalResult, confirmWeb3Simulation, API_BASE } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

type RiskProfile = 'conservative' | 'neutral' | 'aggressive';

export default function Home() {
  const { t, lang, toggleLang } = useI18n();
  const [query, setQuery] = useState('');
  const [capital, setCapital] = useState(1000);
  const [riskProfile, setRiskProfile] = useState<RiskProfile>('neutral');
  const [steps, setSteps] = useState<StepEvent[]>([]);
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('results');
  const [web3Confirming, setWeb3Confirming] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!query.trim() || isRunning) return;

    setIsRunning(true);
    setSteps([]);
    setFinalResult(null);

    if (history[history.length - 1] !== query.trim()) {
      setHistory((prev) => [...prev, query.trim()]);
    }

    try {
      const gen = streamAgentRun({
        query: query.trim(),
        capital,
        user_id: 'user_default',
        risk_profile: riskProfile,
        skip_web3: true,
      });

      for await (const event of gen) {
        if (event.type === 'step_update') {
          setSteps((prev) => {
            const existing = prev.findIndex((s) => s.step === event.step);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = event;
              return updated;
            }
            return [...prev, event];
          });
        } else if (event.type === 'final_result') {
          setFinalResult(event);
        }
      }
    } catch (err) {
      console.error('Agent run failed:', err);
      setSteps((prev) => [
        ...prev,
        {
          type: 'step_update',
          step: 'Error',
          status: 'error',
          data: { message: err instanceof Error ? err.message : 'Unknown error occurred' },
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  }, [query, capital, riskProfile, isRunning, history]);

  const handleQuickAction = (q: string) => {
    setQuery(q);
  };

  const handleConfirmWeb3 = async () => {
    if (!finalResult || web3Confirming) return;
    
    setWeb3Confirming(true);
    
    try {
      const portfolio = finalResult.data.portfolio;
      const walletState = portfolio?.wallet_state || {};
      
      const result = await confirmWeb3Simulation(walletState, capital);
      
      if (result.success && result.data) {
        const web3Step: StepEvent = {
          type: 'step_update',
          step: 'web3_simulation',
          status: 'completed',
          data: {
            message: 'Web3 链上模拟完成',
            data: result.data,
          },
        };
        
        setSteps(prev => {
          const existing = prev.findIndex(s => s.step === 'web3_simulation');
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = web3Step;
            return updated;
          }
          return [...prev, web3Step];
        });

        if (finalResult) {
          setFinalResult({
            ...finalResult,
            data: {
              ...finalResult.data,
              simulation: {
                simulation: result.data.simulation || '',
                gas_fee: result.data.total_gas || '',
                new_allocation: result.data.new_wallet_state || {},
                tx_hash: result.data.wallet_address || '',
              },
            },
          });
        }
      }
    } catch (err) {
      console.error('Web3 simulation failed:', err);
      const web3Step: StepEvent = {
        type: 'step_update',
        step: 'web3_simulation',
        status: 'error',
        data: { message: err instanceof Error ? err.message : 'Web3 模拟失败' },
      };
      setSteps(prev => {
        const existing = prev.findIndex(s => s.step === 'web3_simulation');
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = web3Step;
          return updated;
        }
        return [...prev, web3Step];
      });
    } finally {
      setWeb3Confirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-grid bg-radial-glow flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50 backdrop-blur-sm bg-slate-950/80 shrink-0">
        <div className="flex items-center gap-2.5">
          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5 }}
            className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20"
          >
            <Hexagon size={14} className="text-white" />
          </motion.div>
          <div>
            <h1 className="text-sm font-bold gradient-text" style={{ fontFamily: 'var(--font-space-grotesk), monospace' }}>
              AetherFi
            </h1>
            <p className="text-[9px] text-slate-500 -mt-0.5 tracking-wide">
              {t.header.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleLang}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-700/40 bg-slate-800/30 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <Languages size={12} />
            <span className="text-[11px] font-medium">{lang === 'en' ? 'EN' : '中'}</span>
          </motion.button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="w-7 h-7 rounded-md border border-slate-700/40 bg-slate-800/30 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
          >
            <Settings size={13} />
          </button>
        </div>
      </header>

      {/* Main Content - Three Column Layout */}
      <main className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden min-h-0">
        {/* Left Column - Dashboard (~35%) */}
        <div className="w-full lg:w-[35%] min-w-0 flex flex-col gap-3 overflow-hidden">
          {/* Quick Input + Capital */}
          <div className="glass-card p-3 shrink-0">
            <MarketTickerBar />

            <div className="mt-3 flex gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-[10px] text-slate-500 mb-1 block">
                  {t.control.queryLabel}
                </label>
                <div className="relative">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                    placeholder={t.control.queryPlaceholder}
                    disabled={isRunning}
                    rows={2}
                    className="input-dark w-full pr-12 py-2 text-sm resize-none"
                  />
                  <motion.button
                    whileHover={{ scale: isRunning ? 1 : 1.05 }}
                    whileTap={{ scale: isRunning ? 1 : 0.95 }}
                    onClick={handleSubmit}
                    disabled={isRunning || !query.trim()}
                    className="absolute right-1.5 bottom-1.5 w-7 h-7 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
                  >
                    {isRunning ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={13} className="text-white" />
                    )}
                  </motion.button>
                </div>
              </div>

              <div className="w-28 shrink-0">
                <label className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                  <Wallet size={10} />
                  {t.control.capitalLabel}
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                  <input
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(Number(e.target.value))}
                    disabled={isRunning}
                    className="input-dark w-full pl-6 pr-2 py-2 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-500 hover:text-slate-300 hover:bg-slate-700/30 rounded transition-colors"
              >
                <Shield size={10} className={
                  riskProfile === 'conservative' ? 'text-emerald-400' :
                  riskProfile === 'neutral' ? 'text-amber-400' : 'text-rose-400'
                } />
                <span>
                  {riskProfile === 'conservative' ? t.header.riskConservative :
                   riskProfile === 'neutral' ? t.header.riskNeutral : t.header.riskAggressive}
                </span>
              </button>
            </div>
          </div>

          {/* Action Suggestions */}
          <div className="shrink-0">
            <ActionSuggestions onActionClick={handleQuickAction} />
          </div>

          {/* Market Overview */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="glass-card h-full flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-700/30 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <BarChart3 size={13} className="text-cyan-400" />
                  <span className="text-xs font-medium text-slate-200">{t.market.liveMarket}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <MiniMarketDashboard />
              </div>
            </div>
          </div>
        </div>

        {/* Center Column - Agent Pipeline (~32%) */}
        <div className="w-full lg:w-[32%] min-w-0 overflow-hidden">
          <div className="glass-card h-full flex flex-col overflow-hidden">
            <AgentPanel steps={steps} isRunning={isRunning} />
          </div>
        </div>

        {/* Right Column - Results + Tabs (~33%) */}
        <div className="w-full lg:w-[33%] min-w-0 flex flex-col glass-card overflow-hidden">
          <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex-1 overflow-y-auto min-h-0">
            <AnimatePresence mode="wait">
              {activeTab === 'results' && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <ResultPanel
                    result={finalResult}
                    steps={steps}
                    onConfirmWeb3={handleConfirmWeb3}
                    web3Confirming={web3Confirming}
                  />
                </motion.div>
              )}
              {activeTab === 'performance' && (
                <motion.div
                  key="performance"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <PerformancePanel />
                </motion.div>
              )}
              {activeTab === 'journal' && (
                <motion.div
                  key="journal"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <JournalPanel />
                </motion.div>
              )}
              {activeTab === 'review' && (
                <motion.div
                  key="review"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <ReviewPanel />
                </motion.div>
              )}
              {activeTab === 'market' && (
                <motion.div
                  key="market"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <MarketLivePanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 px-4 py-1 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className="text-[9px] text-slate-600">
            {isRunning ? t.footer.agentActive : t.footer.ready}
          </span>
        </div>
        <span className="text-[9px] text-slate-700">
          {t.footer.poweredBy}
        </span>
      </footer>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        riskProfile={riskProfile}
        onRiskProfileChange={(profile) => setRiskProfile(profile)}
      />
    </div>
  );
}

function MiniMarketDashboard() {
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE}/market/dashboard`);
        if (res.ok) {
          const d = await res.json();
          setData(d);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (p: number) => {
    if (!p) return '-';
    if (p >= 1000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (p >= 1) return `$${p.toFixed(2)}`;
    return `$${p.toFixed(4)}`;
  };

  const formatCap = (v: number) => {
    if (!v) return '-';
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    return `$${v.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/20 animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-700/50" />
              <div className="w-16 h-3 rounded bg-slate-700/50" />
            </div>
            <div className="w-20 h-4 rounded bg-slate-700/50" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || !data.coins) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-slate-500">{t.marketOverview.loadFailed}</p>
      </div>
    );
  }

  const coins = data.coins;
  const symbols = Object.keys(coins).slice(0, 8);

  return (
    <div className="space-y-1.5">
      {symbols.map((sym) => {
        const coin = coins[sym];
        const change = coin.price_change_24h ?? 0;
        return (
          <div key={sym} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/20 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-700/50 flex items-center justify-center text-[9px] font-bold text-slate-400 font-mono">
                {sym.slice(0, 1)}
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-300">{sym}</div>
                <div className="text-[9px] text-slate-500">{formatCap(coin.market_cap)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-200 font-mono">{formatPrice(coin.price)}</div>
              <div className={`text-[10px] font-mono ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
              </div>
            </div>
          </div>
        );
      })}

      {data.data_sources && (
        <div className="pt-2 mt-2 border-t border-slate-700/20">
          <div className="text-[9px] text-slate-600 text-center">
            {t.dataSource.title}: {data.data_sources.join(' · ')}
          </div>
        </div>
      )}
    </div>
  );
}
