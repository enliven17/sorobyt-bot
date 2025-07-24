import dotenv from 'dotenv';
dotenv.config();

export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
export const SOROSWAP_API_KEY = process.env.SOROSWAP_API_KEY || '';
export const SOROSWAP_API_URL = process.env.SOROSWAP_API_URL || ''; 