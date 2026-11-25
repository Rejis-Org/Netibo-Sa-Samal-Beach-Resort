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
  free_entrance_count: number;
};

type Package = {
  id: string; slug: string; name: Json; scope: "exclusive" | "walk-in"; price_amount: number | null;
  currency: "PHP"; pax_included: number | null; weekday_only: boolean; weekend_only: boolean;
  notes: Json; active: boolean; sort_order: number; created_at: string; updated_at: string;
};

type Setting = { key: string; value: Json; updated_at: string; updated_by: string | null };
type UserRole = { user_id: string; role: "owner" | "staff"; created_at: string };
type Conversation = {
  id: string; visitor_token: string; guest_uid: string | null; guest_name: string | null; contact: string | null;
  booking_id: string | null; status: "open" | "closed"; last_message_at: string; created_at: string;
};
type Message = {
  id: string; conversation_id: string; sender: "guest" | "owner"; message_type: "text" | "booking";
  booking_id: string | null; booking_details: Json | null; body: string; delivered_at: string | null;
  read_at: string | null; created_at: string;
};
type Booking = {
  id: string; ref_code: string; type: "exclusive" | "unit" | "entrance"; package_id: string | null;
  unit_ids: string[]; date_start: string; date_end: string; adults: number; children: number;
  guest_name: string; phone: string; guest_email: string | null; contact_extra: string | null; notes: string | null;
  status: "pending" | "awaiting_payment" | "confirmed" | "cancelled" | "completed";
  total_amount: number; deposit_required: number | null; payment_deadline: string | null; hold_expires_at: string | null;
  access_token: string; guest_uid: string | null; created_at: string; updated_at: string;
  visit_type: "day-tour" | "overnight" | null; corkage_items: Json; price_breakdown: Json | null; total_overridden: boolean;
};
type GuestLog = {
  id: string; booking_id: string; actual_adults: number; actual_children: number;
  checked_in_at: string; checked_out_at: string | null; notes: string | null;
  checked_in_by: string | null; created_at: string;
};
type DailyReport = { report_date: string; data: Json; closed_by: string | null; closed_at: string };
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
      bookings: Table<Booking, Omit<Booking, "id" | "created_at" | "updated_at" | "access_token" | "visit_type" | "corkage_items" | "price_breakdown" | "total_overridden"> & {
        id?: string; created_at?: string; updated_at?: string; access_token?: string;
        visit_type?: Booking["visit_type"]; corkage_items?: Json; price_breakdown?: Json | null; total_overridden?: boolean;
      }, Partial<Booking>>;
      guest_log: Table<GuestLog, Omit<GuestLog, "id" | "created_at" | "checked_in_at" | "checked_out_at" | "notes" | "checked_in_by" | "actual_adults" | "actual_children"> & {
        id?: string; created_at?: string; checked_in_at?: string; checked_out_at?: string | null; notes?: string | null;
        checked_in_by?: string | null; actual_adults?: number; actual_children?: number;
      }, Partial<GuestLog>>;
      daily_reports: Table<DailyReport, Omit<DailyReport, "closed_at"> & { closed_at?: string }, Partial<DailyReport>>;
      conversations: Table<Conversation, Omit<Conversation, "id" | "visitor_token" | "created_at" | "last_message_at"> & {
        id?: string; visitor_token?: string; created_at?: string; last_message_at?: string;
      }, Partial<Conversation>>;
      messages: Table<Message, Omit<Message, "id" | "created_at" | "delivered_at" | "read_at" | "booking_id" | "booking_details"> & {
        id?: string; created_at?: string; delivered_at?: string | null; read_at?: string | null;
        booking_id?: string | null; booking_details?: Json | null;
      }, Partial<Message>>;
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
      get_unit_availability: { Args: { from_date: string; through_date: string }; Returns: { unit_id: string; day: string; state: string }[] };
      get_or_create_guest_conversation: { Args: { p_guest_name?: string | null; p_contact?: string | null }; Returns: Conversation[] };
      mark_messages_read: { Args: { p_conversation_id: string }; Returns: undefined };
      expire_unpaid_holds: { Args: Record<PropertyKey, never>; Returns: number };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
