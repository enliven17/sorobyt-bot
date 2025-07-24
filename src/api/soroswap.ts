import axios from 'axios';
import { SOROSWAP_API_KEY, SOROSWAP_API_URL } from '../config';

const api = axios.create({
  baseURL: SOROSWAP_API_URL,
  headers: {
    'Authorization': `Bearer ${SOROSWAP_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

// Get all pools
export const getPools = async (params: { network?: string; protocol?: string } = { network: 'mainnet', protocol: 'soroswap' }) => {
  const response = await api.get('/pools', { params });
  return response.data;
};

// Get price for asset(s)
export const getPrice = async (params: { network: string; asset: string; referenceCurrency?: string }) => {
  const response = await api.get('/price', { params });
  return response.data;
};

// Get quote for a swap
export const getQuote = async (body: any, network: string = 'mainnet') => {
  const response = await api.post(`/quote?network=${network}`, body);
  return response.data;
};

// Add liquidity
export const addLiquidity = async (body: any, network: string = 'mainnet') => {
  const response = await api.post(`/liquidity/add?network=${network}`, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
};

// Remove liquidity
export const removeLiquidity = async (body: any, network: string = 'mainnet') => {
  const response = await api.post(`/liquidity/remove?network=${network}`, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
};

// Get asset list
export const getAssetList = async (params: { name?: string }) => {
  const response = await api.get('/asset-list', { params });
  return response.data;
};

// Get protocols
export const getProtocols = async (params: { network: string }) => {
  const response = await api.get('/protocols', { params });
  return response.data;
};

// Get health status
export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const getSwaps = async (params?: Record<string, any>) => {
  const response = await api.get('/swaps', { params });
  return response.data;
}; 