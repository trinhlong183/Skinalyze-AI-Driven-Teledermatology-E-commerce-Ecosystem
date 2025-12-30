import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest
  //   context: { params: { id: string } }
) {
  try {
    const pathname = req.nextUrl.pathname;
    const parts = pathname.split("/");
    const id = parts[parts.length - 2];

    if (!id) {
      return NextResponse.json(
        { error: "Missing appointment ID" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const data = await api.post(`/admin/appointments/${id}/resolve`, body, {
      req,
    });

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
