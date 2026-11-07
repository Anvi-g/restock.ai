import { useState, useEffect } from 'react';
import type { InventoryItem, SupplierQuote, SourcingResult } from './types';
import { 
  getInventory, 
  simulateLowInventory, 
  resetInventory, 
  runAgentSourcing, 
  getBudgetCap, 
  updateBudgetCap,
  switchProfile,
  createPayPalOrder,
  capturePayPalOrder
} from './services/api';
import { SourcingGrid } from './components/SourcingGrid';
import { BudgetCapControl } from './components/BudgetCapControl';
import { ApprovalCard } from './components/ApprovalCard';
import { AgentTerminal } from './components/AgentTerminal';
import { PayPalModal } from './components/PayPalModal';
import { AddItemModal } from './components/AddItemModal';
import { Bot, RefreshCw, AlertTriangle, CheckCircle, PackageSearch, ChevronDown, Plus } from 'lucide-react';

const PROFILES = [
  { key: 'coffee', name: 'Bean & Brew Roastery', type: 'Specialty Coffee Shop', icon: '☕', email: 'buyer-sandbox@restock.ai' },
  { key: 'tech', name: 'Apex Drone & Tech Labs', type: 'Electronics Repair', icon: '🚁', email: 'tech-buyer@restock.ai' },
  { key: 'retail', name: 'EcoBox Packaging Co', type: 'E-commerce Logistics', icon: '📦', email: 'shipping-buyer@restock.ai' },
];

export default function App() {
  const [inventory, setInventory] = useState<InventoryItem | null>(null);
  const [sourcing, setSourcing] = useState<SourcingResult | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<SupplierQuote | null>(null);
  const [budgetCap, setBudgetCap] = useState<number>(75);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [showPayPalModal, setShowPayPalModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [currentProfile, setCurrentProfile] = useState(PROFILES[0]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isBulkSelected, setIsBulkSelected] = useState(false);

  // Load inventory on mount
  useEffect(() => {
    fetchInventory();
    fetchBudgetCap();
  }, []);

    const fetchInventory = async () => {
    try {
      const res = await getInventory();
      setInventory(res.data);
    } catch (err) {
      console.warn("Backend not reachable yet:", err);
    }
  };

   const fetchBudgetCap = async () => {
    try {
      const res = await getBudgetCap();
      setBudgetCap(res.data.budget_cap);
    } catch (err) {
      console.warn("Could not fetch budget cap:", err);
    }
  };
  const handleUpdateBudgetCap = async (newCap: number) => {
    setBudgetCap(newCap);
    try {
      await updateBudgetCap(newCap);
    } catch (err) {
      console.error("Failed to sync budget cap:", err);
    }
  };

  const handleSimulateLow = async () => {
    const res = await simulateLowInventory();
    setInventory(res.data);
    setSourcing(null);
    setSelectedQuote(null);
    setIsBulkSelected(false);
  };

  const handleReset = async () => {
    const res = await resetInventory();
    setInventory(res.data);
    setSourcing(null);
    setSelectedQuote(null);
    setIsBulkSelected(false);
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

  const [isAutoExecuting, setIsAutoExecuting] = useState(false);

  const handleApproveAndPay = async () => {
    const currentQty = isBulkSelected && sourcing?.bulk_opportunity ? sourcing.bulk_opportunity.recommended_qty : sourcing?.quantity_needed || 0;
    const currentCost = isBulkSelected && sourcing?.bulk_opportunity ? sourcing.bulk_opportunity.total_cost : selectedQuote?.total_cost || 0;
    const exceedsCap = currentCost > budgetCap;

    // If over budget cap: Open review modal for human verification
    if (exceedsCap) {
      setShowPayPalModal(true);
      return;
    }

    // If under budget cap: Execute autonomously with zero manual sub-clicks!
    if (!inventory || !selectedQuote) return;
    setIsAutoExecuting(true);
    try {
      // 1. Agent creates PayPal order payload
      const orderRes = await createPayPalOrder({
        amount: currentCost,
        supplier_name: selectedQuote.supplier_name,
        item_name: inventory.name,
        quantity: currentQty,
      });

      // 2. Agent immediately captures pre-authorized payment
      const captureRes = await capturePayPalOrder({
        order_id: orderRes.data.order_id,
        quantity: currentQty,
      });

      // 3. Reconcile inventory and refresh state
      setInventory((prev) => (prev ? { ...prev, current_stock: captureRes.data.new_stock } : prev));
      setSourcing(null);
      setSelectedQuote(null);
      setIsBulkSelected(false);
      alert(`⚡ Autonomous Execution Complete!\n\nOrder of ${currentQty} ${inventory.unit} captured via PayPal.\nPayPal Transaction ID: ${captureRes.data.transaction_id}\nStock replenished to ${captureRes.data.new_stock} ${inventory.unit}!`);
    } catch (err) {
      console.error("Autonomous execution failed, falling back to manual modal:", err);
      setShowPayPalModal(true);
    } finally {
      setIsAutoExecuting(false);
    }
  };

  const handleSwitchProfile = async (profile: typeof PROFILES[0]) => {
    try {
      const res = await switchProfile(profile.key);
      setCurrentProfile(profile);
      setInventory(res.data.inventory);
      setSourcing(null);
      setSelectedQuote(null);
      setShowProfileMenu(false);
    } catch (err) {
      console.error("Failed to switch profile:", err);
    }
  };

  const isLowStock = inventory && inventory.current_stock <= inventory.min_threshold;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
            {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Restock.ai</h1>
            <p className="text-[11px] text-slate-500 font-medium">
              Autonomous inventory procurement with PayPal execution
            </p>
          </div>
        </div>

        {/* Right side: Demo Controls + Top-Right Buyer Profile */}
        <div className="flex items-center gap-3">
          {/* Demo Controls */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={handleSimulateLow}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Simulate Low Stock
            </button>
            <button
              onClick={handleReset}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Interactive Buyer Profile Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer text-left shadow-2xs"
            >
              <span className="text-base leading-none">{currentProfile.icon}</span>
              <div className="text-left text-xs">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-800 text-[11px] leading-tight">{currentProfile.name}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
                <span className="text-[10px] text-slate-400 font-mono block leading-none">{currentProfile.type}</span>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Business Environment
                </div>
                {PROFILES.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => handleSwitchProfile(p)}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-slate-50 transition-colors cursor-pointer ${
                      currentProfile.key === p.key ? 'bg-blue-50/70 text-blue-900 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span className="text-lg">{p.icon}</span>
                    <div className="text-xs">
                      <div className="font-bold text-slate-900 leading-tight">{p.name}</div>
                      <div className="text-[10px] text-slate-500">{p.type}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>
      {/* Main Dashboard Container */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Top Grid: Inventory Status + Budget Cap Guardrail */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Inventory Status (2 cols) */}
          {inventory && (
            <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tracked Item</span>
                  <button
                    onClick={() => setShowAddItemModal(true)}
                    className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <h2 className="text-lg font-bold text-slate-900">{inventory.name}</h2>
                <p className="text-xs text-slate-500">
                  Category: {inventory.category} {inventory.bulk_threshold_qty ? `• Custom Bulk Target: ${inventory.bulk_threshold_qty} ${inventory.unit}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-xs text-slate-400 block font-medium">Stock Level</span>
                  <span className={`text-2xl font-black ${isLowStock ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                    {inventory.current_stock} <span className="text-sm font-semibold text-slate-500">{inventory.unit}</span>
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
                      {loadingAgent ? 'Scanning...' : 'Trigger Agent'}
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
          {/* Budget Cap Guardrail (1 col) */}
          <BudgetCapControl
            budgetCap={budgetCap}
            onUpdateBudgetCap={handleUpdateBudgetCap}
          />
        </div>
        {/* AI Sourcing Results & AG Grid */}
        {sourcing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
                  <span>Supplier Market Comparison</span>
                  <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                    AG Grid Powered
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Deficit: {sourcing.quantity_needed} bags required. Comparing live quotes.
                </p>
              </div>
              {selectedQuote?.ai_rationale && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded-xl max-w-md shadow-xs">
                  <span className="font-bold">AI Rationale:</span> {selectedQuote.ai_rationale}
                </div>
              )}
            </div>
                        {/* Bulk Tier Discount Opportunity Banner */}
            {sourcing.bulk_opportunity?.is_available && (
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-4 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
                    💡
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                        Wholesale Bulk Tier Detected
                      </span>
                      <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                        Save ${sourcing.bulk_opportunity.estimated_savings.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {sourcing.bulk_opportunity.pitch}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsBulkSelected(!isBulkSelected)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                    isBulkSelected
                      ? 'bg-purple-600 text-white'
                      : 'bg-white hover:bg-purple-50 text-purple-700 border border-purple-300'
                  }`}
                >
                  {isBulkSelected ? '✓ Bulk Tier Applied (40 units)' : 'Upgrade to Bulk Tier'}
                </button>
              </div>
            )}
            {/* AG Grid */}
            <SourcingGrid
              quotes={sourcing.quotes}
              selectedSupplierId={selectedQuote?.supplier_id}
              onSelectSupplier={(quote) => setSelectedQuote(quote)}
            />
            {/* Human-in-the-Loop Decision Card */}
            {inventory && selectedQuote && (
              <ApprovalCard
              item={inventory}
              quantityNeeded={isBulkSelected && sourcing.bulk_opportunity ? sourcing.bulk_opportunity.recommended_qty : sourcing.quantity_needed}
              selectedQuote={
                isBulkSelected && sourcing.bulk_opportunity
                  ? { ...selectedQuote, total_cost: sourcing.bulk_opportunity.total_cost, unit_price: sourcing.bulk_opportunity.unit_price }
                  : selectedQuote
              }
              budgetCap={budgetCap}
              onApproveAndPay={handleApproveAndPay}
              isProcessing={isAutoExecuting}
            />
            )}
            {/* Agent Live Activity & Reasoning Terminal */}
            <AgentTerminal logs={sourcing.agent_logs} isStreaming={loadingAgent} />
          </div>
        )}
      </main>

      {/* Add Inventory Item Modal */}
      {showAddItemModal && (
        <AddItemModal
          onClose={() => setShowAddItemModal(false)}
          onItemAdded={(newItem) => {
            setInventory(newItem);
            setSourcing(null);
            setSelectedQuote(null);
          }}
        />
      )}

      {/* PayPal Orders API Checkout Modal */}
      {showPayPalModal && inventory && selectedQuote && sourcing && (
                <PayPalModal
          item={inventory}
          quantity={isBulkSelected && sourcing.bulk_opportunity ? sourcing.bulk_opportunity.recommended_qty : sourcing.quantity_needed}
          quote={
            isBulkSelected && sourcing.bulk_opportunity
              ? { ...selectedQuote, total_cost: sourcing.bulk_opportunity.total_cost, unit_price: sourcing.bulk_opportunity.unit_price }
              : selectedQuote
          }
          onClose={() => setShowPayPalModal(false)}
          onSuccess={(newStock) => {
            setInventory((prev) => (prev ? { ...prev, current_stock: newStock } : prev));
            setSourcing(null);
            setSelectedQuote(null);
            setShowPayPalModal(false);
          }}
        />
      )}
    </div>
  );
}