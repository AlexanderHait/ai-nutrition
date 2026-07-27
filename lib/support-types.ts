export type SupportSender = "client" | "admin";

export type SupportMessage = {
  id: number;
  chat_id: number;
  sender: SupportSender;
  content: string;
  created_at: string;
  read_by_admin_at?: string | null;
  read_by_client_at?: string | null;
  attachment_path?: string | null;
  attachment_mime?: string | null;
  attachment_name?: string | null;
  attachment_size?: number | null;
  delivered_to_client_at?: string | null;
  delivery_error?: string | null;
};
