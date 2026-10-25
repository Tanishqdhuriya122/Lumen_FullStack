import axios from "axios";
import { API_BASE } from "../config";

export const axiosInstance = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  withCredentials: true,
});