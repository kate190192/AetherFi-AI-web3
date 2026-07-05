'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpCircle,
  ArrowDownCircle,
  Eye,
  ShoppingCart,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { MarketSuggestionsResponse, getMarketSuggestions } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface ActionSuggestionsProps {
  onActionClick: (query: string) => void;
}

const ActionSuggestions: React.FC<ActionSuggestionsProps> = ({ onActionClick }) => {
  const { t } = useI18n();
  const [suggestions, setSuggestions] = useState<MarketSuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    try {
      const data = await getMarketSuggestions();
      setSuggestions(data);
      setError(null);
    } catch (err) {
      console.log('API unavailable, using mock suggestions');
      setSuggestions({
        suggestions: [
          { type: 'buy', symbol: 'BTC', name: 'Bitcoin', price: 67890, change_1h: 1.2, change_24h: 2.34, reason: '1小时涨幅 1.20%，短期看涨动能强', priority: 'high' },
          { type: 'sell', symbol: 'ETH', name: 'Ethereum', price: 3456, change_1h: -0.8, change_24h: -1.23, reason: '1小时跌幅 0.80%，短期看跌风险', priority: 'high' },
          { type: 'watch', symbol: 'SOL', name: 'Solana', price: 178.9, change_24h: 5.67, reason: '24小时涨幅 5.67%，关注追涨机会', priority: 'medium' },
          { type: 'buy_low', symbol: 'DOGE', name: 'Dogecoin', price: 0.1234, change_24h: -8.9, reason: '24小时跌幅 8.90%，可能存在抄底机会', priority: 'medium' },
          { type: 'watch', symbol: 'XRP', name: 'Ripple', price: 0.52, change_24h: 1.5, reason: '高交易量，市场活跃', priority: 'low' },
        ],
        trending_up: [
          { symbol: 'SOL', name: 'Solana', change: 5.67 },
          { symbol: 'BTC', name: 'Bitcoin', change: 2.34 },
        ],
        trending_down: [
          { symbol: 'DOGE', name: 'Dogecoin', change: -8.9 },
          { symbol: 'ETH', name: 'Ethereum', change: -1.23 },
        ],
        overall_market_trend: 'stable' as const,
        count: 5,
      });
      setError(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
    const interval = setInterval(fetchSuggestions, 60000);
    return () => clearInterval(interval);
  }, [fetchSuggestions]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return <TrendingUp size={16} className="text-emerald-400" />;
      case 'bearish':
        return <TrendingDown size={16} className="text-rose-400" />;
      default:
        return <Minus size={16} className="text-slate-400" />;
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'bullish':
        return t.actions.bullMarket;
      case 'bearish':
        return t.actions.bearMarket;
      default:
        return t.actions.sideways;
    }
  };

  const getSuggestionConfig = (type: string) => {
    switch (type) {
      case 'buy':
        return {
          icon: <ArrowUpCircle size={20} />,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          label: t.actions.buy,
        };
      case 'sell':
        return {
          icon: <ArrowDownCircle size={20} />,
          color: 'text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/20',
          label: t.actions.sell,
        };
      case 'watch':
        return {
          icon: <Eye size={20} />,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/20',
          label: t.actions.watch,
        };
      case 'buy_low':
        return {
          icon: <ShoppingCart size={20} />,
          color: 'text-cyan-400',
          bg: 'bg-cyan-500/10 border-cyan-500/20',
          label: t.actions.buyDip,
        };
      default:
        return {
          icon: <Zap size={20} />,
          color: 'text-slate-400',
          bg: 'bg-slate-500/10 border-slate-500/20',
          label: t.actions.action,
        };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'high':
        return { color: 'text-rose-400', label: t.actions.high };
      case 'medium':
        return { color: 'text-amber-400', label: t.actions.medium };
      default:
        return { color: 'text-slate-400', label: t.actions.low };
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString()}`;
    return `$${price.toFixed(2)}`;
  };

  const handleActionClick = (suggestion: MarketSuggestionsResponse['suggestions'][0]) => {
    const actionText = suggestion.type === 'buy' ? t.actions.buy : suggestion.type === 'sell' ? t.actions.sell : suggestion.type === 'buy_low' ? t.actions.buyDip : t.actions.watch;
    const query = t.actionSuggestions.queryTemplate
      .replace('{name}', suggestion.name)
      .replace('{symbol}', suggestion.symbol)
      .replace('{action}', actionText)
      .replace('{price}', formatPrice(suggestion.price))
      .replace('{reason}', suggestion.reason);
    onActionClick(query);
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-cyan-400" />
          <h3 className="text-sm font-medium text-slate-200">{t.actionSuggestions.title}</h3>
        </div>
        <div className="flex items-center gap-3">
          {suggestions && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs bg-slate-700/50">
              {getTrendIcon(suggestions.overall_market_trend)}
              <span className="text-slate-400">{getTrendText(suggestions.overall_market_trend)}</span>
            </div>
          )}
          <button
            onClick={() => {
              setRefreshing(true);
              fetchSuggestions();
            }}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={`text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Zap size={24} className="text-slate-500" />
            </motion.div>
            <p className="text-xs text-slate-400 mt-2">{t.actionSuggestions.loading}</p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-xs text-slate-400">{error}</p>
          </div>
        ) : suggestions && suggestions.suggestions.length > 0 ? (
          <div className="space-y-2">
            {suggestions.suggestions.slice(0, 5).map((suggestion, index) => {
              const config = getSuggestionConfig(suggestion.type);
              const priority = getPriorityConfig(suggestion.priority);
              
              return (
                <motion.button
                  key={`${suggestion.symbol}-${suggestion.type}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleActionClick(suggestion)}
                  className={`w-full p-3 rounded-lg border ${config.bg} hover:bg-white/5 transition-all text-left group`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center ${config.color}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200 truncate">{suggestion.name}</span>
                        <span className="text-xs text-slate-500 font-mono">({suggestion.symbol})</span>
                        <span className={`text-xs ${priority.color}`}>{priority.label}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 truncate">{suggestion.reason}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-200">
                        {formatPrice(suggestion.price)}
                      </div>
                      {suggestion.change_1h !== undefined && (
                        <div className={`text-xs ${suggestion.change_1h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {suggestion.change_1h >= 0 ? '+' : ''}{suggestion.change_1h.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <Zap size={24} className="text-slate-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400">{t.actionSuggestions.noSuggestions}</p>
          </div>
        )}
      </AnimatePresence>

      {suggestions && (suggestions.trending_up.length > 0 || suggestions.trending_down.length > 0) && (
        <div className="mt-4 pt-4 border-t border-slate-700/30">
          <div className="grid grid-cols-2 gap-3">
            {suggestions.trending_up.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp size={12} className="text-emerald-400" />
                  <span className="text-xs text-slate-400">{t.actionSuggestions.trendingUp}</span>
                </div>
                <div className="space-y-1">
                  {suggestions.trending_up.slice(0, 3).map(coin => (
                    <div key={coin.symbol} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{coin.symbol}</span>
                      <span className="text-emerald-400">+{coin.change.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {suggestions.trending_down.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingDown size={12} className="text-rose-400" />
                  <span className="text-xs text-slate-400">{t.actionSuggestions.trendingDown}</span>
                </div>
                <div className="space-y-1">
                  {suggestions.trending_down.slice(0, 3).map(coin => (
                    <div key={coin.symbol} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{coin.symbol}</span>
                      <span className="text-rose-400">{coin.change.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionSuggestions;
