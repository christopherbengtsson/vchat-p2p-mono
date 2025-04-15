import axios from 'axios';

const API_KEY: string = import.meta.env.VITE_API_KEY;
const SERVER_URL: string = import.meta.env.VITE_SERVER_URL;

const BASE_API_PATH = '/api/v1';

export const axiosClient = axios.create({
  baseURL: `${SERVER_URL}${BASE_API_PATH}`,
  adapter: 'fetch',
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use((config) => {
  config.headers['x-api-key'] = API_KEY;

  return config;
});
