import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const pathname = req.nextUrl.pathname;
    const parts = pathname.split("/");
    const routineId = parts[parts.length - 1];

    if (!routineId) {
      return NextResponse.json(
        { error: "Missing routine ID" },
        { status: 400 }
      );
    }

    const data = await api.get(`/routine-details/routine/${routineId}`, {
      req,
    });
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
