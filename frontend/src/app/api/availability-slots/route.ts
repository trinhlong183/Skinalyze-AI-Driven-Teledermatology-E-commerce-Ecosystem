import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const data = await api.post("/availability-slots", body, { req });

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
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

