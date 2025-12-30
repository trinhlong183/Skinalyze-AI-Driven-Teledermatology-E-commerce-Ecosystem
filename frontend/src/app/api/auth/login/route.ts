import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "http://localhost:3000/api/v1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Call backend API
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: result.message || "Login failed" },
        { status: response.status }
      );
    }

    const fullUser = result.data.user;

    // Minimal object to set cookie (4KB size limit)
    const minimalUser = {
      userId: fullUser.userId,
      email: fullUser.email,
      fullName: fullUser.fullName,
      role: fullUser.role,
      isActive: fullUser.isActive,
      // (Remove 'photoUrl', 'addresses', 'balance', 'createdAt', etc.)
    };

    // Create response
    const res = NextResponse.json({
      success: true,
      user: fullUser,
    });

    // Set httpOnly cookie with access token
    res.cookies.set({
      name: "access_token",
      value: result.data.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    // Set user data in a separate cookie (not httpOnly, so client can read it)
    res.cookies.set({
      name: "user_data",
      value: JSON.stringify(minimalUser),
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return res;
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : String(error)) || "Internal server error" },
      { status: 500 }
    );
  }
}
