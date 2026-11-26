import { NextResponse } from "next/server";

/** Turns a ZodError into one readable sentence instead of a raw JSON dump. */
export function formatZodError(err: any): string {
  const issues: any[] = Array.isArray(err?.issues) ? err.issues : [];
  const messages = issues.map((issue) => {
    const msg = String(issue.message || "Invalid value");
    const path = (issue.path || []).filter((p: unknown) => typeof p === "string") as string[];
    const field = path[path.length - 1];
    // Our own schemas already carry readable messages; only decorate zod's generic ones.
    if (field && /^(Required|Expected|Invalid|String must|Number must)/.test(msg)) {
      const pretty = field.replace(/([A-Z])/g, " $1").toLowerCase();
      return `${pretty}: ${msg}`;
    }
    return msg;
  });
  return Array.from(new Set(messages)).join(". ") || "Invalid input data";
}

/** Consistent JSON error responses; never leaks raw Prisma/driver internals. */
export function apiError(err: any, fallbackStatus = 400) {
  if (err?.name === "ZodError") {
    return NextResponse.json({ error: formatZodError(err) }, { status: 400 });
  }
  if (err?.code === "P2002") {
    return NextResponse.json(
      { error: "This record already exists (duplicate). Please refresh and check before trying again." },
      { status: 409 }
    );
  }
  if (err?.code === "P2025") {
    return NextResponse.json({ error: "Record not found." }, { status: 404 });
  }
  if (typeof err?.name === "string" && err.name.startsWith("PrismaClient")) {
    console.error("[api] database error:", err);
    return NextResponse.json({ error: "Database error. Please try again in a moment." }, { status: 500 });
  }
  const status = err?.statusCode || fallbackStatus;
  if (status >= 500) console.error("[api] error:", err);
  return NextResponse.json({ error: err?.message || "Something went wrong" }, { status });
}

export function httpError(status: number, message: string): Error {
  const err = new Error(message);
  (err as any).statusCode = status;
  return err;
}
