import axios from 'axios';

const DUNE_API_KEY = process.env.DUNE_API_KEY;
const DUNE_QUERY_ID = '4606835';

export async function fetchRecentSwapsFromDune(limit = 20) {
  const url = `https://api.dune.com/api/v1/query/${DUNE_QUERY_ID}/results?limit=${limit}`;
  const headers = { 'X-Dune-API-Key': DUNE_API_KEY };
  const res = await axios.get(url, { headers });
  return res.data.result.rows;
}

export async function fetchPoolReservesFromDune(limit = 10) {
  const url = `https://api.dune.com/api/v1/query/4341139/results?limit=${limit}`;
  const headers = { 'X-Dune-API-Key': DUNE_API_KEY };
  const res = await axios.get(url, { headers });
  return res.data.result.rows;
}

export async function fetchPoolsFromDune(limit = 10) {
  const url = `https://api.dune.com/api/v1/query/4302636/results?limit=${limit}`;
  const headers = { 'X-Dune-API-Key': DUNE_API_KEY };
  const res = await axios.get(url, { headers });
  return res.data.result.rows;
} 