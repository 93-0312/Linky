import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { Category, DEFAULT_CATEGORIES } from "../types";
import { useAuthStore } from "./useAuthStore";
import { generateId } from "../lib/uuid";

const buildDefaults = (userId: string): Category[] =>
  DEFAULT_CATEGORIES.map((c, i) => ({
    ...c,
    id: generateId(),
    userId,
    createdAt: new Date(),
  }));

function fromDb(row: Record<string, unknown>): Category {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    color: row.color as string,
    icon: row.icon as string,
    isDefault: row.is_default as boolean,
    sortOrder: row.sort_order as number,
    createdAt: new Date(row.created_at as string),
  };
}

function toDb(cat: Category) {
  return {
    id: cat.id,
    user_id: cat.userId,
    name: cat.name,
    color: cat.color,
    icon: cat.icon,
    is_default: cat.isDefault,
    sort_order: cat.sortOrder,
    created_at: cat.createdAt.toISOString(),
  };
}

interface CategoryState {
  categories: Category[];
  initialized: boolean;

  initialize: () => Promise<void>;
  addCategory: (params: { name: string; color: string; icon: string }) => Promise<Category>;
  updateCategory: (id: string, patch: Partial<Pick<Category, "name" | "color" | "icon">>) => void;
  deleteCategory: (id: string) => void;
  reorder: (orderedIds: string[]) => void;
  getCategoryById: (id: string | null) => Category | null;
}

export const useCategoryStore = create<CategoryState>((set, get) => ({
  categories: [],
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;

    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order");

    if (error) { console.warn("categories fetch error:", error.message); return; }

    if (data && data.length > 0) {
      set({ categories: data.map(fromDb), initialized: true });
    } else {
      const defaults = buildDefaults(userId);
      await supabase.from("categories").insert(defaults.map(toDb));
      set({ categories: defaults, initialized: true });
    }
  },

  addCategory: async ({ name, color, icon }) => {
    const userId = useAuthStore.getState().user?.id ?? "";
    const newCat: Category = {
      id: generateId(),
      userId,
      name,
      color,
      icon,
      isDefault: false,
      sortOrder: get().categories.length,
      createdAt: new Date(),
    };
    set((s) => ({ categories: [...s.categories, newCat] }));
    supabase.from("categories").insert(toDb(newCat)).then(({ error }) => {
      if (error) console.warn("category insert error:", error.message);
    });
    return newCat;
  },

  updateCategory: (id, patch) => {
    set((s) => ({
      categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    supabase.from("categories").update(patch).eq("id", id).then(({ error }) => {
      if (error) console.warn("category update error:", error.message);
    });
  },

  deleteCategory: (id) => {
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
    supabase.from("categories").delete().eq("id", id).then(({ error }) => {
      if (error) console.warn("category delete error:", error.message);
    });
  },

  reorder: (orderedIds) => {
    set((s) => ({
      categories: orderedIds
        .map((id, idx) => {
          const cat = s.categories.find((c) => c.id === id);
          return cat ? { ...cat, sortOrder: idx } : null;
        })
        .filter(Boolean) as Category[],
    }));
    orderedIds.forEach((id, idx) => {
      supabase.from("categories").update({ sort_order: idx }).eq("id", id);
    });
  },

  getCategoryById: (id) => {
    if (!id) return null;
    return get().categories.find((c) => c.id === id) ?? null;
  },
}));
