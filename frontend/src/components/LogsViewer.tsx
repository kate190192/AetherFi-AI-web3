'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  User,
  Timer,
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
  Cpu,
  ArrowRightLeft,
  Lightbulb,
} from 'lucide-react';
import { LogEntry, getRecentLogs, getLogsByDate, deleteLogs } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

type LogTab = 'recent' | 'byDate' | 'search';

const LogsViewer: React.FC = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<LogTab>('recent');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingDate, setDeletingDate] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      let data: LogEntry[];
      if (activeTab === 'recent') {
        data = await getRecentLogs(20);
      } else if (activeTab === 'byDate') {
        data = await getLogsByDate(selectedDate);
      } else {
        data = await getRecentLogs(50);
      }
      
      if (activeTab === 'search' && searchQuery) {
        data = data.filter(log => 
          log.operation_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          JSON.stringify(log.data).toLowerCase().includes(searchQuery.toLowerCase()) ||
          JSON.stringify(log.result).toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [activeTab, selectedDate, searchQuery]);

  const handleDelete = async (log: LogEntry) => {
    const date = log.timestamp.split('T')[0];
    setDeletingDate(date);
    try {
      await deleteLogs(date);
      setLogs(prev => prev.filter(l => l.timestamp.split('T')[0] !== date));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete logs');
    } finally {
      setDeletingDate(null);
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'agent_run':
        return <Cpu size={16} />;
      case 'tool_call':
        return <ArrowRightLeft size={16} />;
      case 'decision':
        return <Lightbulb size={16} />;
      case 'review':
        return <Info size={16} />;
      default:
        return <Info size={16} />;
    }
  };

  const getOperationLabel = (type: string) => {
    switch (type) {
      case 'agent_run':
        return 'Agent Run';
      case 'tool_call':
        return 'Tool Call';
      case 'decision':
        return 'Decision';
      case 'review':
        return 'Review';
      default:
        return type;
    }
  };

  const getLogTypeConfig = (log: LogEntry) => {
    if (!log.success) {
      return { icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' };
    }
    switch (log.operation_type) {
      case 'agent_run':
        return { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
      case 'tool_call':
        return { icon: ArrowRightLeft, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' };
      case 'decision':
        return { icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
      case 'review':
        return { icon: Info, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' };
      default:
        return { icon: Info, color: 't-label', bg: 'bg-tag border-divider' };
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
  };

  const tabs: { key: LogTab; label: string; icon: React.ReactNode }[] = [
    { key: 'recent', label: t.logs.recent, icon: <Clock size={14} /> },
    { key: 'byDate', label: t.logs.byDate, icon: <Calendar size={14} /> },
    { key: 'search', label: t.logs.search, icon: <Search size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-divider">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-cyan-400'
                : 't-muted hover:t-secondary'
            }`}
          >
            {tab.icon}
            {tab.label}
            {activeTab === tab.key && (
              <motion.div
                layoutId="tabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="p-4 border-b border-divider">
        {activeTab === 'byDate' && (
          <div className="flex items-center gap-2">
            <Calendar size={14} className="t-muted" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-dark px-3 py-2 text-sm w-full"
            />
          </div>
        )}
        {activeTab === 'search' && (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 t-muted" />
            <input
              type="text"
              placeholder={t.logs.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-dark pl-9 pr-3 py-2 text-sm w-full"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Clock size={32} className="t-faint" />
              </motion.div>
              <p className="text-xs t-muted mt-3">{t.logs.loading}</p>
            </div>
          ) : error ? (
            <div className="glass-card p-4 text-center">
              <AlertCircle size={24} className="text-rose-400 mx-auto mb-2" />
              <p className="text-sm t-label">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Info size={32} className="t-faint mb-2" />
              <p className="text-xs t-muted">{t.logs.noLogs}</p>
            </div>
          ) : (
            logs.map((log, index) => {
              const config = getLogTypeConfig(log);
              const isExpanded = expandedId === log.run_id;
              const date = log.timestamp.split('T')[0];
              
              return (
                <motion.div
                  key={`${log.run_id}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  layout
                  className={`glass-card overflow-hidden ${config.bg}`}
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : log.run_id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                        {getOperationIcon(log.operation_type)}
                      </div>
                      <div>
                        <div className="text-sm font-medium t-primary">{getOperationLabel(log.operation_type)}</div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs t-muted">
                          <span className="flex items-center gap-1">
                            <User size={10} />
                            {log.user_id}
                          </span>
                          <span className="flex items-center gap-1">
                            <Timer size={10} />
                            {formatDuration(log.duration)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs t-muted font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={16} className="t-label" />
                      ) : (
                        <ChevronDown size={16} className="t-label" />
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
                        <div className="px-4 pb-4 pt-0">
                          <div className="glass-card-inner p-3 mt-2">
                            <div className="text-xs t-muted mb-2">Input Data</div>
                            <pre className="text-xs t-secondary font-mono whitespace-pre-wrap max-h-32 overflow-auto">
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </div>
                          <div className="glass-card-inner p-3 mt-2">
                            <div className="text-xs t-muted mb-2">Result</div>
                            <pre className="text-xs t-secondary font-mono whitespace-pre-wrap max-h-32 overflow-auto">
                              {JSON.stringify(log.result, null, 2)}
                            </pre>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(log);
                            }}
                            disabled={deletingDate === date}
                            className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs hover:bg-rose-500/20 transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={12} />
                            {deletingDate === date ? t.logs.deleting : t.logs.delete}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LogsViewer;
