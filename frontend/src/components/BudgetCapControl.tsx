import React from 'react';
import { ShieldCheck, DollarSign, ShieldAlert } from 'lucide-react';

interface Props {
  budgetCap: number;
  onUpdateBudgetCap: (newCap: number) => void;
}

export const BudgetCapControl: React.FC<Props> = ({ budgetCap, onUpdateBudgetCap }) => {
  const presets = [0, 75, 150, 300, 500, 1000];
  const isZeroTrust = budgetCap === 0;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
            isZeroTrust ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
          }`}>
            {isZeroTrust ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Safety Spending Cap</h3>
            <p className="text-xs text-slate-500">
              {isZeroTrust ? 'Zero-Trust: 100% of orders require human approval' : 'Auto-buy under cap; prompt approval if over.'}
            </p>
          </div>
        </div>

        {/* Uncapped Editable Input */}
        <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 rounded-xl px-2.5 py-1 focus-within:ring-2 focus-within:ring-emerald-500">
          <DollarSign className="w-4 h-4 text-emerald-700 font-bold" />
          <input
            type="number"
            min="0"
            step="10"
            value={budgetCap}
            onChange={(e) => onUpdateBudgetCap(Math.max(0, Number(e.target.value) || 0))}
            className="w-20 bg-transparent text-emerald-800 font-extrabold text-base focus:outline-none text-right"
          />
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
        <span className="text-[11px] text-slate-400 font-medium shrink-0">Presets:</span>
        <div className="flex flex-wrap gap-1 justify-end">
          {presets.map((val) => (
            <button
              key={val}
              onClick={() => onUpdateBudgetCap(val)}
              className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                budgetCap === val
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {val === 0 ? '$0 (Strict)' : `$${val}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};