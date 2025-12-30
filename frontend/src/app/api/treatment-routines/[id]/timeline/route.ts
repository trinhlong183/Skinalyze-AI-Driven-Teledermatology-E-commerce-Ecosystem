import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const data = await api.get(`/treatment-routines/${id}/timeline`, { req });
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
