
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby5GMhFqzQrXxTPpoVXTc9YH383XHtCiyZMhKePjTAXx9-4lm1H4rbeorJc_rzgTeWI/exec";

export const getScriptUrl = () => {
  return import.meta.env.VITE_GAS_URL || import.meta.env.VITE_GOOGLE_SCRIPT_URL || DEFAULT_SCRIPT_URL;
};

export const fetchAPI = async (path: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(path, options);
    
    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        throw new Error("SERVER_RETURNED_HTML");
      }
      throw new Error("INVALID_JSON_RESPONSE");
    }
  } catch (error) {
    console.error(`API Error (${path}):`, error);
    throw error;
  }
};
