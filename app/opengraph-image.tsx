import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background:
            "radial-gradient(1100px 540px at 0% 0%, #3f8cff 0%, transparent 60%), radial-gradient(900px 500px at 100% 100%, #2b5fbe 0%, transparent 56%), linear-gradient(135deg, #0e1a31 0%, #14284a 48%, #182f59 100%)",
          color: "#f5f9ff"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px"
          }}
        >
          <div
            style={{
              width: "58px",
              height: "58px",
              borderRadius: "999px",
              border: "4px solid #f7fbff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              fontWeight: 800
            }}
          >
            MR
          </div>
          <div
            style={{
              fontSize: "34px",
              fontWeight: 800,
              letterSpacing: "-0.5px"
            }}
          >
            Match Rapido
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              fontSize: "86px",
              fontWeight: 900,
              lineHeight: 1
            }}
          >
            Club Tennis
          </div>
          <div
            style={{
              fontSize: "40px",
              fontWeight: 700,
              color: "#d8e7ff"
            }}
          >
            Match en minutos
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "28px",
            color: "#dbe9ff"
          }}
        >
          <div>Publicar · Unirse · Jugar</div>
          <div>match-rapido.vercel.app</div>
        </div>
      </div>
    ),
    {
      ...size
    }
  );
}
