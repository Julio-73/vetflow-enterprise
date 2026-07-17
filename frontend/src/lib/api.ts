// API Client for VetFlow SaaS Backend
// Coordinates requests and automatically manages Bearer token injection.
// Includes a custom Stale-While-Revalidate (SWR) cache client-side for instant transitions.

import { MockUser } from "./mock-auth";

const BACKEND_URL = "http://localhost:8000";

class ApiClient {
  private token: string | null = null;
  private activeUser: MockUser | null = null;
  private onChangeListeners: (() => void)[] = [];
  private cache = new Map<string, any>();

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("vetflow_jwt");
      const userJson = localStorage.getItem("vetflow_active_user");
      if (userJson) {
        try {
          this.activeUser = JSON.parse(userJson);
        } catch {
          // ignore
        }
      }
    }
  }

  public setAuth(token: string, user: MockUser) {
    this.token = token;
    this.activeUser = user;
    if (typeof window !== "undefined") {
      localStorage.setItem("vetflow_jwt", token);
      localStorage.setItem("vetflow_active_user", JSON.stringify(user));
    }
    this.cache.clear(); // Clear cache when auth context changes
    this.triggerChange();
  }

  public clearAuth() {
    this.token = null;
    this.activeUser = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("vetflow_jwt");
      localStorage.removeItem("vetflow_active_user");
    }
    this.cache.clear();
    this.triggerChange();
  }

  public getActiveUser(): MockUser | null {
    return this.activeUser;
  }

  public getToken(): string | null {
    return this.token;
  }

  public getCached(key: string): any | null {
    const cacheKey = `${key}_${this.token || ""}`;
    return this.cache.get(cacheKey) || null;
  }

  public subscribe(listener: () => void): () => void {
    this.onChangeListeners.push(listener);
    return () => {
      this.onChangeListeners = this.onChangeListeners.filter(l => l !== listener);
    };
  }

  private triggerChange() {
    this.onChangeListeners.forEach(listener => listener());
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const isGet = !options.method || options.method === "GET";
    const cacheKey = `${endpoint}_${this.token || ""}`;

    if (isGet && this.cache.has(cacheKey)) {
      // Stale-While-Revalidate: Return cached data instantly, revalidate in background
      const cachedVal = this.cache.get(cacheKey);
      this.backgroundRevalidate(endpoint, options, cacheKey);
      return cachedVal;
    }

    const data = await this.performFetch(endpoint, options);
    if (isGet) {
      this.cache.set(cacheKey, data);
    } else {
      // Mutation: Invalidate entire cache to guarantee data consistency
      this.cache.clear();
      this.triggerChange();
    }
    return data;
  }

  private isBackendDown = false;

  private async backgroundRevalidate(endpoint: string, options: RequestInit, cacheKey: string) {
    try {
      const headers = new Headers(options.headers || {});
      if (this.token) {
        headers.set("Authorization", `Bearer ${this.token}`);
      }
      if (options.body && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
      }

      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1000);

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(id);

      if (response.ok) {
        this.isBackendDown = false; // Backend is online!
        const freshData = await response.json();
        const oldData = this.cache.get(cacheKey);
        if (JSON.stringify(oldData) !== JSON.stringify(freshData)) {
          this.cache.set(cacheKey, freshData);
          this.triggerChange();
        }
      }
    } catch (e) {
      console.warn("Background revalidation failed for", endpoint, e);
    }
  }

  private async performFetch(endpoint: string, options: RequestInit): Promise<any> {
    if (this.isBackendDown) {
      throw new Error("Backend connection is offline (Fast Fallback)");
    }

    const headers = new Headers(options.headers || {});
    
    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }
    
    if (options.body && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 600); // 600ms fast connection timeout

    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(id);

      if (!response.ok) {
        let errorDetail = "Unknown Error";
        try {
          const errorJson = await response.json();
          errorDetail = errorJson.detail || JSON.stringify(errorJson);
        } catch {
          errorDetail = await response.text();
        }
        throw new Error(errorDetail);
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (e: any) {
      clearTimeout(id);
      
      // If connection fails, is aborted, or times out, flag backend as offline to trigger instant fallback on next calls
      const isNetworkError = e.name === "AbortError" || 
                             e.message?.includes("Failed to fetch") || 
                             e.message?.includes("fetch") ||
                             e.message?.includes("NetworkError");
      if (isNetworkError) {
        this.isBackendDown = true;
      }
      throw e;
    }
  }

  // --- API METHODS ---

  // Health
  public async checkHealth(): Promise<{ status: string }> {
    const res = await fetch(`${BACKEND_URL}/healthz`);
    if (!res.ok) throw new Error("Backend offline");
    return res.json();
  }

  // Tenant / Infrastructure info
  public async getTenantMe(): Promise<any> {
    return this.request("/api/v1/tenants/me");
  }

  public async getTenantBranches(): Promise<any[]> {
    return this.request("/api/v1/tenants/branches");
  }

  public async getTenantUsers(): Promise<any[]> {
    return this.request("/api/v1/tenants/users");
  }

  // Patients (Tutors / Pets)
  public async getTutors(): Promise<any[]> {
    return this.request("/api/v1/patients/tutors");
  }

  public async createTutor(data: any): Promise<any> {
    return this.request("/api/v1/patients/tutors", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  public async getPets(): Promise<any[]> {
    return this.request("/api/v1/patients/pets");
  }

  public async createPet(data: any): Promise<any> {
    return this.request("/api/v1/patients/pets", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  // Appointments (Agenda)
  public async getAppointments(): Promise<any[]> {
    return this.request("/api/v1/appointments");
  }

  public async createAppointment(data: any): Promise<any> {
    return this.request("/api/v1/appointments", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  public async updateAppointmentStatus(id: string, status: string): Promise<any> {
    return this.request(`/api/v1/appointments/${id}/status?status=${status}`, {
      method: "PATCH"
    });
  }

  public async createTriage(data: any): Promise<any> {
    return this.request("/api/v1/appointments/triage", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  // Clinical (EMR)
  public async getDiagnoses(): Promise<any[]> {
    return this.request("/api/v1/clinical/diagnoses");
  }

  public async createClinicalRecord(data: any): Promise<any> {
    return this.request("/api/v1/clinical/records", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  public async updateClinicalRecord(id: string, data: any): Promise<any> {
    return this.request(`/api/v1/clinical/records/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }

  public async sealClinicalRecord(id: string): Promise<any> {
    return this.request(`/api/v1/clinical/records/${id}/seal`, {
      method: "POST"
    });
  }

  public async createPrescription(data: any): Promise<any> {
    return this.request("/api/v1/clinical/prescriptions", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  // Inventory & Pharmacy
  public async getProducts(): Promise<any[]> {
    return this.request("/api/v1/inventory/products");
  }

  public async createProduct(data: any): Promise<any> {
    return this.request("/api/v1/inventory/products", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  public async getStocks(): Promise<any[]> {
    return this.request("/api/v1/inventory/stocks");
  }

  public async getBatches(): Promise<any[]> {
    return this.request("/api/v1/inventory/batches");
  }

  public async createInventoryTransaction(data: any): Promise<any> {
    return this.request("/api/v1/inventory/transactions", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  // Billing, Cash & Sales
  public async openCashRegister(data: any): Promise<any> {
    return this.request("/api/v1/billing/registers", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  public async getMyActiveRegister(): Promise<any> {
    return this.request("/api/v1/billing/registers/me");
  }

  public async closeCashRegister(id: string, data: any): Promise<any> {
    return this.request(`/api/v1/billing/registers/${id}/close`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  public async createSale(data: any): Promise<any> {
    return this.request("/api/v1/billing/sales", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }

  public async getSaleDetails(id: string): Promise<any> {
    return this.request(`/api/v1/billing/sales/${id}`);
  }

  public async invoiceSale(id: string): Promise<any> {
    return this.request(`/api/v1/billing/sales/${id}/invoice`, {
      method: "POST"
    });
  }
}

export const api = new ApiClient();
