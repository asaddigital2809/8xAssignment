import "server-only";
import { NextResponse } from "next/server";

/** Runs a route handler, turning unexpected failures into a generic JSON 500 (details go to the server log only). */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}
