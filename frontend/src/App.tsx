import { useState, useEffect } from 'react';
import type { InventoryItem, SupplierQuote, SourcingResult } from './types';
import { getInventory, simulateLowInventory, resetInventory, runAgentSourcing } from './services/api';
import { SourcingGrid } from './components/SourcingGrid';
import { Bot, RefreshCw, AlertTriangle, CheckCircle, PackageSearch } from 'lucide-react';

export default function App() {
  const [inventory, setInventory] = useState<InventoryItem | null>(null);
  const [sourcing, setSourcing] = useState<SourcingResult | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<SupplierQuote | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(false);

  // Load inventory on mount
  useEffect(() => {
    fetchInventory();
  }, []);

    const fetchInventory = async () => {
    try {
      const res = await getInventory();
      setInventory(res.data);
    } catch (err) {
      console.warn("Backend not reachable yet:", err);
    }
  };

  const handleSimulateLow = async () => {
    const res = await simulateLowInventory();
    setInventory(res.data);
    setSourcing(null);
    setSelectedQuote(null);
  };

  const handleReset = async () => {
    const res = await resetInventory();
    setInventory(res.data);
    setSourcing(null);
    setSelectedQuote(null);
  };

  const handleWakeAgent = async () => {
    setLoadingAgent(true);
    try {
      const res = await runAgentSourcing();
      setSourcing(res.data);
      const topPick = res.data.quotes.find((q) => q.is_recommended);
      if (topPick) setSelectedQuote(topPick);
    } finally {
      setLoadingAgent(false);
    }
  };

  const isLowStock = inventory && inventory.current_stock <= inventory.min_threshold;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Restock.ai</h1>
            <p className="text-xs text-slate-500 font-medium">
              Autonomous, budget-capped inventory procurement with PayPal execution
            </p>
          </div>
        </div>

        {/* Demo Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateLow}
            className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Simulate Low Inventory
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Inventory Status Card */}
        {inventory && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tracked Item</span>
              <h2 className="text-lg font-bold text-slate-900">{inventory.name}</h2>
              <p className="text-xs text-slate-500">Category: {inventory.category}</p>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">Current Stock</span>
                <span className={`text-2xl font-black ${isLowStock ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                  {inventory.current_stock} <span className="text-sm font-semibold text-slate-500">{inventory.unit}</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">Optimal Target</span>
                <span className="text-2xl font-black text-slate-800">
                  {inventory.optimal_stock} <span className="text-sm font-semibold text-slate-500">{inventory.unit}</span>
                </span>
              </div>
              <div>
                {isLowStock ? (
                  <button
                    onClick={handleWakeAgent}
                    disabled={loadingAgent}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
                  >
                    <PackageSearch className="w-4 h-4" />
                    {loadingAgent ? 'Agent Scanning Suppliers...' : 'Trigger Sourcing Agent'}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold">
                    <CheckCircle className="w-4 h-4" /> Stock Healthy
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Sourcing Results & AG Grid */}
        {sourcing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
                  <span>Supplier Market Comparison</span>
                  <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                    Powered by AG Grid
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Deficit detected: {sourcing.quantity_needed} bags required. Comparing live quotes across 4 supplier networks.
                </p>
              </div>

              {selectedQuote?.ai_rationale && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded-xl max-w-md shadow-xs">
                  <span className="font-bold">AI Analysis:</span> {selectedQuote.ai_rationale}
                </div>
              )}
            </div>

            {/* AG Grid Component */}
            <SourcingGrid
              quotes={sourcing.quotes}
              selectedSupplierId={selectedQuote?.supplier_id}
              onSelectSupplier={(quote) => setSelectedQuote(quote)}
            />
          </div>
        )}
      </main>
    </div>
  );
}