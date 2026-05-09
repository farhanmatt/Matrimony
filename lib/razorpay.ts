import Razorpay from "razorpay";

// Lazy factory — only called at runtime, not build time
export function getRazorpay() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

