import axios from 'axios';
import { SOROSWAP_API_KEY, SOROSWAP_API_URL } from '../config';

const api = axios.create({
  baseURL: SOROSWAP_API_URL,
  headers: {
    'Authorization': `Bearer ${SOROSWAP_API_KEY}`,
    'Content-Type': 'application/json',
  },
});

export const getPools = async () => {
  const response = await api.get('/pools');
  return response.data;
};

export const getSwaps = async (params?: Record<string, any>) => {
  const response = await api.get('/swaps', { params });
  return response.data;
};

// Add more endpoint functions as needed 