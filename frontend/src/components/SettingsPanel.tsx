'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Globe,
  Cpu,
  Server,
  Link2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Zap,
  Target,
  Shield,
  Database,
  Key,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { useI18n, Language } from '@/lib/i18n';
import { API_BASE, getLlmModels, LlmModel } from '@/lib/api';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  riskProfile?: 'conservative' | 'neutral' | 'aggressive';
  onRiskProfileChange?: (profile: 'conservative' | 'neutral' | 'aggressive') => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, riskProfile = 'neutral', onRiskProfileChange }) => {
  const { t, lang, setLang } = useI18n();
  const [dataSourceExpanded, setDataSourceExpanded] = useState(false);
  const [llmExpanded, setLlmExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataSourceConfig, setDataSourceConfig] = useState({
    provider: 'coingecko_binance',
    coingecko_base_url: 'https://api.coingecko.com/api/v3',
    coingecko_api_key: '',
    binance_base_url: 'https://api.binance.com/api/v3',
    binance_api_key: '',
    custom_base_url: '',
    custom_api_key: '',
    custom_provider_name: '',
  });
  const [llmConfig, setLlmConfig] = useState({
    provider: 'ollama',
    base_url: 'http://localhost:11434',
    model: 'qwen2.5:7b',
    api_key: '',
  });
  const [availableModels, setAvailableModels] = useState<LlmModel[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const fetchModels = useCallback(async (baseUrl?: string) => {
    const url = baseUrl || llmConfig.base_url || 'http://localhost:11434';
    setFetchingModels(true);
    setModelError(null);
    try {
      const data = await getLlmModels();
      setAvailableModels(data.models);
      if (data.models.length === 0) {
        setModelError(lang === 'zh' ? '未找到已安装的模型' : 'No models found');
      }
    } catch (e) {
      setModelError(e instanceof Error ? e.message : 'Failed to fetch models');
      setAvailableModels([]);
    } finally {
      setFetchingModels(false);
    }
  }, [llmConfig.base_url, lang]);

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  useEffect(() => {
    if (llmExpanded && llmConfig.provider === 'ollama') {
      fetchModels();
    }
  }, [llmExpanded, llmConfig.provider, fetchModels]);

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      if (res.ok) {
        const data = await res.json();
        if (data.data_sources) {
          setDataSourceConfig({
            provider: data.data_sources.provider || 'coingecko_binance',
            coingecko_base_url: data.data_sources.coingecko_base_url || 'https://api.coingecko.com/api/v3',
            coingecko_api_key: data.data_sources.coingecko_api_key || '',
            binance_base_url: data.data_sources.binance_base_url || 'https://api.binance.com/api/v3',
            binance_api_key: data.data_sources.binance_api_key || '',
            custom_base_url: data.data_sources.custom_base_url || '',
            custom_api_key: data.data_sources.custom_api_key || '',
            custom_provider_name: data.data_sources.custom_provider_name || '',
          });
        }
        setLlmConfig({
          provider: data.llm_provider || 'ollama',
          base_url: data.llm_base_url || 'http://localhost:11434',
          model: data.llm_model || 'qwen2.5:7b',
          api_key: data.llm_api_key || '',
        });
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    }
  };

  const saveDataSourceSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_sources: dataSourceConfig }),
      });
      if (res.ok) {
        setTimeout(() => setSaving(false), 500);
      }
    } catch (e) {
      console.error('Failed to save settings:', e);
      setSaving(false);
    }
  };

  const saveLlmSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llm_provider: llmConfig.provider,
          llm_base_url: llmConfig.base_url,
          llm_model: llmConfig.model,
          llm_api_key: llmConfig.api_key,
        }),
      });
      if (res.ok) {
        setTimeout(() => setSaving(false), 500);
      }
    } catch (e) {
      console.error('Failed to save settings:', e);
      setSaving(false);
    }
  };

  const providers = [
    { id: 'coingecko_binance', name: lang === 'zh' ? 'CoinGecko + Binance' : 'CoinGecko + Binance', desc: lang === 'zh' ? '双源验证（推荐）' : 'Dual source (Recommended)' },
    { id: 'coingecko', name: 'CoinGecko', desc: lang === 'zh' ? '免费加密货币数据' : 'Free crypto data API' },
    { id: 'binance', name: 'Binance', desc: lang === 'zh' ? '币安实时行情' : 'Binance real-time market' },
    { id: 'custom', name: lang === 'zh' ? '自定义 API' : 'Custom API', desc: lang === 'zh' ? '第三方自定义数据源' : 'Third-party data source' },
  ];

  const llmProviders = [
    { id: 'ollama', name: 'Ollama', desc: lang === 'zh' ? '本地开源模型' : 'Local open-source models' },
    { id: 'openai', name: 'OpenAI', desc: lang === 'zh' ? 'GPT 系列模型' : 'GPT series models' },
    { id: 'anthropic', name: 'Anthropic', desc: lang === 'zh' ? 'Claude 系列模型' : 'Claude series models' },
    { id: 'custom', name: lang === 'zh' ? '自定义' : 'Custom', desc: lang === 'zh' ? '兼容 OpenAI 格式' : 'OpenAI-compatible format' },
  ];

  const languages: { value: Language; label: string; flag: string }[] = [
    { value: 'zh', label: t.settings.chinese, flag: '🇨🇳' },
    { value: 'en', label: t.settings.english, flag: '🇬🇧' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-card z-[70] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-card sticky top-0 bg-card z-10">
              <h2 className="text-base font-semibold t-primary">
                {t.settings.title}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center t-muted hover:t-primary hover:bg-card-inner transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Risk Profile Section */}
              <div>
                <label className="text-xs font-medium t-label mb-3 flex items-center gap-1.5">
                  <Target size={12} />
                  {t.settings.riskProfile}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'conservative' as const, label: t.control.conservative, icon: Shield, color: 'emerald' },
                    { value: 'neutral' as const, label: t.control.neutral, icon: Target, color: 'amber' },
                    { value: 'aggressive' as const, label: t.control.aggressive, icon: Zap, color: 'rose' },
                  ].map((option) => {
                    const isActive = riskProfile === option.value;
                    const colorMap: Record<string, string> = {
                      emerald: isActive ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : '',
                      amber: isActive ? 'border-amber-500/40 bg-amber-500/10 text-amber-400' : '',
                      rose: isActive ? 'border-rose-500/40 bg-rose-500/10 text-rose-400' : '',
                    };
                    const colorClass = isActive
                      ? colorMap[option.color]
                      : 'border-divider t-label bg-card-inner';
                    return (
                      <button
                        key={option.value}
                        onClick={() => onRiskProfileChange?.(option.value)}
                        className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-xs font-medium transition-all ${colorClass}`}
                      >
                        <option.icon size={16} />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language Section */}
              <div>
                <label className="text-xs font-medium t-label mb-3 flex items-center gap-1.5">
                  <Globe size={12} />
                  {t.settings.language}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {languages.map((l) => {
                    const isActive = lang === l.value;
                    return (
                      <button
                        key={l.value}
                        onClick={() => setLang(l.value)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          isActive
                            ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
                            : 'border-divider t-label bg-card-inner'
                        }`}
                      >
                        <span className="text-lg">{l.flag}</span>
                        <span>{l.label}</span>
                        {isActive && <CheckCircle2 size={14} className="ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data Sources Section */}
              <div>
                <button
                  onClick={() => setDataSourceExpanded(!dataSourceExpanded)}
                  className="w-full flex items-center justify-between text-xs font-medium t-label mb-3 hover:t-primary transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Database size={12} />
                    {t.settings.marketData}
                  </span>
                  {dataSourceExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <div className="glass-card-inner p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database size={14} className="text-cyan-400" />
                      <span className="text-xs font-medium text-slate-200">
                        {providers.find(p => p.id === dataSourceConfig.provider)?.name || 'Auto'}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400">
                      {saving ? '...' : '✓'}
                    </span>
                  </div>
                </div>

                <AnimatePresence>
                  {dataSourceExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-3">
                        {/* Provider Selection */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {providers.map((p) => {
                            const isActive = dataSourceConfig.provider === p.id;
                            return (
                              <button
                                key={p.id}
                                onClick={() => setDataSourceConfig({ ...dataSourceConfig, provider: p.id })}
                                className={`text-left p-2 rounded-lg border text-xs transition-all ${
                                  isActive
                                    ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
                                    : 'border-divider t-label bg-card-inner'
                                }`}
                              >
                                <div className="font-medium">{p.name}</div>
                                <div className="text-[9px] opacity-70 mt-0.5">{p.desc}</div>
                              </button>
                            );
                          })}
                        </div>

                        {/* CoinGecko Config */}
                        {(dataSourceConfig.provider === 'coingecko' || dataSourceConfig.provider === 'coingecko_binance') && (
                          <div className="space-y-2 pt-2 border-t border-divider">
                            <div className="text-[10px] t-muted font-medium">CoinGecko</div>
                            <div>
                              <label className="text-[10px] t-muted block mb-1">
                                {lang === 'zh' ? 'API 地址' : 'API URL'}
                              </label>
                              <input
                                type="text"
                                value={dataSourceConfig.coingecko_base_url}
                                onChange={(e) => setDataSourceConfig({ ...dataSourceConfig, coingecko_base_url: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-card-inner border border-divider text-xs t-primary focus:outline-none focus:border-cyan-500/50 font-mono"
                                placeholder="https://api.coingecko.com/api/v3"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1 flex items-center gap-1">
                                <Key size={10} />
                                API Key {lang === 'zh' ? '（可选）' : '(optional)'}
                              </label>
                              <input
                                type="password"
                                value={dataSourceConfig.coingecko_api_key}
                                onChange={(e) => setDataSourceConfig({ ...dataSourceConfig, coingecko_api_key: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                                placeholder="CG-xxxxxxxxxxxx"
                              />
                            </div>
                          </div>
                        )}

                        {/* Binance Config */}
                        {(dataSourceConfig.provider === 'binance' || dataSourceConfig.provider === 'coingecko_binance') && (
                          <div className="space-y-2 pt-2 border-t border-slate-700/30">
                            <div className="text-[10px] text-slate-500 font-medium">Binance</div>
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1">
                                {lang === 'zh' ? 'API 地址' : 'API URL'}
                              </label>
                              <input
                                type="text"
                                value={dataSourceConfig.binance_base_url}
                                onChange={(e) => setDataSourceConfig({ ...dataSourceConfig, binance_base_url: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                                placeholder="https://api.binance.com/api/v3"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1 flex items-center gap-1">
                                <Key size={10} />
                                API Key {lang === 'zh' ? '（可选）' : '(optional)'}
                              </label>
                              <input
                                type="password"
                                value={dataSourceConfig.binance_api_key}
                                onChange={(e) => setDataSourceConfig({ ...dataSourceConfig, binance_api_key: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                                placeholder="xxxxxxxxxx"
                              />
                            </div>
                          </div>
                        )}

                        {/* Custom API Config */}
                        {dataSourceConfig.provider === 'custom' && (
                          <div className="space-y-2 pt-2 border-t border-slate-700/30">
                            <div className="text-[10px] text-slate-500 font-medium">
                              {lang === 'zh' ? '自定义数据源' : 'Custom Data Source'}
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1">
                                {lang === 'zh' ? '供应商名称' : 'Provider Name'}
                              </label>
                              <input
                                type="text"
                                value={dataSourceConfig.custom_provider_name}
                                onChange={(e) => setDataSourceConfig({ ...dataSourceConfig, custom_provider_name: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                                placeholder={lang === 'zh' ? '例如：CoinMarketCap' : 'e.g. CoinMarketCap'}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1">
                                {lang === 'zh' ? 'API 基础地址' : 'API Base URL'}
                              </label>
                              <input
                                type="text"
                                value={dataSourceConfig.custom_base_url}
                                onChange={(e) => setDataSourceConfig({ ...dataSourceConfig, custom_base_url: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                                placeholder="https://api.example.com/v1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1 flex items-center gap-1">
                                <Key size={10} />
                                API Key
                              </label>
                              <input
                                type="password"
                                value={dataSourceConfig.custom_api_key}
                                onChange={(e) => setDataSourceConfig({ ...dataSourceConfig, custom_api_key: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                                placeholder="your-api-key"
                              />
                            </div>
                            <p className="text-[9px] text-slate-600 leading-relaxed">
                              {lang === 'zh'
                                ? '自定义 API 需兼容 CoinGecko 响应格式，或在后端配置适配器。'
                                : 'Custom API must be CoinGecko-compatible, or configure an adapter on the backend.'}
                            </p>
                          </div>
                        )}

                        {/* Save Button */}
                        <button
                          onClick={saveDataSourceSettings}
                          disabled={saving}
                          className="w-full py-2 rounded-lg bg-gradient-to-r from-cyan-500/80 to-blue-500/80 text-white text-xs font-medium hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {saving && <RefreshCw size={12} className="animate-spin" />}
                          {lang === 'zh' ? '保存设置' : 'Save Settings'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* LLM Engine Section */}
              <div>
                <button
                  onClick={() => setLlmExpanded(!llmExpanded)}
                  className="w-full flex items-center justify-between text-xs font-medium text-slate-400 mb-3 hover:text-slate-200 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Cpu size={12} />
                    {t.settings.llmEngine}
                  </span>
                  {llmExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <div className="glass-card-inner p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu size={14} className="text-purple-400" />
                      <span className="text-xs font-medium text-slate-200">
                        {llmProviders.find(p => p.id === llmConfig.provider)?.name || 'Ollama'}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400">✓</span>
                  </div>
                </div>

                <AnimatePresence>
                  {llmExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-3">
                        {/* LLM Provider Selection */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {llmProviders.map((p) => {
                            const isActive = llmConfig.provider === p.id;
                            return (
                              <button
                                key={p.id}
                                onClick={() => setLlmConfig({ ...llmConfig, provider: p.id })}
                                className={`text-left p-2 rounded-lg border text-xs transition-all ${
                                  isActive
                                    ? 'border-purple-500/40 bg-purple-500/10 text-purple-400'
                                    : 'border-slate-700/40 text-slate-400 bg-slate-800/20 hover:bg-slate-800/50'
                                }`}
                              >
                                <div className="font-medium">{p.name}</div>
                                <div className="text-[9px] opacity-70 mt-0.5">{p.desc}</div>
                              </button>
                            );
                          })}
                        </div>

                        {/* LLM Config */}
                        <div className="space-y-2 pt-2 border-t border-slate-700/30">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">
                              {lang === 'zh' ? 'API 地址' : 'API URL'}
                            </label>
                            <input
                              type="text"
                              value={llmConfig.base_url}
                              onChange={(e) => setLlmConfig({ ...llmConfig, base_url: e.target.value })}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 font-mono"
                              placeholder="http://localhost:11434"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-1">
                              {lang === 'zh' ? '模型名称' : 'Model Name'}
                            </label>
                            <div className="flex gap-1.5">
                              <select
                                value={llmConfig.model}
                                onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                                className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 font-mono"
                              >
                                {availableModels.length > 0 ? (
                                  availableModels.map((m) => (
                                    <option key={m.name} value={m.name}>{m.name}</option>
                                  ))
                                ) : (
                                  <option value={llmConfig.model}>{llmConfig.model}</option>
                                )}
                              </select>
                              <button
                                onClick={() => fetchModels(llmConfig.base_url)}
                                disabled={fetchingModels}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-700/50 border border-slate-700/50 text-xs text-slate-300 hover:text-purple-400 hover:border-purple-500/30 transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
                                title={lang === 'zh' ? '拉取可用模型' : 'Fetch available models'}
                              >
                                {fetchingModels ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                  <Cpu size={12} />
                                )}
                              </button>
                            </div>
                            {modelError && (
                              <p className="text-[10px] text-rose-400 mt-1">{modelError}</p>
                            )}
                            {availableModels.length > 0 && (
                              <p className="text-[9px] text-slate-600 mt-1">
                                {lang === 'zh' ? `已加载 ${availableModels.length} 个模型` : `${availableModels.length} models loaded`}
                              </p>
                            )}
                          </div>
                          {llmConfig.provider !== 'ollama' && (
                            <div>
                              <label className="text-[10px] text-slate-500 block mb-1 flex items-center gap-1">
                                <Key size={10} />
                                API Key
                              </label>
                              <input
                                type="password"
                                value={llmConfig.api_key}
                                onChange={(e) => setLlmConfig({ ...llmConfig, api_key: e.target.value })}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50 font-mono"
                                placeholder="sk-xxxxxxxxxxxx"
                              />
                            </div>
                          )}
                        </div>

                        {/* Save Button */}
                        <button
                          onClick={saveLlmSettings}
                          disabled={saving}
                          className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-500/80 to-pink-500/80 text-white text-xs font-medium hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {saving && <RefreshCw size={12} className="animate-spin" />}
                          {lang === 'zh' ? '保存设置' : 'Save Settings'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Transaction Executor Section */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-3 flex items-center gap-1.5">
                  <Wallet size={12} />
                  {t.settings.tradeExecutor}
                </label>
                <div className="space-y-2">
                  {/* Simulated Mode */}
                  <div className="glass-card-inner p-3 border-l-2 border-l-emerald-500/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className="text-emerald-400" />
                      <span className="text-xs font-medium t-primary">
                          {lang === 'zh' ? '模拟模式（当前）' : 'Simulated Mode (Current)'}
                        </span>
                      </div>
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {lang === 'zh'
                        ? '基于真实市场价格的模拟交易。不执行真实链上操作，适用于策略预演和演示。'
                        : 'Simulated transactions based on real market prices. No real on-chain operations. For strategy preview and demo.'}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        {t.settings.security}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                        {t.settings.realPrices}
                      </span>
                    </div>
                  </div>

                  {/* Real EVM Mode (Placeholder) */}
                  <div className="glass-card-inner p-3 opacity-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Wallet size={14} className="text-amber-400" />
                        <span className="text-xs font-medium text-slate-400">
                          {t.settings.realOnChainMode}
                        </span>
                      </div>
                      <AlertCircle size={14} className="text-amber-400" />
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {lang === 'zh'
                        ? '连接真实 EVM 链执行交易。需配置 RPC 节点和钱包私钥。预留接口，尚未实现。'
                        : 'Execute real transactions on EVM chains. Requires RPC node and private key. Interface reserved, not yet implemented.'}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                        {t.settings.needsConfig}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-500">
                        {t.settings.reservedInterface}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-600 mt-2 leading-relaxed">
                  {lang === 'zh'
                    ? '切换执行器类型需修改后端 .env 配置中的 EXECUTOR_TYPE 并重启服务。'
                    : 'To switch executor type, modify EXECUTOR_TYPE in backend .env config and restart the service.'}
                </p>
              </div>

              {/* About Section */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-3 block">
                  {t.settings.about}
                </label>
                <div className="glass-card-inner p-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lang === 'zh'
                      ? 'AetherFi 是一个自主 AI 金融代理系统，能够理解用户金融问题、调用市场与新闻数据、进行多步推理、生成投资策略并模拟 Web3 链上执行行为。'
                      : 'AetherFi is an autonomous AI financial agent system that understands user financial queries, fetches market and news data, performs multi-step reasoning, generates investment strategies, and simulates Web3 on-chain execution.'}
                  </p>
                  <div className="mt-3 pt-3 border-t border-slate-700/20">
                    <p className="text-[10px] text-slate-600">
                      {t.settings.version} 1.0.0 · Genesis Track
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SettingsPanel;
