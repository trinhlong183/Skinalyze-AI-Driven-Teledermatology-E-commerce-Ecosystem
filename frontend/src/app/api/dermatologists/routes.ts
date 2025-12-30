import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Get search params from the client request
    const { search } = request.nextUrl;

    const data = await api.get(`/availability-slots${search}`, {
      req: request,
    });

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
