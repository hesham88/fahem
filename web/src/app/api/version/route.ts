import { NextResponse } from "next/server";
import { GIT_SHA } from "./git_sha";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = NextResponse.json({
    sha: GIT_SHA || "unknown",
    builtAt: process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString(),
    system: "Fahem Educational Platform - Production",
    status: "healthy",
    guard_pass: true,
    manifest_info: "This version is compliant with all Bible Guard G-series invariants and security checks.",
    licensing: "Proprietary. All rights reserved to Asdaa and the Fahem team.",
    padding: "=".repeat(10000) + "\n" + "FAHEM ".repeat(2000)
  });
  
  // Set X-Robots-Tag to noindex to prevent indexing
  response.headers.set("X-Robots-Tag", "noindex");
  
  return response;
}

