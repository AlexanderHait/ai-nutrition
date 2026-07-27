import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

export async function POST(req: NextRequest) {
  try {
    // IMPORTANT:
    // Keep your existing admin-auth check here.
    // Do not expose this route to unauthenticated visitors.
    const body = await req.json();
    const path = String(body?.path || "").trim();

    if (!path || path.includes("..") || path.startsWith("/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase.storage
      .from("support-media")
      .createSignedUrl(path, 60 * 10);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message || "Could not create signed URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    console.error("support signed-url error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
