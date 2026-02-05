import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e0704e",
          borderRadius: "6px",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          {/* 左脑轮廓 */}
          <path
            d="M12 3C9 3 7 4 6 6C4 6 3 8 3 10C3 12 4 13 4 15C4 17 6 20 10 21C11 21 12 21 12 21"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          {/* 右脑轮廓 */}
          <path
            d="M12 3C15 3 17 4 18 6C20 6 21 8 21 10C21 12 20 13 20 15C20 17 18 20 14 21C13 21 12 21 12 21"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          {/* 中线 */}
          <path d="M12 3V21" stroke="white" strokeWidth="1.5" />
          {/* 左脑褶皱 */}
          <path d="M8 8C7 9.5 7 12 8 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M5.5 11C6.5 12 7.5 12 8.5 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          {/* 右脑褶皱 */}
          <path d="M16 8C17 9.5 17 12 16 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M18.5 11C17.5 12 16.5 12 15.5 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
