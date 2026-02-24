import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIdentity, encodeIdentity } from "@/lib/auth";

export async function GET() {
  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(identity);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, name } = body;

  if (!email || !name) {
    return NextResponse.json(
      { error: "email and name are required" },
      { status: 400 }
    );
  }

  const encoded = encodeIdentity(email, name);
  const cookieStore = await cookies();
  cookieStore.set("planclave_identity", encoded, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });

  return NextResponse.json({ email, name });
}
