import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Create response
    const res = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Clear cookies
    res.cookies.delete("access_token");
    res.cookies.delete("user_data");

    return res;
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : String(error)) || "Internal server error" },
      { status: 500 }
    );
  }
}
