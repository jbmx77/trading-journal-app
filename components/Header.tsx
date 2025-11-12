import React from 'react';
import { PlusIcon, CloudImportIcon, SyncIcon } from './Icons';

interface HeaderProps {
  onAddTrade: () => void;
  onImportFromGoogleSheet: () => void;
  onSync: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAddTrade, onImportFromGoogleSheet, onSync }) => {
  return (
    <header className="flex flex-col md:flex-row justify-between items-center mb-8">
      <h1 className="text-4xl font-bold text-text_primary mb-4 md:mb-0">
        Trading Journal
      </h1>
      <div className="flex items-center space-x-2">
        <button
          onClick={onAddTrade}
          className="flex items-center bg-primary hover:bg-primary_hover text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
        >
          <PlusIcon />
          <span className="ml-2">Add Trade</span>
        </button>
        <button
          onClick={onImportFromGoogleSheet}
          className="bg-secondary hover:bg-secondary_hover text-text_primary font-semibold p-2.5 rounded-lg transition-colors duration-200"
          title="Import from Sheet"
          aria-label="Import from Google Sheet"
        >
          <CloudImportIcon />
        </button>
        <button
          onClick={onSync}
          className="bg-secondary hover:bg-secondary_hover text-text_primary font-semibold p-2.5 rounded-lg transition-colors duration-200"
          title="Sync & Backup"
          aria-label="Sync and Backup"
        >
          <SyncIcon />
        </button>
      </div>
    </header>
  );
};

export default Header;