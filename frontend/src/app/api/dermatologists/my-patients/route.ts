import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams.toString();

    const data = await api.get(`/dermatologists/my-patients?${searchParams}`, {
      req,
    });

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
