import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  createYooPayment,
  publicSiteUrl,
  rublesToYooValue,
  yooKassaConfigured,
  YooCreatePaymentBody,
} from "@/lib/yookassa";

const ALLOWED_PLANS = new Set(["basic", "premium"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkoutUrl(requestUrl: string, plan: string, error?: string) {
  const url = new URL(`/client/checkout/${plan}`, requestUrl);
  if (error) url.searchParams.set("error", error);
  return url;
}

export async function POST(request: Request) {
  const auth = await session();
  if (!auth?.chatId) return NextResponse.redirect(new URL("/login", request.url), 303);

  const form = await request.formData();
  const plan = String(form.get("plan") || "").toLowerCase();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const accepted = form.get("accept_terms") === "on";

  if (!ALLOWED_PLANS.has(plan)) {
    return NextResponse.redirect(new URL("/client/plan?payment=invalid_plan", request.url), 303);
  }
  if (!yooKassaConfigured()) {
    return NextResponse.redirect(new URL("/client/plan?payment=unavailable", request.url), 303);
  }
  if (!accepted) return NextResponse.redirect(checkoutUrl(request.url, plan, "terms"), 303);
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.redirect(checkoutUrl(request.url, plan, "email"), 303);
  }

  const db = getSupabaseAdmin();
  const { data: product, error: productError } = await db
    .from("subscription_products")
    .select("plan,title,description,price_rub,period_days,enabled")
    .eq("plan", plan)
    .eq("enabled", true)
    .maybeSingle();

  if (productError || !product) {
    console.error("subscription product unavailable", { plan, productError });
    return NextResponse.redirect(checkoutUrl(request.url, plan, "unavailable"), 303);
  }

  const idempotencyKey = randomUUID();
  const { data: order, error: orderError } = await (db.from("payment_orders") as any)
    .insert({
      chat_id: Number(auth.chatId),
      plan,
      amount_rub: Number(product.price_rub),
      currency: "RUB",
      provider: "yookassa",
      idempotency_key: idempotencyKey,
      status: "pending",
      receipt_email: email || null,
      metadata: {
        period_days: Number(product.period_days),
        terms_accepted_at: new Date().toISOString(),
      },
    })
    .select("id,chat_id,plan,amount_rub,idempotency_key")
    .single();

  if (orderError || !order) {
    console.error("payment order creation failed", { plan, chatId: auth.chatId, orderError });
    return NextResponse.redirect(checkoutUrl(request.url, plan, "order"), 303);
  }

  try {
    const siteUrl = publicSiteUrl(request.url);
    const amountValue = rublesToYooValue(Number(order.amount_rub));
    const description = `${product.title} — доступ на ${Number(product.period_days)} дней`;
    const body: YooCreatePaymentBody = {
      amount: { value: amountValue, currency: "RUB" },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: `${siteUrl}/client/payment/return?order=${encodeURIComponent(order.id)}`,
      },
      description: description.slice(0, 128),
      metadata: {
        order_id: String(order.id),
        chat_id: String(order.chat_id),
        plan: String(order.plan),
      },
    };

    if (process.env.YOOKASSA_RECEIPTS_ENABLED === "true") {
      if (!email) {
        await (db.from("payment_orders") as any)
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", order.id);
        return NextResponse.redirect(checkoutUrl(request.url, plan, "email_required"), 303);
      }

      const vatCode = Number(process.env.YOOKASSA_VAT_CODE);
      if (!Number.isInteger(vatCode) || vatCode < 1 || vatCode > 6) {
        throw new Error("YOOKASSA_VAT_CODE must be configured when receipts are enabled");
      }

      body.receipt = {
        customer: { email },
        items: [
          {
            description: description.slice(0, 128),
            quantity: "1.00",
            amount: { value: amountValue, currency: "RUB" },
            vat_code: vatCode,
            payment_subject: process.env.YOOKASSA_PAYMENT_SUBJECT || "service",
            payment_mode: process.env.YOOKASSA_PAYMENT_MODE || "full_payment",
          },
        ],
      };
    }

    const payment = await createYooPayment(body, idempotencyKey);
    const confirmationUrl = payment.confirmation?.confirmation_url;
    if (!confirmationUrl) throw new Error("YooKassa did not return confirmation_url");

    const now = new Date().toISOString();
    const { error: updateError } = await (db.from("payment_orders") as any)
      .update({
        provider_payment_id: payment.id,
        confirmation_url: confirmationUrl,
        status: "pending",
        updated_at: now,
        metadata: {
          period_days: Number(product.period_days),
          terms_accepted_at: new Date().toISOString(),
          provider_created_at: payment.created_at || null,
        },
      })
      .eq("id", order.id);
    if (updateError) throw updateError;

    await (db.from("payment_events") as any).insert({
      order_id: order.id,
      chat_id: Number(auth.chatId),
      provider: "yookassa",
      event_type: "payment.created",
      external_id: payment.id,
      amount_rub: Number(order.amount_rub),
      plan,
      status: payment.status,
      payload: payment,
      updated_at: now,
    });

    return NextResponse.redirect(confirmationUrl, 303);
  } catch (error) {
    console.error("YooKassa payment creation failed", {
      orderId: order.id,
      chatId: auth.chatId,
      plan,
      error,
    });
    const now = new Date().toISOString();
    await (db.from("payment_orders") as any)
      .update({ status: "failed", updated_at: now })
      .eq("id", order.id);
    await (db.from("payment_events") as any).insert({
      order_id: order.id,
      chat_id: Number(auth.chatId),
      provider: "yookassa",
      event_type: "payment.failed",
      amount_rub: Number(order.amount_rub),
      plan,
      status: "failed",
      payload: { stage: "create" },
      updated_at: now,
    });
    return NextResponse.redirect(checkoutUrl(request.url, plan, "provider"), 303);
  }
}
