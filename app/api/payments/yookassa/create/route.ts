import { NextResponse } from "next/server";
import { session } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { subscriptionAccess } from "@/lib/subscription-access";
import { verifyAndProcessYooPayment } from "@/lib/process-yookassa-payment";
import {
  createYooPayment,
  isTransientYooKassaError,
  publicSiteUrl,
  rublesToYooValue,
  yooKassaConfigured,
  YooCreatePaymentBody,
} from "@/lib/yookassa";

const ALLOWED_PLANS = new Set(["basic", "premium"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PreparedOrder = {
  id: string;
  chat_id: number;
  plan: "basic" | "premium";
  amount_rub: number;
  currency: "RUB";
  provider_payment_id: string | null;
  idempotency_key: string;
  status: string;
  confirmation_url: string | null;
  receipt_email: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  reused: boolean;
};

function checkoutUrl(requestUrl: string, plan: string, error?: string) {
  const url = new URL(`/client/checkout/${plan}`, requestUrl);
  if (error) url.searchParams.set("error", error);
  return url;
}

async function recordEvent(
  db: ReturnType<typeof getSupabaseAdmin>,
  row: Record<string, unknown>,
) {
  const { error } = await (db.from("payment_events") as any).insert(row);
  if (error && error.code !== "23505") {
    console.error("payment event save failed", {
      eventType: row.event_type,
      orderId: row.order_id,
      code: error.code,
      message: error.message,
    });
  }
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

  const receiptsEnabled = process.env.YOOKASSA_RECEIPTS_ENABLED === "true";
  if (receiptsEnabled && !email) {
    return NextResponse.redirect(checkoutUrl(request.url, plan, "email_required"), 303);
  }
  const vatCode = Number(process.env.YOOKASSA_VAT_CODE);
  if (receiptsEnabled && (!Number.isInteger(vatCode) || vatCode < 1 || vatCode > 6)) {
    console.error("YooKassa receipt configuration is invalid");
    return NextResponse.redirect(checkoutUrl(request.url, plan, "unavailable"), 303);
  }

  const db = getSupabaseAdmin();
  const chatId = Number(auth.chatId);
  const [{ data: product, error: productError }, access] = await Promise.all([
    db
      .from("subscription_products")
      .select("plan,title,description,price_rub,period_days,enabled")
      .eq("plan", plan)
      .eq("enabled", true)
      .maybeSingle(),
    subscriptionAccess(chatId),
  ]);

  if (productError || !product) {
    console.error("subscription product unavailable", { plan, productError });
    return NextResponse.redirect(checkoutUrl(request.url, plan, "unavailable"), 303);
  }
  if (
    plan === "premium" &&
    access.premium &&
    access.state === "active" &&
    !access.current_period_end
  ) {
    return NextResponse.redirect(checkoutUrl(request.url, plan, "already_active"), 303);
  }

  const termsAcceptedAt = new Date().toISOString();
  const { data: preparedData, error: prepareError } = await (db as any).rpc(
    "prepare_yookassa_order_v1",
    {
      _chat_id: chatId,
      _plan: plan,
      _amount_rub: Number(product.price_rub),
      _receipt_email: email || null,
      _metadata: {
        period_days: Number(product.period_days),
        terms_accepted_at: termsAcceptedAt,
      },
    },
  );
  const order = (Array.isArray(preparedData) ? preparedData[0] : preparedData) as PreparedOrder | null;

  if (prepareError || !order?.id) {
    console.error("payment order preparation failed", {
      plan,
      chatId,
      code: prepareError?.code,
      message: prepareError?.message,
    });
    return NextResponse.redirect(checkoutUrl(request.url, plan, "order"), 303);
  }

  if (order.provider_payment_id) {
    try {
      const processed = await verifyAndProcessYooPayment(order.provider_payment_id);
      if (processed.status === "succeeded") {
        return NextResponse.redirect(new URL("/client/plan?payment=success", request.url), 303);
      }
      if (processed.status === "canceled") {
        return NextResponse.redirect(checkoutUrl(request.url, plan, "canceled"), 303);
      }

      const recoveredUrl = processed.payment.confirmation?.confirmation_url || order.confirmation_url;
      if (recoveredUrl) {
        if (recoveredUrl !== order.confirmation_url) {
          await (db.from("payment_orders") as any)
            .update({ confirmation_url: recoveredUrl, updated_at: new Date().toISOString() })
            .eq("id", order.id);
        }
        return NextResponse.redirect(recoveredUrl, 303);
      }
      return NextResponse.redirect(checkoutUrl(request.url, plan, "processing"), 303);
    } catch (error) {
      console.error("existing YooKassa payment recovery failed", {
        orderId: order.id,
        paymentId: order.provider_payment_id,
        transient: isTransientYooKassaError(error),
        error,
      });
      return NextResponse.redirect(
        checkoutUrl(request.url, plan, isTransientYooKassaError(error) ? "processing" : "provider"),
        303,
      );
    }
  }

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

  if (receiptsEnabled) {
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

  let payment;
  try {
    payment = await createYooPayment(body, order.idempotency_key);
  } catch (error) {
    const transient = isTransientYooKassaError(error);
    const now = new Date().toISOString();
    const metadata = {
      ...(order.metadata || {}),
      provider_create_state: transient ? "unknown" : "failed",
      provider_attempted_at: now,
    };

    await (db.from("payment_orders") as any)
      .update({ status: transient ? "pending" : "failed", metadata, updated_at: now })
      .eq("id", order.id);
    await recordEvent(db, {
      order_id: order.id,
      chat_id: chatId,
      provider: "yookassa",
      event_type: transient ? "payment.create_unknown" : "payment.failed",
      amount_rub: Number(order.amount_rub),
      plan,
      status: transient ? "pending" : "failed",
      payload: { stage: "create", transient },
      updated_at: now,
    });

    console.error("YooKassa payment creation failed", {
      orderId: order.id,
      chatId,
      plan,
      transient,
      error,
    });
    return NextResponse.redirect(
      checkoutUrl(request.url, plan, transient ? "processing" : "provider"),
      303,
    );
  }

  const confirmationUrl = payment.confirmation?.confirmation_url || null;
  const now = new Date().toISOString();
  const metadata = {
    ...(order.metadata || {}),
    period_days: Number(product.period_days),
    terms_accepted_at: termsAcceptedAt,
    provider_created_at: payment.created_at || null,
    provider_create_state: "created",
  };
  const { error: updateError } = await (db.from("payment_orders") as any)
    .update({
      provider_payment_id: payment.id,
      confirmation_url: confirmationUrl,
      status: "pending",
      updated_at: now,
      metadata,
    })
    .eq("id", order.id);

  if (updateError) {
    console.error("YooKassa payment persistence failed", {
      orderId: order.id,
      paymentId: payment.id,
      code: updateError.code,
      message: updateError.message,
    });
    return NextResponse.redirect(checkoutUrl(request.url, plan, "processing"), 303);
  }

  await recordEvent(db, {
    order_id: order.id,
    chat_id: chatId,
    provider: "yookassa",
    event_type: "payment.created",
    external_id: payment.id,
    amount_rub: Number(order.amount_rub),
    plan,
    status: payment.status,
    payload: payment,
    updated_at: now,
  });

  if (payment.status === "succeeded" || payment.status === "canceled") {
    try {
      const processed = await verifyAndProcessYooPayment(payment.id);
      return NextResponse.redirect(
        new URL(
          processed.status === "succeeded"
            ? "/client/plan?payment=success"
            : "/client/plan?payment=canceled",
          request.url,
        ),
        303,
      );
    } catch (error) {
      console.error("immediate YooKassa payment verification failed", {
        orderId: order.id,
        paymentId: payment.id,
        error,
      });
      return NextResponse.redirect(checkoutUrl(request.url, plan, "processing"), 303);
    }
  }

  if (!confirmationUrl) {
    return NextResponse.redirect(checkoutUrl(request.url, plan, "processing"), 303);
  }
  return NextResponse.redirect(confirmationUrl, 303);
}
