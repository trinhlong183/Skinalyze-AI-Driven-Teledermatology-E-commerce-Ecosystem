import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const { slotIds } = await request.json();

    if (!Array.isArray(slotIds) || slotIds.length === 0) {
      return NextResponse.json(
        { error: "slotIds must be a non-empty array" },
        { status: 400 }
      );
    }

    await api.delete(`/availability-slots/batch`, {
      req: request,
      body: { slotIds },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
