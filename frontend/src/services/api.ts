import axios from 'axios';
import type { InventoryItem, SourcingResult } from '../types';

const API = axios.create({
  baseURL: 'http://localhost:8000/api',
});

export const getInventory = () => API.get<InventoryItem>('/inventory');
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