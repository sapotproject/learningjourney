const APPS_SCRIPT_PUBLIC_URL = "https://script.google.com/macros/s/AKfycbyFZrJEXsqktYS-Eamf4X1B7b-MJk-86aw-sYLhiCBv3636XDATjwQqf2YI6Q2mFrnzYw/exec";

export async function onRequest(context) {
  const appsScriptUrl = APPS_SCRIPT_PUBLIC_URL;

  if (!appsScriptUrl || appsScriptUrl.includes("PASTE_YOUR")) {
    return jsonResponse({
      success: false,
      message: "Apps Script public URL is not set inside functions/api/public.js."
    }, 500, 0);
  }

  const endpoint = appsScriptUrl.includes("?")
    ? appsScriptUrl + "&api=public"
    : appsScriptUrl + "?api=public";

  const cache = caches.default;
  const cacheKey = new Request(context.request.url, context.request);
  const cached = await cache.match(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const upstream = await fetch(endpoint, {
      headers: {
        "Accept": "application/json"
      }
    });

    if (!upstream.ok) {
      return jsonResponse({
        success: false,
        message: "Apps Script public endpoint returned HTTP " + upstream.status
      }, 502, 0);
    }

    const text = await upstream.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      return jsonResponse({
        success: false,
        message: "Apps Script did not return valid JSON."
      }, 502, 0);
    }

    const response = jsonResponse(data, 200, 60);
    context.waitUntil(cache.put(cacheKey, response.clone()));

    return response;
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error.message || "Unable to fetch public data."
    }, 502, 0);
  }
}

function jsonResponse(data, status = 200, maxAge = 60) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": maxAge > 0
        ? `public, max-age=${maxAge}, s-maxage=${maxAge}`
        : "no-store"
    }
  });
}