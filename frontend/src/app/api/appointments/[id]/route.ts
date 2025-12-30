import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

// Notify Next.js do not cache  result of API GET request. Ensure always fresh data.
export const dynamic = "force-dynamic";
export async function GET(
  req: NextRequest
  // context: { params: { id: string } }
) {
  try {
    // pathname: "/api/appointments/abc-123-xyz"
    const pathname = req.nextUrl.pathname;
    const parts = pathname.split("/");
    // Get the last part as ID
    const id = parts[parts.length - 1];
    // const { id } = context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Missing appointment ID in URL" },
        { status: 400 }
      );
    }
    const data = await api.get(`/appointments/${id}`, { req });

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
