import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { requireAdmin } from "@/server/guards";

/**
 * Issues short-lived upload tokens so the browser can send image bytes
 * straight to Blob storage.
 *
 * Routing the file through a server action instead would cap uploads at the
 * 1 MB default action body limit — and raising that limit only moves the
 * ceiling, since the bytes would still land in a serverless function's memory
 * before being forwarded on.
 *
 * The token is the security boundary: it is minted only for an admin, and it
 * carries the content-type and size restrictions with it, so the constraints
 * are enforced by Blob rather than by the client that asked for them.
 */
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  // Checked explicitly so a missing store reads as a setup problem rather than
  // the library's "Vercel Blob: No token found" surfacing as a failed upload.
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Image uploads are not configured. Create a Vercel Blob store and set BLOB_READ_WRITE_TOKEN.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        await requireAdmin();

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
          ],
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          // Two products both called "hero.jpg" must not overwrite each other.
          addRandomSuffix: true,
        };
      },
      // Nothing to record here: the URL is written to product_images when the
      // admin saves the form, so an abandoned edit leaves no database row.
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(result);
  } catch (error) {
    const denied =
      error instanceof Error &&
      (error.message === "UNAUTHENTICATED" || error.message === "FORBIDDEN");

    if (!denied) console.error("Blob upload token request failed", error);

    return NextResponse.json(
      { error: denied ? "Not permitted." : "Upload could not be started." },
      { status: denied ? 403 : 400 },
    );
  }
}
