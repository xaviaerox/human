import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 50%, #115e59 100%)',
          borderRadius: '40px',
        }}
      >
        <svg viewBox="0 0 512 512" width="120" height="120">
          <circle cx="256" cy="256" r="160" fill="none" stroke="#fef08a" strokeWidth="8" opacity="0.35" />
          <path
            d="M 256 80 C 256 180 180 256 80 256 C 180 256 256 332 256 432 C 256 332 332 256 432 256 C 332 256 256 180 256 80 Z"
            fill="#fef08a"
          />
          <circle cx="256" cy="256" r="28" fill="#ffffff" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
