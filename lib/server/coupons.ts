import type { Prisma } from "@prisma/client";

export const COUPON_ALREADY_USED_MESSAGE = "You have already used this coupon code.";
export const COUPON_ALREADY_USED_ERROR = "coupon_already_used";

type CouponUsageClient = Pick<Prisma.TransactionClient, "payment">;

export async function hasUserUsedCoupon(
  client: CouponUsageClient,
  userId: string,
  couponCode: string,
  excludingPaymentId?: string
): Promise<boolean> {
  const where: Prisma.PaymentWhereInput = {
    userId,
    couponCode,
    status: "PAID",
  };

  if (excludingPaymentId) {
    where.id = { not: excludingPaymentId };
  }

  const paidCouponPayment = await client.payment.findFirst({
    where,
    select: { id: true },
  });

  return Boolean(paidCouponPayment);
}
