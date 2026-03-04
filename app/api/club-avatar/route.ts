const DEFAULT_CLUB_AVATAR_URL = "https://sires.azurewebsites.net/lib/images/ClubMitre.png";

function fallbackSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7bb3ff"/>
      <stop offset="100%" stop-color="#92cbff"/>
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="31" fill="url(#g)"/>
  <text x="32" y="38" text-anchor="middle" font-size="30" font-family="Arial, sans-serif" font-weight="700" fill="#0e1521">M</text>
</svg>`;
}

export async function GET() {
  const source = process.env.NEXT_PUBLIC_CLUB_AVATAR_URL?.trim() || DEFAULT_CLUB_AVATAR_URL;

  try {
    const upstream = await fetch(source, {
      headers: {
        "user-agent": "match-rapido/club-avatar"
      },
      next: { revalidate: 60 * 60 }
    });

    if (!upstream.ok) {
      throw new Error(`upstream: ${upstream.status}`);
    }

    const bytes = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") || "image/png";

    return new Response(bytes, {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600, s-maxage=3600"
      }
    });
  } catch {
    return new Response(fallbackSvg(), {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=300"
      }
    });
  }
}
