import React from 'react';

type Tab = 'dashboard' | 'tradeList' | 'aiAudit' | 'liveTrading';

interface TabNavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'tradeList', label: 'Trade List' },
    { id: 'aiAudit', label: 'AI Audit' },
    { id: 'liveTrading', label: 'Live Trading' },
  ];

  return (
    <div className="p-1 bg-secondary rounded-lg inline-flex items-center">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              px-6 py-2 rounded-md font-semibold text-sm transition-colors duration-200 focus:outline-none
              ${
                activeTab === tab.id
                  ? 'bg-surface_hover text-text_primary shadow'
                  : 'text-text_secondary hover:text-text_primary'
              }
            `}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
    </div>
  );
};

export default TabNavigation;