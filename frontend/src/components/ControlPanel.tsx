'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Send,
  Sparkles,
  BarChart3,
  Wallet,
  TrendingUp,
  MessageSquare,
  Shield,
  Target,
  Zap,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import ActionSuggestions from './ActionSuggestions';

type RiskProfile = 'conservative' | 'neutral' | 'aggressive';

interface ControlPanelProps {
  query: string;
  setQuery: (q: string) => void;
  capital: number;
  setCapital: (c: number) => void;
  riskProfile: RiskProfile;
  setRiskProfile: (r: RiskProfile) => void;
  isRunning: boolean;
  onSubmit: () => void;
  history: string[];
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  query,
  setQuery,
  capital,
  setCapital,
  riskProfile,
  setRiskProfile,
  isRunning,
  onSubmit,
  history,
}) => {
  const { t } = useI18n();

  const QUICK_ACTIONS = [
    { label: t.control.actionEth, icon: TrendingUp, query: t.control.actionEthQuery },
    { label: t.control.actionBtcSol, icon: BarChart3, query: t.control.actionBtcSolQuery },
    { label: t.control.actionPortfolio, icon: Wallet, query: t.control.actionPortfolioQuery },
    { label: t.control.actionDefi, icon: Sparkles, query: t.control.actionDefiQuery },
  ];

  const RISK_OPTIONS: { value: RiskProfile; label: string; icon: React.ElementType; color: string }[] = [
    { value: 'conservative', label: t.control.conservative, icon: Shield, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
    { value: 'neutral', label: t.control.neutral, icon: Target, color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
    { value: 'aggressive', label: t.control.aggressive, icon: Zap, color: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && query.trim() && !isRunning) {
      e.preventDefault();
      onSubmit();
    }
  };

  const handleQuickAction = (q: string) => {
    setQuery(q);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Query Input */}
      <div className="glass-card p-4">
        <label className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
          <MessageSquare size={12} />
          {t.control.queryLabel}
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.control.queryPlaceholder}
          className="input-dark w-full px-3 py-2.5 text-sm resize-none min-h-[80px]"
          rows={3}
          disabled={isRunning}
        />
      </div>

      {/* Capital Input */}
      <div className="glass-card p-4">
        <label className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
          <Wallet size={12} />
          {t.control.capitalLabel}
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
          <input
            type="number"
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
            min={100}
            step={100}
            className="input-dark w-full pl-7 pr-3 py-2.5 text-sm font-mono"
            disabled={isRunning}
          />
        </div>
      </div>

      {/* Risk Profile */}
      <div className="glass-card p-4">
        <label className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1.5">
          <Shield size={12} />
          {t.control.riskLabel}
        </label>
        <div className="flex gap-2">
          {RISK_OPTIONS.map((option) => {
            const isActive = riskProfile === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setRiskProfile(option.value)}
                disabled={isRunning}
                className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-lg border text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? option.color
                    : 'border-slate-700/50 text-slate-500 bg-slate-800/30 hover:bg-slate-800/50'
                }`}
              >
                <option.icon size={16} />
                <span className="truncate w-full text-center">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-4">
        <label className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1.5">
          <Sparkles size={12} />
          {t.control.quickActions}
        </label>
        <div className="flex flex-col gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleQuickAction(action.query)}
                disabled={isRunning}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-700/40 bg-slate-800/20 text-sm text-slate-300 hover:bg-slate-800/50 hover:border-slate-600/50 transition-all duration-200 text-left disabled:opacity-40"
              >
                <Icon size={14} className="text-cyan-500/70 shrink-0" />
                <span className="truncate">{action.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Smart Action Suggestions */}
      <ActionSuggestions onActionClick={handleQuickAction} />

      {/* Submit Button */}
      <motion.button
        whileHover={{ scale: isRunning ? 1 : 1.02 }}
        whileTap={{ scale: isRunning ? 1 : 0.98 }}
        onClick={onSubmit}
        disabled={isRunning || !query.trim()}
        className="btn-gradient w-full py-3.5 px-4 flex items-center justify-center gap-2 text-sm"
      >
        {isRunning ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            >
              <Sparkles size={16} />
            </motion.div>
            {t.control.agentRunning}
          </>
        ) : (
          <>
            <Send size={16} />
            {t.control.runAgent}
          </>
        )}
      </motion.button>

      {/* History */}
      {history.length > 0 && (
        <div className="glass-card p-4">
          <label className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1.5">
            <MessageSquare size={12} />
            {t.control.recentQueries}
          </label>
          <div className="flex flex-col gap-1.5">
            {history.slice(-3).map((h, i) => (
              <button
                key={i}
                onClick={() => setQuery(h)}
                disabled={isRunning}
                className="text-xs text-slate-500 hover:text-slate-300 truncate text-left px-2 py-1.5 rounded-md hover:bg-slate-800/40 transition-colors disabled:opacity-40"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
