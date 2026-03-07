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
            gap: "22px"
          }}
        >
          <div
            style={{
              width: "92px",
              height: "92px",
              borderRadius: "26px",
              background: "linear-gradient(150deg, #56b7ff 0%, #2f74ff 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 14px 30px rgba(5, 14, 33, 0.42)"
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "999px",
                background: "#d8ff4f",
                border: "4px solid #111111",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: "86px",
                  height: "86px",
                  borderRadius: "999px",
                  border: "4px solid #111111",
                  borderLeftColor: "transparent",
                  borderRightColor: "transparent",
                  transform: "rotate(32deg)"
                }}
              />
              <div
                style={{
                  position: "absolute",
                  width: "86px",
                  height: "86px",
                  borderRadius: "999px",
                  border: "4px solid #111111",
                  borderTopColor: "transparent",
                  borderBottomColor: "transparent",
                  transform: "rotate(32deg)"
                }}
              />
              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 900,
                  letterSpacing: "-0.2px",
                  color: "#111111",
                  zIndex: 2
                }}
              >
                MR
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px"
            }}
          >
            <div
              style={{
                fontSize: "40px",
                fontWeight: 900,
                letterSpacing: "-0.8px",
                lineHeight: 1
              }}
            >
              MATCH RAPIDO
            </div>
            <div
              style={{
                fontSize: "17px",
                fontWeight: 700,
                letterSpacing: "1.6px",
                color: "#cfe1ff"
              }}
            >
              CLUB TENNIS MATCHING
            </div>
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
