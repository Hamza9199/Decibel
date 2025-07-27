import axios from "axios";

const getApiBaseUrl = (): string => {
  const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  
  if (!apiUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL not found in environment variables');
  }
  
  return apiUrl;
};

export const API_BASE = getApiBaseUrl();

// Optional: Add API client with better error handling
export const apiClient = {
  get: async (endpoint: string) => {
    try {
      const response = await axios.get(`${API_BASE}${endpoint}`);
      return response.data;
    } catch (error) {
      console.error(`API GET error for ${endpoint}:`, error);
      throw error;
    }
  },
  
  post: async (endpoint: string, data: any) => {
    try {
      const response = await axios.post(`${API_BASE}${endpoint}`, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`API POST error for ${endpoint}:`, error);
      throw error;
    }
  },
};

