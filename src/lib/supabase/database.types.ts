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
type Booking = {
  id: string; ref_code: string; type: "exclusive" | "unit" | "entrance"; package_id: string | null;
  unit_ids: string[]; date_start: string; date_end: string; adults: number; children: number;
  guest_name: string; phone: string; guest_email: string | null; contact_extra: string | null; notes: string | null;
  status: "pending" | "awaiting_payment" | "confirmed" | "cancelled" | "completed";
  total_amount: number; deposit_required: number | null; payment_deadline: string | null; hold_expires_at: string | null;
  access_token: string; guest_uid: string | null; created_at: string; updated_at: string;
};
type BlockedDate = { id: string; date: string; reason: string; created_by: string | null; created_at: string };

export type Database = {
  public: {
    Tables: {
      units: Table<Unit, Omit<Unit, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }>;
      packages: Table<Package, Omit<Package, "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string }>;
      settings: Table<Setting, {
        key: string; value: Json; updated_at?: string; updated_by?: string | null;
      }, Partial<Setting>>;
      user_roles: Table<UserRole, UserRole, Partial<UserRole>>;
      bookings: Table<Booking, Omit<Booking, "id" | "created_at" | "updated_at" | "access_token"> & {
        id?: string; created_at?: string; updated_at?: string; access_token?: string;
      }, Partial<Booking>>;
      blocked_dates: Table<BlockedDate, Omit<BlockedDate, "id" | "created_at"> & { id?: string; created_at?: string }, Partial<BlockedDate>>;
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
      get_public_availability: { Args: { from_date: string; through_date: string }; Returns: { day: string; state: string }[] };
      expire_unpaid_holds: { Args: Record<PropertyKey, never>; Returns: number };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
