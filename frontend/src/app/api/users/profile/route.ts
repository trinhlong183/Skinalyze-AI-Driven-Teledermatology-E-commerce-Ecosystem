import { api, handleApiError } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    // Handle FormData
    const formData = await req.formData();
    
    // Forward directly to backend - let the backend handle the boolean parsing
    const result = await api.patch("/users/profile", formData, { req });
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}