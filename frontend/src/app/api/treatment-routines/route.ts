import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await api.post("/treatment-routines", body, { req });
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
