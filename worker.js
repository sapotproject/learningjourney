/*
  Learning Journey / SchoolsPH R2 Upload Worker v1.0

  Required Cloudflare Worker R2 Binding:
  Variable name: ASSETS
  Bucket: schoolsph-assets

  Endpoints:
  GET  /                         health check
  POST /upload                   upload image to R2
  GET  /asset/<object-key>       serve image from R2
*/

const SCHOOL_SLUG = "learningjourney";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (!env.ASSETS) {
      return jsonResponse(
        {
          success: false,
          message: "Missing R2 binding. Please bind ASSETS to schoolsph-assets."
        },
        500
      );
    }

    if (request.method === "GET" && url.pathname === "/") {
      return jsonResponse({
        success: true,
        message: "Learning Journey R2 Worker is running."
      });
    }

    if (request.method === "GET" && url.pathname.startsWith("/asset/")) {
      return serveAsset(request, env);
    }

    if (request.method === "POST" && url.pathname === "/upload") {
      return uploadImage(request, env);
    }

    return jsonResponse(
      {
        success: false,
        message: "Invalid endpoint."
      },
      404
    );
  }
};

async function uploadImage(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return jsonResponse({ success: false, message: "No image file received." }, 400);
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!allowedTypes.includes(file.type)) {
      return jsonResponse({ success: false, message: "Invalid image type. Use JPG, PNG, WEBP, or GIF." }, 400);
    }

    const maxSize = 8 * 1024 * 1024;

    if (file.size > maxSize) {
      return jsonResponse({ success: false, message: "Image is too large. Maximum allowed size is 8MB." }, 400);
    }

    const extension = getExtension(file.name, file.type);
    const objectKey = `${SCHOOL_SLUG}/images/${createFileName(extension)}`;

    await env.ASSETS.put(objectKey, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000"
      }
    });

    const origin = new URL(request.url).origin;
    const imageUrl = `${origin}/asset/${objectKey}`;

    return jsonResponse({
      success: true,
      message: "Image uploaded successfully.",
      path: objectKey,
      url: imageUrl
    });

  } catch (error) {
    return jsonResponse({ success: false, message: error.message || String(error) }, 500);
  }
}

async function serveAsset(request, env) {
  const url = new URL(request.url);
  const objectKey = decodeURIComponent(url.pathname.replace("/asset/", ""));

  if (!objectKey) {
    return new Response("Missing object key", { status: 400 });
  }

  const object = await env.ASSETS.get(objectKey);

  if (!object) {
    return new Response("File not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000");
  headers.set("access-control-allow-origin", "*");

  return new Response(object.body, { headers });
}

function createFileName(extension) {
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hour = String(now.getUTCHours()).padStart(2, "0");
  const minute = String(now.getUTCMinutes()).padStart(2, "0");
  const second = String(now.getUTCSeconds()).padStart(2, "0");

  const random = crypto.randomUUID().slice(0, 8);

  return `${year}${month}${day}_${hour}${minute}${second}_${random}.${extension}`;
}

function getExtension(fileName, mimeType) {
  const cleaned = String(fileName || "").toLowerCase();
  const fromName = cleaned.split(".").pop();

  if (["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";

  return "jpg";
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
