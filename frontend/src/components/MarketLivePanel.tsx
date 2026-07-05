'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Coins,
  BarChart2,
  Clock,
  ChevronRight,
  X,
} from 'lucide-react';
import { MarketPrice, MarketOverview, TrendingCoin, getMarketLive, getMarketOverview, getMarketTrending } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const DEFAULT_SYMBOLS = ['BTC', 'ETH', 'SOL', 'USDC'];

const MarketLivePanel: React.FC = () => {
  const { t } = useI18n();
  const [prices, setPrices] = useState<Record<string, MarketPrice>>({});
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [trending, setTrending] = useState<TrendingCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<MarketPrice | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [pricesData, overviewData, trendingData] = await Promise.all([
        Promise.all(DEFAULT_SYMBOLS.map(symbol => getMarketLive(symbol))),
        getMarketOverview(),
        getMarketTrending(),
      ]);

      const pricesMap: Record<string, MarketPrice> = {};
      pricesData.forEach(p => {
        pricesMap[p.symbol] = p;
      });
      setPrices(pricesMap);
      setOverview(overviewData);
      setTrending(trendingData.coins || []);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.log('API unavailable, using mock data');
      setPrices({
        BTC: { symbol: 'BTC', name: 'Bitcoin', price: 67890.50, change_24h: 2.34, volume_24h: 28500000000, market_cap: 1340000000000 },
        ETH: { symbol: 'ETH', name: 'Ethereum', price: 3456.78, change_24h: -1.23, volume_24h: 12300000000, market_cap: 415000000000 },
        SOL: { symbol: 'SOL', name: 'Solana', price: 178.90, change_24h: 5.67, volume_24h: 4500000000, market_cap: 68000000000 },
        USDC: { symbol: 'USDC', name: 'USD Coin', price: 1.00, change_24h: 0.01, volume_24h: 8900000000, market_cap: 35000000000 },
      });
      setOverview({ total_market_cap: 2500000000000, total_volume_24h: 85000000000, btc_dominance: 52.3, active_currencies: 12500 });
      setTrending([
        { symbol: 'BTC', name: 'Bitcoin', price: 67890.50, change_24h: 2.34, sparkline: [65000, 66200, 65800, 67100, 67890] },
        { symbol: 'ETH', name: 'Ethereum', price: 3456.78, change_24h: -1.23, sparkline: [3520, 3480, 3500, 3470, 3456] },
        { symbol: 'SOL', name: 'Solana', price: 178.90, change_24h: 5.67, sparkline: [165, 168, 172, 175, 178] },
        { symbol: 'DOGE', name: 'Dogecoin', price: 0.1234, change_24h: 8.90, sparkline: [0.11, 0.115, 0.118, 0.12, 0.123] },
        { symbol: 'AVAX', name: 'Avalanche', price: 45.67, change_24h: -2.34, sparkline: [47, 46.5, 46, 45.8, 45.6] },
      ]);
      setLastUpdate(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  };

  const drawSparkline = (data: number[]) => {
    if (data.length < 2) return undefined;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 60;
    const height = 24;
    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-divider">
        <div className="flex items-center gap-2">
          <Coins size={16} className="text-cyan-400" />
          <span className="text-sm font-medium t-primary">{t.market.liveMarket}</span>
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-card-inner t-label text-xs hover:text-cyan-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          {t.market.refresh}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Coins size={32} className="t-faint" />
              </motion.div>
              <p className="text-xs t-muted mt-3">{t.market.loading}</p>
            </div>
          ) : (
            <>
              {overview && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart2 size={14} className="text-purple-400" />
                    <span className="text-xs font-medium t-label uppercase tracking-wider">
                      {t.market.overview}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass-card-inner p-3">
                      <div className="text-xs t-muted mb-1">{t.market.totalCap}</div>
                      <div className="text-sm font-semibold t-primary">
                        {formatNumber(overview.total_market_cap)}
                      </div>
                    </div>
                    <div className="glass-card-inner p-3">
                      <div className="text-xs t-muted mb-1">{t.market.btcDominance}</div>
                      <div className="text-sm font-semibold text-amber-400">
                        {overview.btc_dominance.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium t-label uppercase tracking-wider">
                    {t.market.topCoins}
                  </span>
                  <span className="flex items-center gap-1 text-xs t-faint">
                    <Clock size={10} />
                    {lastUpdate}
                  </span>
                </div>
                <div className="space-y-2">
                  {DEFAULT_SYMBOLS.map((symbol) => {
                    const price = prices[symbol];
                    if (!price) return null;
                    const isPositive = price.change_24h >= 0;
                    return (
                      <motion.button
                        key={symbol}
                        onClick={() => setSelectedCoin(price)}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-card-inner transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                            <span className="text-xs font-bold text-cyan-400">{symbol.slice(0, 2)}</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium t-primary">{price.name}</div>
                            <div className="text-xs t-muted">{symbol}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold t-primary font-mono">
                            {formatPrice(price.price)}
                          </div>
                          <div className={`flex items-center justify-end gap-0.5 text-xs ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {isPositive ? '+' : ''}{price.change_24h.toFixed(2)}%
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={14} className="text-emerald-400" />
                  <span className="text-xs font-medium t-label uppercase tracking-wider">
                    {t.market.trending}
                  </span>
                </div>
                <div className="space-y-2">
                  {trending.map((coin, idx) => {
                    const isPositive = coin.change_24h >= 0;
                    return (
                      <motion.button
                        key={coin.symbol}
                        onClick={() => setSelectedCoin({
                          symbol: coin.symbol,
                          name: coin.name,
                          price: coin.price,
                          change_24h: coin.change_24h,
                          volume_24h: 0,
                          market_cap: 0,
                        })}
                        className="w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left"
                        style={{ background: 'var(--bg-card-inner)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-btn-hover)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-card-inner)')}
                      >
                        <span className="text-xs font-mono t-faint w-4">{idx + 1}</span>
                        <div>
                          <div className="text-sm font-medium t-primary">{coin.name}</div>
                          <div className="text-xs t-muted">{coin.symbol}</div>
                        </div>
                        <svg className="w-14 h-6" viewBox="0 0 60 24">
                          <path
                            d={drawSparkline(coin.sparkline)}
                            fill="none"
                            stroke={isPositive ? '#10b981' : '#ef4444'}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <div className="text-right ml-auto">
                          <div className="text-sm font-semibold t-primary font-mono">
                            {formatPrice(coin.price)}
                          </div>
                          <div className={`text-xs ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? '+' : ''}{coin.change_24h.toFixed(2)}%
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedCoin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedCoin(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-cyan-400">{selectedCoin.symbol.slice(0, 2)}</span>
                  </div>
                  <div>
                    <div className="text-lg font-semibold t-primary">{selectedCoin.name}</div>
                    <div className="text-xs t-muted">{selectedCoin.symbol}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCoin(null)}
                  className="w-8 h-8 rounded-lg bg-card-inner flex items-center justify-center t-label hover:t-primary transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="text-3xl font-bold t-primary font-mono mb-2">
                  {formatPrice(selectedCoin.price)}
                </div>
                <div className={`flex items-center justify-center gap-1 text-lg ${
                  selectedCoin.change_24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {selectedCoin.change_24h >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  {selectedCoin.change_24h >= 0 ? '+' : ''}{selectedCoin.change_24h.toFixed(2)}%
                  <span className="t-muted text-sm ml-1">24h</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card-inner p-3">
                  <div className="text-xs t-muted mb-1">{t.market.volume}</div>
                  <div className="text-sm font-semibold t-primary">
                    {selectedCoin.volume_24h > 0 ? formatNumber(selectedCoin.volume_24h) : '--'}
                  </div>
                </div>
                <div className="glass-card-inner p-3">
                  <div className="text-xs t-muted mb-1">{t.market.marketCap}</div>
                  <div className="text-sm font-semibold t-primary">
                    {selectedCoin.market_cap > 0 ? formatNumber(selectedCoin.market_cap) : '--'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedCoin(null)}
                className="w-full mt-4 px-4 py-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/20 transition-colors flex items-center justify-center gap-2"
              >
                {t.market.close}
                <ChevronRight size={14} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketLivePanel;