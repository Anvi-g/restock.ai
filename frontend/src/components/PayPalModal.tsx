import React, { useState, useEffect } from 'react';
import type { SupplierQuote, InventoryItem } from '../types';
import { createPayPalOrder, capturePayPalOrder, downloadReceipt } from '../services/api';
import { CheckCircle2, ShieldCheck, Loader2, X, ArrowRight, Download } from 'lucide-react';

interface Props {
  item: InventoryItem;
  quantity: number;
  quote: SupplierQuote;
  onClose: () => void;
  onSuccess: (newStock: number, transactionId: string) => void;
  initialStep?: 'REVIEW' | 'SUCCESS';
  initialOrderData?: { orderId: string; txnId: string; newStock: number };
}

export const PayPalModal: React.FC<Props> = ({
  item,
  quantity,
  quote,
  onClose,
  onSuccess,
  initialStep = 'REVIEW',
  initialOrderData,
}) => {
  const [step, setStep] = useState<'REVIEW' | 'CREATING' | 'READY' | 'CAPTURING' | 'SUCCESS'>(initialStep);
  const [orderId, setOrderId] = useState<string>(initialOrderData?.orderId || '');
  const [txnId, setTxnId] = useState<string>(initialOrderData?.txnId || '');
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [capturedStock, setCapturedStock] = useState<number | null>(initialOrderData?.newStock ?? null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Auto-download official PDF receipt on successful settlement
  useEffect(() => {
    if (step === 'SUCCESS' && txnId) {
      const timer = setTimeout(() => {
        handleDownloadReceipt();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [step, txnId]);

  const handleCreateOrder = async () => {
    setStep('CREATING');
    try {
      const res = await createPayPalOrder({
        amount: quote.total_cost,
        supplier_name: quote.supplier_name,
        item_name: item.name,
        quantity: quantity,
      });

      setOrderId(res.data.order_id);
      setIsSimulated(res.data.mode === 'simulation');
      setStep('READY');
    } catch (err) {
      console.error('Failed to create PayPal order:', err);
      setStep('REVIEW');
    }
  };

  const handleCapture = async () => {
    setStep('CAPTURING');
    try {
      const res = await capturePayPalOrder({
        order_id: orderId,
        quantity: quantity,
      });

      setTxnId(res.data.transaction_id);
      setCapturedStock(res.data.new_stock);
      setStep('SUCCESS');
    } catch (err) {
      console.error('Failed to capture PayPal payment:', err);
      setStep('READY');
    }
  };

  const handleClose = () => {
    if (step === 'SUCCESS' && capturedStock !== null) {
      onSuccess(capturedStock, txnId);
    }
    onClose();
  };

  const handleDownloadReceipt = async () => {
    setIsDownloading(true);
    try {
      await downloadReceipt({
        supplier_name: quote.supplier_name,
        item_name: item.name,
        quantity: quantity,
        unit: item.unit,
        unit_price: quote.unit_price,
        shipping_fee: quote.shipping_fee,
        total_cost: quote.total_cost,
        order_id: orderId,
        transaction_id: txnId,
      });
    } catch (err) {
      console.error('Failed to download receipt:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0070BA] flex items-center justify-center font-black text-sm tracking-tighter text-white shadow-xs">
              PP
            </div>
            <div>
              <h3 className="text-sm font-bold">PayPal Orders API v2 Execution</h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {isSimulated ? 'Sandbox Simulation Environment' : 'Live PayPal Sandbox Connected'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {step === 'REVIEW' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Beneficiary (Supplier):</span>
                  <strong className="text-slate-900">{quote.supplier_name}</strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Item & Volume:</span>
                  <strong className="text-slate-900">{quantity}x {item.name}</strong>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Rate Breakdown:</span>
                  <span className="text-slate-700">${quote.unit_price.toFixed(2)}/unit + ${quote.shipping_fee.toFixed(2)} shipping</span>
                </div>
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between text-sm font-bold text-slate-900">
                  <span>Total Order Authorization:</span>
                  <span className="text-emerald-700">${quote.total_cost.toFixed(2)} USD</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-blue-50 border border-blue-200 p-3 rounded-xl">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  The agent will create a live transaction on the <strong>PayPal Orders API</strong> with <code>intent: CAPTURE</code>.
                </span>
              </div>

              <button
                onClick={handleCreateOrder}
                className="w-full py-3 bg-[#0070BA] hover:bg-[#003087] text-white rounded-xl font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                Generate PayPal Order Payload <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 'CREATING' && (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Communicating with PayPal Sandbox API...</p>
            </div>
          )}

          {step === 'READY' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                  PayPal Order Created
                </span>
                <div className="font-mono text-xs font-bold text-slate-900">Order ID: {orderId}</div>
                <p className="text-[11px] text-slate-600">
                  Payload verified and registered in PayPal Sandbox. Ready for execution.
                </p>
              </div>

              <button
                onClick={handleCapture}
                className="w-full py-3.5 bg-[#FFC439] hover:bg-[#F2BA36] active:bg-[#E5B030] text-slate-900 font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-[#E0AC30]"
              >
                {/* Official PayPal Monogram & Wordmark Vector */}
                <svg className="h-5 w-auto" viewBox="0 0 85 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.4 2.8H2.8C2.3 2.8 1.9 3.2 1.8 3.7L0 15.3C-0.1 15.6 0.2 16 0.6 16H3.2L4.2 9.5C4.3 9.1 4.7 8.7 5.1 8.7H7.3C10.4 8.7 12.4 7.2 12.8 4.3C13.2 2 11.4 2.8 7.4 2.8Z" fill="#003087"/>
                  <path d="M10.8 7.2H8.6C8.2 7.2 7.8 7.6 7.7 8L6.4 16.3L5.9 19.3C5.8 19.6 6.1 20 6.5 20H9L9.9 14.3C10 13.9 10.4 13.5 10.8 13.5H12.4C15 13.5 16.7 12.2 17.1 9.7C17.5 7.8 16 7.2 10.8 7.2Z" fill="#0079C1"/>
                  <text x="21" y="16.5" fontFamily="Arial, Helvetica, sans-serif" fontSize="14" fontWeight="900" fontStyle="italic" fill="#003087">Pay</text>
                  <text x="49" y="16.5" fontFamily="Arial, Helvetica, sans-serif" fontSize="14" fontWeight="900" fontStyle="italic" fill="#0079C1">Pal</text>
                </svg>
                <span className="font-extrabold text-slate-900">• Authorize & Settle ${quote.total_cost.toFixed(2)}</span>
              </button>
            </div>
          )}

          {step === 'CAPTURING' && (
            <div className="py-10 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Capturing settlement via PayPal Sandbox...</p>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="py-4 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">Payment Captured via PayPal</h4>
                <p className="text-xs text-slate-500 mt-1 font-mono">Capture ID: {txnId}</p>
                <p className="text-xs text-emerald-700 font-semibold mt-2">
                  ✓ Inventory successfully replenished (+{quantity} {item.unit})!
                </p>
                <p className="text-[11px] text-blue-600 font-medium mt-1">
                  📄 Official cryptographic PDF receipt generated
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleDownloadReceipt}
                  disabled={isDownloading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <Download className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`} />
                  {isDownloading ? 'Downloading PDF Receipt...' : 'Download Official PDF Receipt (ReportLab)'}
                </button>

                <button
                  onClick={handleClose}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close & View Updated Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};