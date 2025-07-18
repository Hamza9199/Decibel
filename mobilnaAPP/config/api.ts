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
      const response = await fetch(`${API_BASE}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API GET error for ${endpoint}:`, error);
      throw error;
    }
  },
  
  post: async (endpoint: string, data: any) => {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API POST error for ${endpoint}:`, error);
      throw error;
    }
  },
};

