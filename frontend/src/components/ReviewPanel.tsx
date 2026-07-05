'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  RotateCcw,
  BarChart3,
  Target,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { ReviewResult, getReviewHistory, analyzeReview, iterateReview } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface ReviewPanelProps {
  runId?: string;
}

const ReviewPanel: React.FC<ReviewPanelProps> = ({ runId }) => {
  const { t } = useI18n();
  const [history, setHistory] = useState<ReviewResult[]>([]);
  const [selectedRun, setSelectedRun] = useState<string>('');
  const [analysis, setAnalysis] = useState<ReviewResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [iterating, setIterating] = useState(false);
  const [improvementNote, setImprovementNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (runId) {
      setSelectedRun(runId);
    }
  }, [runId]);

  const fetchHistory = async () => {
    try {
      const data = await getReviewHistory();
      setHistory(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0 && !selectedRun) {
        setSelectedRun(data[0].run_id);
      }
    } catch (err) {
      setHistory([]);
      setError(err instanceof Error ? err.message : 'Failed to fetch review history');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedRun) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeReview(selectedRun);
      // 适配后端格式: analysis.accuracy_score → accuracy, comparison_details → differences
      const anyResult = result as any;
      const analysisData = anyResult.analysis || anyResult;
      const accuracy = analysisData.accuracy_score ?? anyResult.accuracy ?? 0;
      const details = analysisData.comparison_details || {};
      const differences = Object.entries(details).map(([metric, info]: [string, any]) => ({
        metric,
        simulated: parseFloat(info.simulated_price) || 0,
        actual: parseFloat(info.real_price) || 0,
        deviation: parseFloat(info.deviation) || 0,
      }));
      setAnalysis({
        ...result,
        accuracy,
        differences: differences.length > 0 ? differences : anyResult.differences || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze review');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleIterate = async () => {
    if (!selectedRun || !improvementNote.trim()) return;
    setIterating(true);
    try {
      await iterateReview({
        run_id: selectedRun,
        improvements: [improvementNote.trim()],
        notes: improvementNote.trim(),
      });
      setImprovementNote('');
      await fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create iteration');
    } finally {
      setIterating(false);
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-emerald-400';
    if (accuracy >= 50) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getAccuracyBg = (accuracy: number) => {
    if (accuracy >= 80) return 'from-emerald-500/20 to-emerald-500/5';
    if (accuracy >= 50) return 'from-amber-500/20 to-amber-500/5';
    return 'from-rose-500/20 to-rose-500/5';
  };

  const getAccuracy = (a: ReviewResult) => {
    return a.accuracy ?? a.analysis?.accuracy_score ?? 0;
  };

  const getDifferences = (a: ReviewResult) => {
    return a.differences ?? [];
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-divider">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium t-secondary uppercase tracking-wider">
            {t.review.selectRun}
          </span>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedRun}
            onChange={(e) => {
              setSelectedRun(e.target.value);
              setAnalysis(null);
            }}
            className="input-dark px-3 py-2 text-sm flex-1"
          >
            <option value="">{t.review.selectPlaceholder}</option>
            {history.map((item) => (
              <option key={item.run_id} value={item.run_id}>
                {item.run_id.substring(0, 8)}... ({new Date(item.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>
          <button
            onClick={handleAnalyze}
            disabled={!selectedRun || analyzing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            {t.review.analyze}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          {error ? (
            <div className="glass-card p-4 text-center">
              <span className="text-rose-400 text-sm">{error}</span>
            </div>
          ) : analyzing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 size={32} className="text-cyan-400" />
              </motion.div>
              <p className="text-xs t-label mt-3">{t.review.analyzing}</p>
            </div>
          ) : analysis ? (
            <>
              <motion.div
                key="accuracy"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card p-5 bg-gradient-to-br ${getAccuracyBg(getAccuracy(analysis))}`}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Target size={14} className="text-cyan-400" />
                  <span className="text-xs font-medium t-secondary uppercase tracking-wider">
                    {t.review.accuracy}
                  </span>
                </div>
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <div className="text-4xl font-bold font-mono">
                      <span className={getAccuracyColor(getAccuracy(analysis))}>
                        {Math.round(getAccuracy(analysis))}%
                      </span>
                    </div>
                    <div className="text-xs t-label mt-1">
                      {getAccuracy(analysis) >= 80 ? t.review.highAccuracy : 
                       getAccuracy(analysis) >= 50 ? t.review.mediumAccuracy : t.review.lowAccuracy}
                    </div>
                  </div>
                  <div className="w-20 h-20 relative">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke="rgba(148, 163, 184, 0.1)"
                        strokeWidth="8"
                      />
                      <motion.circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke={getAccuracy(analysis) >= 80 ? '#10b981' : getAccuracy(analysis) >= 50 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="8"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: getAccuracy(analysis) / 100 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold t-secondary">ACC</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                key="differences"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={14} className="text-purple-400" />
                  <span className="text-xs font-medium t-secondary uppercase tracking-wider">
                    {t.review.differences}
                  </span>
                </div>
                <div className="space-y-3">
                  {getDifferences(analysis).map((diff, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + idx * 0.1 }}
                      className="glass-card-inner p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium t-primary">{diff.metric}</span>
                        <div className={`flex items-center gap-1 text-xs ${
                          diff.deviation >= 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {diff.deviation >= 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                          {Math.abs(diff.deviation).toFixed(2)}%
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="t-label">{t.review.simulated}</span>
                          <span className="t-primary ml-2 font-mono">{diff.simulated.toFixed(2)}</span>
                        </div>
                        <div className="w-px h-4 border-divider" />
                        <div>
                          <span className="t-label">{t.review.actual}</span>
                          <span className="text-cyan-400 ml-2 font-mono">{diff.actual.toFixed(2)}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                key="recommendations"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb size={14} className="text-amber-400" />
                  <span className="text-xs font-medium t-secondary uppercase tracking-wider">
                    {t.review.recommendations}
                  </span>
                </div>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <ChevronRight size={14} className="text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-sm t-secondary">{rec}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                key="iterate"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass-card p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <RotateCcw size={14} className="text-blue-400" />
                  <span className="text-xs font-medium t-secondary uppercase tracking-wider">
                    {t.review.createIteration}
                  </span>
                </div>
                <textarea
                  value={improvementNote}
                  onChange={(e) => setImprovementNote(e.target.value)}
                  placeholder={t.review.iterationPlaceholder}
                  className="input-dark w-full p-3 text-sm resize-none h-24 mb-3"
                />
                <button
                  onClick={handleIterate}
                  disabled={!improvementNote.trim() || iterating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {iterating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RotateCcw size={14} />
                  )}
                  {t.review.saveIteration}
                </button>
              </motion.div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <BarChart3 size={40} className="t-muted mb-4" />
              <p className="text-sm t-label text-center">
                {t.review.selectAndAnalyze}
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ReviewPanel;