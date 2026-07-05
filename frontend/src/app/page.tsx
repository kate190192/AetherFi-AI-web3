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
  Sun,
  Moon,
  Monitor,
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
import { useTheme, Theme } from '@/lib/theme';

type RiskProfile = 'conservative' | 'neutral' | 'aggressive';

export default function Home() {
  const { t, lang, toggleLang } = useI18n();
  const { theme, resolved, setTheme } = useTheme();
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
    <div className="min-h-screen bg-grid bg-radial-glow flex flex-col h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b backdrop-blur-sm shrink-0" style={{ borderColor: 'var(--header-border)', background: 'var(--header-bg)' }}>
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30"
          >
            <Hexagon size={20} className="text-white" />
          </motion.div>
          <div>
            <h1 className="text-lg font-bold gradient-text" style={{ fontFamily: 'var(--font-space-grotesk), monospace' }}>
              AetherFi
            </h1>
            <p className="text-[11px] -mt-0.5 tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              {t.header.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle — 3-mode pill */}
          <div className="nav-pill">
            {([
              { value: 'light' as Theme, icon: Sun, label: lang === 'zh' ? '亮' : 'Light' },
              { value: 'dark' as Theme, icon: Moon, label: lang === 'zh' ? '暗' : 'Dark' },
              { value: 'system' as Theme, icon: Monitor, label: lang === 'zh' ? '系统' : 'Auto' },
            ]).map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`nav-pill-item ${theme === value ? 'active' : ''}`}
                title={label}
              >
                <Icon size={13} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors theme-toggle-btn"
          >
            <Languages size={14} />
            <span className="text-xs font-medium">{lang === 'en' ? 'EN' : '中'}</span>
          </motion.button>

          <button
            onClick={() => setSettingsOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors theme-toggle-btn"
          >
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* Main Content - Three Column Layout */}
      <main className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden min-h-0">
        {/* Left Column - Dashboard (~35%) */}
        <div className="w-full lg:w-[35%] min-w-0 flex flex-col gap-3 overflow-hidden">
          {/* Quick Input + Capital */}
          <div className="glass-card p-4 shrink-0">
            <MarketTickerBar />

            <div className="mt-4 flex gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-xs mb-1.5 block font-medium" style={{ color: 'var(--text-label)' }}>
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
                    className="input-dark w-full pr-12 py-2.5 text-sm resize-none"
                  />
                  <motion.button
                    whileHover={{ scale: isRunning ? 1 : 1.05 }}
                    whileTap={{ scale: isRunning ? 1 : 0.95 }}
                    onClick={handleSubmit}
                    disabled={isRunning || !query.trim()}
                    className="absolute right-2 bottom-2 w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/30"
                  >
                    {isRunning ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Send size={14} className="text-white" />
                    )}
                  </motion.button>
                </div>
              </div>

              <div className="w-32 shrink-0">
                <label className="text-xs mb-1.5 flex items-center gap-1.5 font-medium" style={{ color: 'var(--text-label)' }}>
                  <Wallet size={12} />
                  {t.control.capitalLabel}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>$</span>
                  <input
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(Number(e.target.value))}
                    disabled={isRunning}
                    className="input-dark w-full pl-7 pr-3 py-2.5 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center gap-1 px-2 py-1 text-[10px] hover:opacity-80 rounded transition-colors"
                style={{ color: 'var(--text-secondary)' }}
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
              <div className="px-3 py-2 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--card-inner-border)' }}>
                <div className="flex items-center gap-1.5">
                  <BarChart3 size={13} style={{ color: 'var(--accent-cyan)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{t.market.liveMarket}</span>
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
      <footer className="border-t px-4 py-1 flex items-center justify-between shrink-0" style={{ borderColor: 'var(--header-border)' }}>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-cyan-400 animate-pulse' : ''}`} style={!isRunning ? { background: 'var(--text-muted)' } : {}} />
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {isRunning ? t.footer.agentActive : t.footer.ready}
          </span>
        </div>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
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
  const { resolved } = useTheme();
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
          <div key={i} className="flex items-center justify-between p-2 rounded-lg glass-card-inner animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full" style={{ background: 'var(--card-inner-border)' }} />
              <div className="w-16 h-3 rounded" style={{ background: 'var(--card-inner-border)' }} />
            </div>
            <div className="w-20 h-4 rounded" style={{ background: 'var(--card-inner-border)' }} />
          </div>
        ))}
      </div>
    );
  }

  if (!data || !data.coins) {
    return (
      <div className="text-center py-6">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.marketOverview.loadFailed}</p>
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
          <div key={sym} className="flex items-center justify-between p-2 rounded-lg hover:opacity-80 transition-colors glass-card-inner">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold font-mono" style={{ background: 'var(--tag-bg)', color: 'var(--text-secondary)' }}>
                {sym.slice(0, 1)}
              </div>
              <div>
                <div className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{sym}</div>
                <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{formatCap(coin.market_cap)}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-mono" style={{ color: 'var(--text-primary)' }}>{formatPrice(coin.price)}</div>
              <div className={`text-[10px] font-mono ${change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
              </div>
            </div>
          </div>
        );
      })}

      {data.data_sources && (
        <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--card-inner-border)' }}>
          <div className="text-[9px] text-center" style={{ color: 'var(--text-muted)' }}>
            {t.dataSource.title}: {data.data_sources.join(' · ')}
          </div>
        </div>
      )}
    </div>
  );
}
