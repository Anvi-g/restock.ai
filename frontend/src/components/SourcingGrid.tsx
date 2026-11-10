import React, { useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { SupplierQuote } from '../types';
import { Sparkles, Clock, Star, CheckCircle2, Search, TrendingDown } from 'lucide-react';

// Register AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface Props {
  quotes: SupplierQuote[];
  selectedSupplierId?: string;
  onSelectSupplier: (quote: SupplierQuote) => void;
}

export const SourcingGrid: React.FC<Props> = ({ quotes, selectedSupplierId, onSelectSupplier }) => {
  const [quickFilterText, setQuickFilterText] = useState(''); 
  const columnDefs = useMemo<ColDef<SupplierQuote>[]>(() => [
    {
      headerName: 'Supplier',
      field: 'supplier_name',
      flex: 1.5,
      cellRenderer: (params: ICellRendererParams<SupplierQuote>) => {
        const data = params.data;
        if (!data) return null;
        return (
          <div className="flex items-center gap-2 py-1">
            <span className="font-semibold text-gray-900">{data.supplier_name}</span>
            {data.is_recommended && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                <Sparkles className="w-3 h-3 text-amber-600 fill-amber-500" />
                AI Top Pick
              </span>
            )}
          </div>
        );
      },
    },
    {
      headerName: 'Unit Price',
      field: 'unit_price',
      width: 120,
      valueFormatter: (params) => `$${params.value?.toFixed(2)}`,
    },
    {
      headerName: 'Shipping',
      field: 'shipping_fee',
      width: 110,
      valueFormatter: (params) => `$${params.value?.toFixed(2)}`,
    },
    {
      headerName: 'Total Cost',
      field: 'total_cost',
      width: 130,
      cellRenderer: (params: ICellRendererParams<SupplierQuote>) => (
        <span className="font-bold text-gray-900">${params.value?.toFixed(2)}</span>
      ),
      sort: 'asc', // Default sort by lowest total price
    },
    {
      headerName: 'Savings vs Avg',
      field: 'savings_vs_avg',
      width: 145,
      cellRenderer: (params: ICellRendererParams<SupplierQuote>) => {
        const savings = params.value ?? 0;
        if (savings > 0) {
          return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <TrendingDown className="w-3 h-3" /> -${savings.toFixed(2)}
            </span>
          );
        }
        return <span className="text-xs text-slate-400">+${Math.abs(savings).toFixed(2)}</span>;
      },
    },
    {
      headerName: 'Delivery Speed',
      field: 'lead_time_days',
      width: 140,
      cellRenderer: (params: ICellRendererParams<SupplierQuote>) => {
        const days = params.value;
        const color =
          days <= 1
            ? 'bg-purple-100 text-purple-700 border-purple-200'
            : days <= 3
            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
            : 'bg-gray-100 text-gray-600 border-gray-200';
        return (
          <div className="flex items-center h-full">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
              <Clock className="w-3 h-3" />
              {days === 1 ? 'Next Day' : `${days} Days`}
            </span>
          </div>
        );
      },
    },
    {
      headerName: 'Wholesale Tier',
      field: 'bulk_discount_rate',
      width: 160,
      cellRenderer: (params: ICellRendererParams<SupplierQuote>) => {
        const data = params.data;
        if (!data || !data.bulk_threshold_qty || !data.bulk_discount_rate) return null;
        const pct = Math.round(data.bulk_discount_rate * 100);
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200 shadow-2xs">
            {pct}% OFF @ {data.bulk_threshold_qty} units
          </span>
        );
      },
    },
    {
      headerName: 'Reliability',
      field: 'rating',
      width: 130,
      cellRenderer: (params: ICellRendererParams<SupplierQuote>) => (
        <div className="flex items-center gap-1 text-amber-500 font-medium">
          <Star className="w-4 h-4 fill-amber-400" />
          <span className="text-gray-700 text-sm">{params.value?.toFixed(1)} / 5.0</span>
        </div>
      ),
    },
    {
      headerName: 'Action',
      width: 140,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams<SupplierQuote>) => {
        const data = params.data;
        if (!data || data.supplier_id === 'pinned_avg') return null;
        const isSelected = selectedSupplierId === data.supplier_id;
        return (
          <div className="flex items-center h-full">
            <button
              onClick={() => onSelectSupplier(data)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
              }`}
            >
              {isSelected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                </>
              ) : (
                'Choose'
              )}
            </button>
          </div>
        );
      },
    },
  ], [selectedSupplierId, onSelectSupplier]);

  // Calculate Market Benchmark Averages for the Pinned Bottom Row
  const pinnedBottomRowData = useMemo(() => {
    if (!quotes || quotes.length === 0) return [];
    const count = quotes.length;
    const avgPrice = quotes.reduce((acc, q) => acc + q.unit_price, 0) / count;
    const avgShipping = quotes.reduce((acc, q) => acc + q.shipping_fee, 0) / count;
    const avgTotal = quotes.reduce((acc, q) => acc + q.total_cost, 0) / count;
    const avgLead = Math.round(quotes.reduce((acc, q) => acc + q.lead_time_days, 0) / count);
    const avgRating = quotes.reduce((acc, q) => acc + q.rating, 0) / count;

    return [
      {
        supplier_id: 'pinned_avg',
        supplier_name: '📊 Market Benchmark Average',
        unit_price: avgPrice,
        shipping_fee: avgShipping,
        total_cost: avgTotal,
        lead_time_days: avgLead,
        rating: avgRating,
        is_recommended: false,
        savings_vs_avg: 0,
      },
    ];
  }, [quotes]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  return (
    <div className="space-y-3">
      {/* AG Grid Quick Search Toolbar */}
      <div className="flex items-center justify-between">
        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Quick search suppliers..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 shadow-2xs"
          />
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          Showing {quotes.length} live supplier quotes
        </span>
      </div>
      {/* AG Grid Container */}
      <div className="ag-theme-quartz w-full h-[320px] rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <AgGridReact
          rowData={quotes}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilterText}
          pinnedBottomRowData={pinnedBottomRowData}
          animateRows={true}
          rowSelection="single"
        />
      </div>
    </div>
  );
};