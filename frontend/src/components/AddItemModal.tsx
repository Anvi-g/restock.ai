import React, { useState } from 'react';
import type { InventoryItem } from '../types';
import { addInventoryItem } from '../services/api';
import { Plus, X, Package, Sparkles } from 'lucide-react';

interface Props {
  onClose: () => void;
  onItemAdded: (item: InventoryItem) => void;
}

export const AddItemModal: React.FC<Props> = ({ onClose, onItemAdded }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Perishables / General');
  const [currentStock, setCurrentStock] = useState(5);
  const [minThreshold, setMinThreshold] = useState(15);
  const [optimalStock, setOptimalStock] = useState(40);
  const [unit, setUnit] = useState('units');
  const [bulkThresholdQty, setBulkThresholdQty] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await addInventoryItem({
        name: name.trim(),
        category,
        current_stock: Number(currentStock),
        min_threshold: Number(minThreshold),
        optimal_stock: Number(optimalStock),
        unit: unit.trim() || 'units',
        bulk_threshold_qty: Number(bulkThresholdQty) || 40,
        bulk_discount_rate: 0.25,
      });

      onItemAdded(res.data);
      onClose();
    } catch (err) {
      console.error('Failed to add inventory item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Register New Inventory Item</h3>
              <p className="text-[10px] text-slate-400">Configure custom thresholds & bulk procurement rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Product / Supply Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Ethiopian Yirgacheffe Beans (1kg)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                placeholder="e.g. Raw Ingredients"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Unit of Measure</label>
              <input
                type="text"
                placeholder="e.g. bags, cartons, units"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Current Stock</label>
              <input
                type="number"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Min Threshold</label>
              <input
                type="number"
                min="1"
                value={minThreshold}
                onChange={(e) => setMinThreshold(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Optimal Stock</label>
              <input
                type="number"
                min="1"
                value={optimalStock}
                onChange={(e) => setOptimalStock(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-purple-50/70 border border-purple-200 p-3.5 rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Custom Bulk Tier Target</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Quantity where supplier wholesale discount activates:
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min="10"
                value={bulkThresholdQty}
                onChange={(e) => setBulkThresholdQty(Number(e.target.value))}
                className="w-24 px-3 py-1.5 text-xs bg-white border border-purple-300 rounded-lg font-extrabold text-purple-950 focus:outline-none"
              />
              <span className="text-xs text-purple-800 font-semibold">{unit} (25% off target)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Saving...' : 'Save & Track'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
