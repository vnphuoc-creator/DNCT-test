"use client";

// Đồng hồ đo điểm số kiểu bảng điều khiển kỹ thuật — điểm nhấn thị giác
// chính của toàn bộ giao diện, gợi liên tưởng tới các đồng hồ đo áp suất/
// điện áp trên tủ điều khiển mà đối tượng người dùng (đội kỹ thuật vận
// hành) làm việc hằng ngày.
export default function ScoreGauge({ percent, size = 176, label = "ĐIỂM SỐ" }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = size / 2 - 14;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = clamped >= 50 ? "var(--ok)" : "var(--danger)";

  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * 360 - 90;
    const rad = (angle * Math.PI) / 180;
    const outer = radius + 8;
    const inner = radius + 2;
    return {
      x1: center + inner * Math.cos(rad),
      y1: center + inner * Math.sin(rad),
      x2: center + outer * Math.cos(rad),
      y2: center + outer * Math.sin(rad),
    };
  });

  return (
    <div className="gauge-wrap">
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--panel-border)"
            strokeWidth={9}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0 }}>
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke="var(--text-faint)"
              strokeWidth={1.5}
            />
          ))}
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span className="gauge-readout">{Math.round(clamped)}%</span>
        </div>
      </div>
      <span className="gauge-label">{label}</span>
    </div>
  );
}
