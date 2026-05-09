import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/payments — bulk update payment statuses
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      paymentIds?: string[];
      status?: "CREATED" | "PAID" | "FAILED";
    };

    const paymentIds = Array.isArray(body.paymentIds) ? body.paymentIds.filter(Boolean) : [];
    const status = body.status;

    if (!paymentIds.length || !status) {
      return NextResponse.json({ error: "Payment IDs and status are required" }, { status: 400 });
    }

    if (!["CREATED", "PAID", "FAILED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const result = await prisma.payment.updateMany({
      where: { id: { in: paymentIds } },
      data: { status },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("Admin payment bulk update error:", error);
    return NextResponse.json({ error: "Failed to update payments" }, { status: 500 });
  }
}
