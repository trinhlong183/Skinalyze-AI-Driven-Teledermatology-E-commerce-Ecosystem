import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = context.params.id;

    const body = await req.json();
    const data = await api.patch(`/routine-details/${id}`, body, { req });
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const id = context.params.id;
    const data = await api.delete(`/routine-details/${id}`, { req });
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
