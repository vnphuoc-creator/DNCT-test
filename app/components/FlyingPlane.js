// Máy bay bay ngang nền web — hình vẽ dạng véc-tơ đơn giản (không phải ảnh thật),
// gắn logo công ty vào 1 miếng dán trên thân, kiểu logo hãng bay thật.
// Đặt cố định phía sau nội dung, mờ nhẹ, chuyển động chậm để không gây rối mắt.
export default function FlyingPlane() {
  return (
    <div className="plane-track" aria-hidden="true">
      <svg
        className="plane-svg"
        width="220"
        height="90"
        viewBox="0 0 220 90"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Thân máy bay */}
        <path
          d="M10 46 C 10 38, 26 34, 46 34 L150 34 C 168 34, 182 40, 196 45 C182 50, 168 56, 150 56 L46 56 C26 56, 10 54, 10 46 Z"
          fill="var(--panel-raised)"
          stroke="var(--amber-dim)"
          strokeWidth="1.5"
        />
        {/* Mũi máy bay */}
        <path d="M196 45 L216 43 L216 47 Z" fill="var(--amber-dim)" />
        {/* Cánh chính */}
        <path
          d="M95 34 L60 6 L78 6 L120 34 Z"
          fill="var(--panel-border)"
          stroke="var(--amber-dim)"
          strokeWidth="1"
        />
        <path
          d="M95 56 L60 84 L78 84 L120 56 Z"
          fill="var(--panel-border)"
          stroke="var(--amber-dim)"
          strokeWidth="1"
        />
        {/* Đuôi lái */}
        <path
          d="M32 34 L18 14 L34 18 L44 34 Z"
          fill="var(--panel-border)"
          stroke="var(--amber-dim)"
          strokeWidth="1"
        />
        {/* Cửa sổ */}
        <circle cx="118" cy="45" r="2" fill="var(--amber)" opacity="0.7" />
        <circle cx="130" cy="45" r="2" fill="var(--amber)" opacity="0.7" />
        <circle cx="142" cy="45" r="2" fill="var(--amber)" opacity="0.7" />
        <circle cx="154" cy="45" r="2" fill="var(--amber)" opacity="0.7" />
        <circle cx="166" cy="45" r="2" fill="var(--amber)" opacity="0.7" />

        {/* Miếng dán logo trên thân, kiểu logo hãng bay */}
        <rect x="52" y="38" width="46" height="16" rx="3" fill="#f4f5f0" />
        <image href="/logo.png" x="54" y="41.5" width="42" height="9" preserveAspectRatio="xMidYMid meet" />
      </svg>
    </div>
  );
}
