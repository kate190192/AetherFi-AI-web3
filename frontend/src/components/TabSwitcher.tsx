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

export type TabType = 'results' | 'journal' | 'review' | 'market' | 'performance';

interface TabSwitcherProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: 'results', label: 'Results', icon: <FileText size={14} /> },
  { key: 'performance', label: 'Performance', icon: <Target size={14} /> },
  { key: 'journal', label: 'Journal', icon: <BookOpen size={14} /> },
  { key: 'review', label: 'Review', icon: <BarChart3 size={14} /> },
  { key: 'market', label: 'Market', icon: <TrendingUp size={14} /> },
];

const TabSwitcher: React.FC<TabSwitcherProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex border-b border-slate-700/30 bg-slate-900/50 backdrop-blur-sm">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium transition-all relative flex-1 justify-center ${
            activeTab === tab.key
              ? 'text-cyan-400'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          {tab.icon}
          {tab.label}
          {activeTab === tab.key && (
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