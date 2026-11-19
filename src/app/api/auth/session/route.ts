import { NextRequest, NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/firebase/session";

export async function GET(request: NextRequest) {
  const user = await verifyAdminRequest(request);
  if (!user) {
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 200 }
    );
  }
  return NextResponse.json(
    { authenticated: true, user },
    { status: 200 }
  );
}
