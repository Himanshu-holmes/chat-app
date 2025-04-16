// api/axiosInstance.js
import axios from "axios";

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: "https://192.168.239.195:5000/",
      withCredentials: true,
    });
  }

  setAuthToken(token) {
    if (token) {
      this.api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common["Authorization"];
    }
  }

  get(url, config = {}) {
    return this.api.get(url, config);
  }

  post(url, data = {}, config = {}) {
    return this.api.post(url, data, config);
  }

  put(url, data = {}, config = {}) {
    return this.api.put(url, data, config);
  }

  delete(url, config = {}) {
    return this.api.delete(url, config);
  }
}

const apiService = new ApiService();
export const setAuthToken = (token) => apiService.setAuthToken(token);
export default apiService;
