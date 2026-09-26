import type { Order } from "@/domain/types";

/**
 * Orders are a mock: persisted to localStorage so they survive a restart, behind an async
 * interface so a real API can replace this without touching callers.
 */
export interface OrderRepository {
  list(): Promise<Order[]>;
  getById(id: string): Promise<Order | undefined>;
  create(order: Order): Promise<Order>;
}

const STORAGE_KEY = "amzn.orders.v1";

function read(): Order[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Saved orders are corrupted.");
  return parsed as Order[];
}

export const localOrderRepository: OrderRepository = {
  async list() {
    return read().toSorted((a, b) => b.placedAt.localeCompare(a.placedAt));
  },
  async getById(id) {
    return read().find((o) => o.id === id);
  },
  async create(order) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...read(), order]));
    } catch {
      throw new Error("Couldn't save your order. Your browser storage may be full or disabled.");
    }
    return order;
  },
};
