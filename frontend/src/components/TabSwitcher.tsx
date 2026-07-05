'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  BookOpen,
  BarChart3,
  TrendingUp,
  Target,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

export type TabType = 'results' | 'journal' | 'review' | 'market' | 'performance';

interface TabSwitcherProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabIcons: Record<TabType, React.ReactNode> = {
  results: <FileText size={14} />,
  performance: <Target size={14} />,
  journal: <BookOpen size={14} />,
  review: <BarChart3 size={14} />,
  market: <TrendingUp size={14} />,
};

const tabKeys: TabType[] = ['results', 'performance', 'journal', 'review', 'market'];

const TabSwitcher: React.FC<TabSwitcherProps> = ({ activeTab, onTabChange }) => {
  const { t } = useI18n();

  return (
    <div className="flex border-b border-slate-700/30 bg-slate-900/50 backdrop-blur-sm">
      {tabKeys.map((key) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-all relative flex-1 justify-center ${
            activeTab === key
              ? 'text-cyan-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {tabIcons[key]}
          {t.tabs[key as keyof typeof t.tabs]}
          {activeTab === key && (
            <motion.div
              layoutId="tabIndicator"
              className="absolute bottom-0 left-1 right-1 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
};

export default TabSwitcher;
