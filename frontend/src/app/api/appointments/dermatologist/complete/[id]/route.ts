import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Missing appointment ID" },
        { status: 400 }
      );
    }

    const data = await api.patch(
      `/appointments/dermatologist/${id}/complete`,
      body,
      { req }
    );

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
