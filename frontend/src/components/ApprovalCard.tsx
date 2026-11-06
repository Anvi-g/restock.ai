import React from 'react';
import type { SupplierQuote, InventoryItem } from '../types';
import { AlertCircle, CheckCircle, ArrowRight, ShieldAlert, Zap } from 'lucide-react';

interface Props {
  item: InventoryItem;
  quantityNeeded: number;
  selectedQuote: SupplierQuote;
  budgetCap: number;
  onApproveAndPay: () => void;
  isProcessing?: boolean;
}

export const ApprovalCard: React.FC<Props> = ({
  item,
  quantityNeeded,
  selectedQuote,
  budgetCap,
  onApproveAndPay,
  isProcessing = false,
}) => {
  const exceedsCap = selectedQuote.total_cost > budgetCap;
  const difference = (selectedQuote.total_cost - budgetCap).toFixed(2);

  return (
    <div
      className={`p-6 rounded-2xl border transition-all ${
        exceedsCap
          ? 'bg-amber-50/60 border-amber-300 shadow-sm'
          : 'bg-emerald-50/60 border-emerald-300 shadow-sm'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Decision Context */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {exceedsCap ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-200 text-amber-900 border border-amber-300">
                <ShieldAlert className="w-3.5 h-3.5" /> Human-in-the-Loop Required
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900 border border-emerald-300">
                <Zap className="w-3.5 h-3.5 fill-emerald-800" /> Autonomous Pre-Authorized
              </span>
            )}
            <span className="text-xs text-slate-500 font-medium">
              Supplier: <strong className="text-slate-800">{selectedQuote.supplier_name}</strong>
            </span>
          </div>

          <h4 className="text-base font-bold text-slate-900">
            {exceedsCap ? (
              <>Purchase exceeds your autonomous cap by <span className="text-amber-700">${difference}</span></>
            ) : (
              <>Within safety cap (${budgetCap.toFixed(2)}) — Ready for execution</>
            )}
          </h4>

          <p className="text-xs text-slate-600 max-w-xl">
            Ordering <strong>{quantityNeeded} {item.unit}</strong> of <em>{item.name}</em> at{' '}
            <strong>${selectedQuote.unit_price.toFixed(2)}/unit</strong> + ${selectedQuote.shipping_fee.toFixed(2)} shipping. 
            Delivery ETA: <strong>{selectedQuote.lead_time_days} days</strong>.
          </p>
        </div>

        {/* Right: Cost & Action Button */}
        <div className="flex items-center gap-5 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
          <div className="text-right">
            <span className="text-xs text-slate-400 block font-medium">Total Transaction</span>
            <span className="text-2xl font-black text-slate-900">
              ${selectedQuote.total_cost.toFixed(2)}
            </span>
          </div>

          <button
            onClick={onApproveAndPay}
            disabled={isProcessing}
            className={`px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer ${
              exceedsCap
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30'
            }`}
          >
            {isProcessing ? (
              'Contacting PayPal...'
            ) : exceedsCap ? (
              <>
                <AlertCircle className="w-4 h-4" /> Approve & Pay
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> Auto-Execute via PayPal <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};