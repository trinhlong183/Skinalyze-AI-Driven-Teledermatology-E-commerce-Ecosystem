import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const body = await req.json();

    const data = await api.patch(
      `/appointments/dermatologist/${id}/report-no-show`,
      body,
      { req }
    );
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
