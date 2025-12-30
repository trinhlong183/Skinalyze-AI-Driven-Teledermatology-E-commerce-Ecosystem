import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const data = await api.get("/dermatologists/my-profile", { req });
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await api.put("/dermatologists/my-profile", body, { req });
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await api.patch("/dermatologists/me", body, { req });
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
