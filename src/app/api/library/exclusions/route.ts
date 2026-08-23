import { NextResponse } from "next/server";
import {
  isKnownCatalogId,
  parseCatalogIdBody,
} from "@/lib/library-exclusions";
import {
  addLibraryExclusion,
  readLibraryExclusions,
} from "@/services/library-exclusions";

export async function GET() {
  const catalogIds = await readLibraryExclusions();
  return NextResponse.json({ data: { catalogIds } });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON.", code: "bad_json" },
      { status: 400 },
    );
  }

  const catalogId = parseCatalogIdBody(body);
  if (!catalogId) {
    return NextResponse.json(
      { error: "A valid catalogId is required.", code: "bad_request" },
      { status: 400 },
    );
  }

  if (!isKnownCatalogId(catalogId)) {
    return NextResponse.json(
      { error: "Unknown catalog item.", code: "not_found" },
      { status: 404 },
    );
  }

  try {
    const catalogIds = await addLibraryExclusion(catalogId);
    return NextResponse.json({ data: { catalogIds } });
  } catch {
    return NextResponse.json(
      { error: "Could not save the exclusion file.", code: "write_failed" },
      { status: 503 },
    );
  }
}
