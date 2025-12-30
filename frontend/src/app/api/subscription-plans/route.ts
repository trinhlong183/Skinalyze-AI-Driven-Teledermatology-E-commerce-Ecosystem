import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams.toString();
    const data = await api.get(`/subscription-plans?${searchParams}`, { req });
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await api.post("/subscription-plans", body, { req });
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
