import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { dermatologistId: string } }
) {
  try {
    const { dermatologistId } = params;
    const searchParams = req.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");

    const query = customerId ? `?customerId=${customerId}` : "";

    const data = await api.get(
      `/treatment-routines/dermatologist/${dermatologistId}${query}`,
      { req }
    );

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
