import React from 'react';
import { ShieldCheck, DollarSign, ShieldAlert } from 'lucide-react';

interface Props {
  budgetCap: number;
  onUpdateBudgetCap: (newCap: number) => void;
}

export const BudgetCapControl: React.FC<Props> = ({ budgetCap, onUpdateBudgetCap }) => {
  const presets = [0, 50, 100, 200, 500];
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
            <h3 className="text-sm font-bold text-slate-900">Autonomous Safety Guardrail</h3>
            <p className="text-xs text-slate-500">
              {isZeroTrust ? 'Zero-Trust: Human must approve 100% of orders' : 'Auto-buy under cap; prompt approval if over.'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end text-emerald-700 font-extrabold text-lg bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
            <DollarSign className="w-4 h-4 -mr-1" />
            {budgetCap}
          </div>
          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
            ≈ ₹{(budgetCap * 84).toLocaleString()}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <input
          type="range"
          min="0"
          max="600"
          step="10"
          value={budgetCap}
          onChange={(e) => onUpdateBudgetCap(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
        />
        <div className="flex items-center justify-between gap-2 pt-1">
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
    </div>
  );
};