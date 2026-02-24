import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

function getImageDir(): string {
  const dir = process.env.PLANCLAVE_IMAGE_DIR || "./data/images";
  const resolved = path.isAbsolute(dir)
    ? dir
    : path.resolve(process.cwd(), dir);

  if (!fs.existsSync(resolved)) {
    fs.mkdirSync(resolved, { recursive: true });
  }

  return resolved;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = path.extname(file.name) || ".png";
  const filename = `${crypto.randomUUID()}${ext}`;
  const imageDir = getImageDir();
  const filePath = path.join(imageDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return NextResponse.json({
    url: `/api/upload?path=${encodeURIComponent(filename)}`,
  });
}

export async function GET(request: NextRequest) {
  const filename = request.nextUrl.searchParams.get("path");

  if (!filename) {
    return NextResponse.json(
      { error: "path query param is required" },
      { status: 400 }
    );
  }

  // Prevent directory traversal
  const sanitized = path.basename(filename);
  const imageDir = getImageDir();
  const filePath = path.join(imageDir, sanitized);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const data = fs.readFileSync(filePath);
  const ext = path.extname(sanitized).toLowerCase();

  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };

  const contentType = mimeTypes[ext] || "application/octet-stream";

  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
