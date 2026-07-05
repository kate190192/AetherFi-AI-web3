'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  Link2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Clock,
  Globe,
  Cpu,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface DataSourceInfoProps {
  marketData?: Record<string, any>;
  web3Data?: Record<string, any>;
  marketQuality?: string;   // real / fallback / mixed / unknown
  newsQuality?: string;     // real / fallback / mixed / unknown
}

const DataSourceInfo: React.FC<DataSourceInfoProps> = ({
  marketData,
  web3Data,
  marketQuality,
  newsQuality,
}) => {
  const { t, lang } = useI18n();

  const hasRealMarketData = marketData && Object.values(marketData).some((v: any) => v?.is_real_data);
  const marketDataSource = hasRealMarketData ? 'CoinGecko API' : 'Simulated (Fallback)';
  const marketDataUrl = marketData && Object.values(marketData).find((v: any) => v?.source_url)?.source_url;

  const web3IsReal = web3Data?.is_real_transaction === true;
  const web3Warning = web3Data?.warning || (lang === 'zh'
    ? '这是虚拟模拟交易，仅供演示。未发生真实链上交互。'
    : 'This is a simulated transaction for demo. No actual blockchain interaction occurred.');
  const priceBasis = web3Data?.price_basis;
  const dataSource = web3Data?.data_source;

  // 判断整体数据质量
  const overallQuality = marketQuality || (hasRealMarketData ? 'real' : 'fallback');
  const isFallback = overallQuality === 'fallback' || overallQuality === 'mixed';

  const getQualityBadge = (quality: string) => {
    switch (quality) {
      case 'real':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          label: lang === 'zh' ? '实时数据' : 'Live Data',
        };
      case 'mixed':
        return {
          icon: AlertTriangle,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/20',
          label: lang === 'zh' ? '部分模拟' : 'Partial Sim',
        };
      case 'fallback':
        return {
          icon: ShieldAlert,
          color: 'text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/20',
          label: lang === 'zh' ? '模拟数据' : 'Simulated',
        };
      default:
        return {
          icon: AlertTriangle,
          color: 't-label',
          bg: 'bg-[var(--c-500)]/10 border-[var(--c-500)]/20',
          label: lang === 'zh' ? '未知' : 'Unknown',
        };
    }
  };

  const qualityBadge = getQualityBadge(overallQuality);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 mb-4"
    >
      {/* 数据质量警告横幅 */}
      {isFallback && (
        <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2">
            <ShieldAlert size={14} className="text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300 leading-relaxed">
              {lang === 'zh'
                ? '当前部分数据为模拟数据，仅供参考，不构成投资建议。真实数据 API 可能暂时不可用。'
                : 'Some data is simulated for reference only and does not constitute investment advice. Real data APIs may be temporarily unavailable.'}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <Database size={14} className="text-blue-400" />
        <span className="text-xs font-medium t-label uppercase tracking-wider">
          {t.dataSource.title}
        </span>
        {/* 整体质量标签 */}
        <div className={`ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full border ${qualityBadge.bg}`}>
          <qualityBadge.icon size={10} className={qualityBadge.color} />
          <span className={`text-[10px] font-medium ${qualityBadge.color}`}>
            {qualityBadge.label}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {/* Market Data Source */}
        <div className="glass-card-inner p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Globe size={12} className="t-muted" />
              <span className="text-xs t-label">
                {t.dataSource.marketData}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {hasRealMarketData ? (
                <CheckCircle2 size={12} className="text-emerald-400" />
              ) : (
                <AlertTriangle size={12} className="text-amber-400" />
              )}
              <span className={`text-xs ${hasRealMarketData ? 'text-emerald-400' : 'text-amber-400'}`}>
                {hasRealMarketData ? t.dataSource.liveData : t.dataSource.simulatedData}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Link2 size={10} className="t-muted" />
            <span className="t-secondary font-mono">{marketDataSource}</span>
            {marketDataUrl && (
              <a
                href={marketDataUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 ml-1"
              >
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          {marketData && Object.values(marketData)[0]?.last_updated && (
            <div className="flex items-center gap-2 text-xs t-muted mt-1">
              <Clock size={10} />
              <span>
                {lang === 'zh' ? '更新时间: ' : 'Updated: '}
                {Object.values(marketData)[0]?.last_updated}
              </span>
            </div>
          )}

          {/* 各币种数据来源明细 */}
          {marketData && Object.keys(marketData).length > 0 && (
            <div className="mt-2 pt-2 border-t border-divider">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(marketData).map(([sym, data]: [string, any]) => (
                  <span
                    key={sym}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      data?.is_real_data
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {data?.is_real_data ? <CheckCircle2 size={8} /> : <AlertTriangle size={8} />}
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-divider">
            <p className="text-[10px] t-faint">
              {lang === 'zh'
                ? '价格数据来自 CoinGecko 免费 API，包含实时价格、24h涨跌幅、市值等。'
                : 'Price data from CoinGecko free API, includes real-time price, 24h change, market cap.'}
            </p>
          </div>
        </div>

        {/* Web3 Simulation Info */}
        <div className="glass-card-inner p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Cpu size={12} className="t-muted" />
              <span className="text-xs t-label">
                {lang === 'zh' ? 'Web3 交易' : 'Web3 Transaction'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-amber-400" />
              <span className="text-xs text-amber-400">
                {t.dataSource.virtualSimulation}
              </span>
            </div>
          </div>

          <p className="text-xs text-amber-400/80 leading-relaxed">
            {web3Warning}
          </p>

          {priceBasis && (
            <div className="flex items-center gap-2 text-xs mt-2 text-emerald-400">
              <TrendingUp size={10} />
              <span>
                {priceBasis === 'real_time' ? t.dataSource.priceBasedOnLive : t.dataSource.priceEstimated}
              </span>
            </div>
          )}

          {dataSource && (
            <div className="flex items-center gap-2 text-xs t-muted mt-1">
              <Database size={10} />
              <span>{dataSource}</span>
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-divider">
            <p className="text-[10px] t-faint">
              {lang === 'zh'
                ? '交易执行器支持模拟模式和真实链上模式切换。当前为模拟模式，价格来自 CoinGecko 实时 API。切换到真实模式需配置私钥和 RPC 节点。'
                : 'Transaction executor supports simulated and real on-chain modes. Currently in simulation mode, prices from CoinGecko real-time API. Switching to real mode requires private key and RPC node configuration.'}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DataSourceInfo;
