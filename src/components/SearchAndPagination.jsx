import React from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export function SearchBar({ searchQuery, setSearchQuery }) {
  return (
    <div className="relative flex-1 max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search size={18} className="text-slate-500" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-900/50 text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
        placeholder="Search tasks by name, ID, or assignee..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
}

export function Pagination({ currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, totalItems }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-6">
      <div className="flex items-center gap-4 text-sm text-slate-400">
        <span>
          Showing <span className="font-medium text-slate-200">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
          <span className="font-medium text-slate-200">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
          <span className="font-medium text-slate-200">{totalItems}</span> results
        </span>
        
        <div className="flex items-center gap-2">
          <span>Items per page:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1); // Reset to first page when changing page size
            }}
            className="bg-slate-900 border border-slate-700 rounded text-slate-300 text-sm py-1 px-2 focus:outline-none focus:border-indigo-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="p-1 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        
        <span className="text-sm font-medium text-slate-300 px-4">
          Page {currentPage} of {Math.max(1, totalPages)}
        </span>

        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="p-1 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
