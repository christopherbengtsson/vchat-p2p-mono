import axios from 'axios';

const API_KEY: string = import.meta.env.VITE_API_KEY;
const SERVER_URL: string = import.meta.env.VITE_SERVER_URL;

const BASE_API_PATH = '/api/v1';
const BASE_URL = import.meta.env.DEV
  ? BASE_API_PATH
  : `${SERVER_URL}${BASE_API_PATH}`;

export const axiosClient = axios.create({
  baseURL: BASE_URL,
  adapter: 'fetch',
  headers: {
    'Content-Type': 'application/json',
  },
});

// TODO: Why not using supabase jwt?
axiosClient.interceptors.request.use((config) => {
  config.headers['x-api-key'] = API_KEY;

  if (import.meta.env.DEV) {
    config.headers['x-forwarded-for'] = '127.0.0.1';
  }

  return config;
});
