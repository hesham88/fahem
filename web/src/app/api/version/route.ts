import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.json({
    sha: process.env.NEXT_PUBLIC_BUILD_SHA || "unknown",
    builtAt: process.env.NEXT_PUBLIC_BUILD_TIME || "unknown",
  });
  
  // Set X-Robots-Tag to noindex to prevent indexing
  response.headers.set("X-Robots-Tag", "noindex");
  
  return response;
}
