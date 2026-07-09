import React from 'react';
import type { CategoryType } from '../../types';

interface Tab {
  id: CategoryType;
  label: string;
}

interface CategoryTabsProps {
  activeCategory: CategoryType;
  onChange: (category: CategoryType) => void;
  tabs: Tab[];
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({ activeCategory, onChange, tabs }) => {

  return (
    <div className="flex bg-cyber-card border border-cyber-border rounded-xl p-1 gap-1 mb-4 select-none">
      {tabs.map((tab) => {
        const active = activeCategory === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-300
              ${active
                ? 'bg-gradient-to-r from-cyber-purple to-cyber-cyan text-white shadow-md'
                : 'text-gray-400 hover:text-white'
              }
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
