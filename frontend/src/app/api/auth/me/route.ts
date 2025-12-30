import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token");
    const userData = cookieStore.get("user_data");

    if (!token || !userData) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = JSON.parse(userData.value);

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { authenticated: false, error: (error instanceof Error ? error.message : String(error)) },
      { status: 401 }
    );
  }
}
