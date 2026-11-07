import axios from 'axios';
import type { InventoryItem, SourcingResult } from '../types';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

export const getInventory = () => API.get<InventoryItem>('/inventory');
export const getAllInventory = () => API.get<InventoryItem[]>('/inventory/all');
export const addInventoryItem = (data: {
  name: string;
  category: string;
  current_stock: number;
  min_threshold: number;
  optimal_stock: number;
  unit: string;
  bulk_threshold_qty?: number;
  bulk_discount_rate?: number;
}) => API.post<InventoryItem>('/inventory/add', data);
export const simulateLowInventory = () => API.post<InventoryItem>('/inventory/simulate-low');
export const resetInventory = () => API.post<InventoryItem>('/inventory/reset');
export const getBudgetCap = () => API.get<{ budget_cap: number }>('/budget-cap');
export const updateBudgetCap = (budget_cap: number) => API.post<{ budget_cap: number }>('/budget-cap', { budget_cap });
export const runAgentSourcing = () => API.post<SourcingResult>('/agent/source');

export const getBusiness = () => API.get('/business');
export const getProfiles = () => API.get('/profiles');
export const switchProfile = (profile_key: string) => API.post('/business/switch', { profile_key });

export const createPayPalOrder = (data: {
  amount: number;
  supplier_name: string;
  item_name: string;
  quantity: number;
}) => API.post('/paypal/create-order', data);

export const capturePayPalOrder = (data: {
  order_id: string;
  quantity: number;
}) => API.post('/paypal/capture-order', data);

export const downloadReceipt = async (data: {
  supplier_name: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  shipping_fee: number;
  total_cost: number;
  order_id: string;
  transaction_id: string;
}) => {
  const response = await API.post('/receipt/download', data, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Restock_Receipt_${data.transaction_id.slice(0, 8)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};