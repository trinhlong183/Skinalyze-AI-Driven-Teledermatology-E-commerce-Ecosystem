import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const data = await api.get(`/customers/${id}`, { req });
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
