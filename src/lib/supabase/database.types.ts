export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type Unit = {
  id: string; slug: string; name: string; type: "cottage" | "room" | "hall" | "kubo";
  capacity_min: number | null; capacity_max: number | null; aircon: boolean; has_own_cr: boolean;
  price_amount: number | null; currency: "PHP"; price_note: string | null; description: Json;
  photos: string[]; active: boolean; sort_order: number; created_at: string; updated_at: string;
};

type Package = {
  id: string; slug: string; name: Json; scope: "exclusive" | "walk-in"; price_amount: number | null;
  currency: "PHP"; pax_included: number | null; weekday_only: boolean; weekend_only: boolean;
  notes: Json; active: boolean; sort_order: number; created_at: string; updated_at: string;
};

type Setting = { key: string; value: Json; updated_at: string; updated_by: string | null };
type UserRole = { user_id: string; role: "owner" | "staff"; created_at: string };

export type Database = {
  public: {
    Tables: {
      units: Table<Unit, Omit<Unit, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }>;
      packages: Table<Package, Omit<Package, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }>;
      settings: Table<Setting, {
        key: string; value: Json; updated_at?: string; updated_by?: string | null;
      }, Partial<Setting>>;
      user_roles: Table<UserRole, UserRole, Partial<UserRole>>;
      audit_log: Table<{
        id: number; actor_id: string | null; action: string; target_table: string; target_id: string | null;
        old_data: Json | null; new_data: Json | null; created_at: string;
      }, {
        id?: number; actor_id?: string | null; action: string; target_table: string; target_id?: string | null;
        old_data?: Json | null; new_data?: Json | null; created_at?: string;
      }>;
    };
    Views: Record<never, never>;
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_owner: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
