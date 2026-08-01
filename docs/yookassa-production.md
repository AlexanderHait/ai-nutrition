# ЮKassa — production configuration

## Vercel environment variables

Required for Production and Preview:

- `YOOKASSA_SHOP_ID` — shopId from ЮKassa.
- `YOOKASSA_SECRET_KEY` — secret API key from ЮKassa. Server only.
- `NEXT_PUBLIC_SITE_URL=https://smartnutrition-ai.ru`

Receipt settings are enabled only after the merchant receipt/tax configuration is confirmed:

- `YOOKASSA_RECEIPTS_ENABLED=true`
- `YOOKASSA_VAT_CODE` — choose the merchant's real VAT code with the accountant. Do not guess.
- `YOOKASSA_PAYMENT_SUBJECT=service`
- `YOOKASSA_PAYMENT_MODE=full_payment`

## ЮKassa webhook

Configure one incoming notification URL in the ЮKassa merchant account:

`https://smartnutrition-ai.ru/api/payments/yookassa/webhook`

Enable events:

- `payment.succeeded`
- `payment.canceled`

The endpoint does not trust the incoming payload. It retrieves the payment from the ЮKassa API again and compares payment ID, amount, currency, order, client and plan before changing access.

## Current commercial behavior

- Basic: 990 RUB / 30 days.
- Premium: 2,990 RUB / 30 days.
- Payment is one-time; there is no automatic card charge.
- Early renewal extends the existing period without losing remaining days.
- A repeated webhook is idempotent and cannot extend the subscription twice.
