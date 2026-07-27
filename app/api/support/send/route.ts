import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function safeExt(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  return byType[file.type] || "jpg";
}

export async function POST(req: NextRequest) {
  let uploadedPath: string | null = null;

  try {
    // IMPORTANT:
    // Keep/insert your existing admin authentication and CSRF protection here.
    const form = await req.formData();

    const chatId = Number(form.get("chat_id"));
    const content = String(form.get("content") || "").trim();
    const fileValue = form.get("file");
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

    if (!Number.isSafeInteger(chatId) || chatId <= 0) {
      return NextResponse.json({ error: "Invalid chat_id" }, { status: 400 });
    }

    if (!content && !file) {
      return NextResponse.json(
        { error: "Message or image is required" },
        { status: 400 }
      );
    }

    if (file) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "Image is larger than 10 MB" }, { status: 413 });
      }
      if (!ALLOWED.has(file.type)) {
        return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
      }
    }

    const supabase = supabaseAdmin();

    let attachmentMime: string | null = null;
    let attachmentName: string | null = null;
    let attachmentSize: number | null = null;

    if (file) {
      const ext = safeExt(file);
      uploadedPath = `${chatId}/admin-${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const bytes = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from("support-media")
        .upload(uploadedPath, bytes, {
          contentType: file.type,
          upsert: false,
          cacheControl: "3600",
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      attachmentMime = file.type;
      attachmentName = file.name || `support.${ext}`;
      attachmentSize = file.size;
    }

    const { data, error } = await supabase
      .from("support_messages")
      .insert({
        chat_id: chatId,
        sender: "admin",
        content: content || (file ? "Фото" : ""),
        attachment_path: uploadedPath,
        attachment_mime: attachmentMime,
        attachment_name: attachmentName,
        attachment_size: attachmentSize,
      })
      .select("*")
      .single();

    if (error) {
      // Avoid orphan file if DB insert fails.
      if (uploadedPath) {
        await supabase.storage.from("support-media").remove([uploadedPath]);
      }
      throw new Error(`support_messages insert failed: ${error.message}`);
    }

    return NextResponse.json({ ok: true, message: data });
  } catch (error) {
    console.error("support send error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
