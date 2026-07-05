'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { API_BASE } from '@/lib/api';

interface CoinTicker {
  symbol: string;
  name: string;
  price: number;
  change_24h: number;
}

const MarketTickerBar: React.FC = () => {
  const { t } = useI18n();
  const [tickers, setTickers] = useState<CoinTicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTickers = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(`${API_BASE}/market/dashboard`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        const coins = data.coins || {};
        const topSymbols = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA'];
        const list: CoinTicker[] = [];
        for (const sym of topSymbols) {
          if (coins[sym]) {
            list.push({
              symbol: sym,
              name: coins[sym].name || sym,
              price: coins[sym].price || 0,
              change_24h: coins[sym].price_change_24h || 0,
            });
          }
        }
        setTickers(list);
      }
    } catch (e) {
      console.error('Failed to fetch market tickers:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickers();
    const interval = setInterval(() => fetchTickers(), 30000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  };

  const getTrendIcon = (change: number) => {
    if (change > 1) return <TrendingUp size={10} className="text-emerald-400" />;
    if (change < -1) return <TrendingDown size={10} className="text-rose-400" />;
    return <Minus size={10} className="t-muted" />;
  };

  return (
    <div className="glass-card-inner px-3 py-2 flex items-center gap-2 overflow-x-auto">
      <button
        onClick={() => fetchTickers(true)}
        className="shrink-0 p-1 rounded transition-colors"
        style={{ background: 'var(--bg-card-inner)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-btn-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card-inner)')}
        title={t.ticker.refresh}
      >
        <RefreshCw size={12} className={`t-muted ${refreshing ? 'animate-spin' : ''}`} />
      </button>
      <div className="h-4 w-px border-divider shrink-0" />
      {loading ? (
        <div className="flex items-center gap-3 px-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-1.5 animate-pulse">
              <div className="w-8 h-3 rounded bg-card-inner" />
              <div className="w-12 h-3 rounded bg-card-inner" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {tickers.slice(0, 6).map((ticker, i) => (
            <motion.div
              key={ticker.symbol}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-1.5 shrink-0"
            >
              <span className="text-[10px] font-medium t-label font-mono">
                {ticker.symbol}
              </span>
              <span className="text-[11px] t-primary font-mono font-medium">
                {formatPrice(ticker.price)}
              </span>
              <span className={`text-[10px] font-mono flex items-center gap-0.5 ${
                ticker.change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {getTrendIcon(ticker.change_24h)}
                {ticker.change_24h >= 0 ? '+' : ''}{ticker.change_24h.toFixed(1)}%
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketTickerBar;
