"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Clock, Award, CheckCircle2, FileText } from "lucide-react";
import { getCurrentPeriod, formatPeriodLabel } from "../../lib/period";
import { getLocalSettings, fetchServerSettings } from "../../lib/settings";

export default function GuidePage() {
  const [settings, setSettings] = useState(getLocalSettings());

  useEffect(() => {
    fetchServerSettings().then((cfg) => {
      if (cfg) setSettings(cfg);
    });

    function onSettingsUpdate(e) {
      if (e.detail) setSettings(e.detail);
    }
    window.addEventListener("aht_settings_updated", onSettingsUpdate);
    return () => window.removeEventListener("aht_settings_updated", onSettingsUpdate);
  }, []);

  const totalQ = settings.questionsCount || 25;
  const passPct = settings.passScorePercent || 80;
  const excPct = settings.excellentScorePercent || 90;
  const passCount = Math.ceil((passPct / 100) * totalQ);
  const excCount = Math.ceil((excPct / 100) * totalQ);

  return (
    <div className="shell" style={{ width: "100%", maxWidth: 760, margin: "0 auto" }}>
      <div className="card" style={{ width: "100%", maxWidth: 760 }}>
        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--brand-cyan)", fontSize: 13, textDecoration: "none" }}>
            <ArrowLeft size={16} /> Trang chủ
          </a>
          <span className="badge badge-pass" style={{ fontSize: 11 }}>
            {formatPeriodLabel(getCurrentPeriod())}
          </span>
        </div>

        <div className="eyebrow" style={{ color: "var(--amber)", letterSpacing: "0.08em" }}>
          <BookOpen size={14} /> QUY ĐỊNH & HƯỚNG DẪN KIỂM TRA
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "4px 0 8px 0" }}>
          Quy chế Sát hạch Chuyên môn Đội ĐNCT
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--text-dim)", margin: "0 0 20px 0" }}>
          Hướng dẫn và quy định đánh giá định kỳ áp dụng cho toàn bộ kỹ sư, kỹ thuật viên Đội Điện Nước Công Trình — Công ty AHT.
        </p>

        {/* Section 1: Thời gian thi */}
        <div className="dashboard-section-box" style={{ background: "rgba(255,255,255,0.03)", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--brand-cyan)", fontWeight: 700, fontSize: 15 }}>
            <Clock size={18} /> 1. Khung thời gian mở bài thi chính thức
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, color: "var(--text)", lineHeight: 1.7 }}>
            <li>
              Hệ thống <strong>chỉ mở đề thi chính thức từ ngày {settings.monthlyOpenDay} đến hết ngày {settings.monthlyCloseDay} hằng tháng</strong>.
            </li>
            {settings.enableDailyHours && (
              <li>
                Khung giờ làm bài trong ngày: <strong>từ {settings.dailyOpenTime} đến {settings.dailyCloseTime}</strong>. Ngoài khung giờ này hệ thống sẽ tự động tạm đóng.
              </li>
            )}
            <li>Các lượt thi hoàn thành ngoài khoảng thời gian quy định sẽ không được tính điểm cho kỳ đánh giá.</li>
            <li>Mỗi nhân sự thực hiện <strong>01 lần thi chính thức</strong> trong mỗi kỳ đánh giá.</li>
            <li>
              Thời gian làm bài quy định: <strong>{settings.quizDurationMinutes} phút</strong> ({totalQ} câu hỏi trắc nghiệm).
            </li>
            <li>
              {settings.requireEmailVerification ? (
                <span>
                  Yêu cầu bảo mật: Thí sinh cần <strong>nhập chính xác địa chỉ Email</strong> đã được cấp quyền của mình để hệ thống xác thực trước khi làm bài.
                </span>
              ) : null}
            </li>
          </ul>
        </div>

        {/* Section 2: Tiêu chuẩn xếp loại */}
        <div className="dashboard-section-box" style={{ background: "rgba(255,255,255,0.03)", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "var(--ok)", fontWeight: 700, fontSize: 15 }}>
            <Award size={18} /> 2. Tiêu chuẩn đánh giá & Xếp loại năng lực ({totalQ} câu)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 10 }}>
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
              <strong style={{ color: "var(--amber)", fontSize: 14 }}>Xuất sắc (≥ {excPct}%)</strong>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
                Đạt từ {excCount} / {totalQ} câu trở lên. Nắm vững toàn diện hệ thống.
              </div>
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
              <strong style={{ color: "var(--ok)", fontSize: 14 }}>Đạt chuẩn ({passPct}% - {excPct - 1}%)</strong>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
                Đạt từ {passCount} đến {excCount - 1} / {totalQ} câu. Đạt yêu cầu vận hành an toàn.
              </div>
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.3)" }}>
              <strong style={{ color: "var(--danger)", fontSize: 14 }}>Cần đào tạo lại (&lt; {passPct}%)</strong>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
                Dưới {passCount} câu. Cần tham gia buổi sinh hoạt ôn tập kỹ thuật.
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Ngân hàng kiến thức */}
        <div className="dashboard-section-box" style={{ background: "rgba(255,255,255,0.03)", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "#38bdf8", fontWeight: 700, fontSize: 15 }}>
            <FileText size={18} /> 3. Danh mục các Hệ thống Kỹ thuật trọng tâm
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, fontSize: 13, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={14} style={{ color: "var(--ok)" }} /> Hệ thống Điện Trung thế 22kV</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={14} style={{ color: "var(--ok)" }} /> Hệ thống Trạm Biến áp & Tủ Hạ thế MSB</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={14} style={{ color: "var(--ok)" }} /> Máy phát điện dự phòng & ATS</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={14} style={{ color: "var(--ok)" }} /> Bộ lưu điện UPS & Nguồn DC</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={14} style={{ color: "var(--ok)" }} /> Hệ thống Cấp thoát nước & XLNT</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><CheckCircle2 size={14} style={{ color: "var(--ok)" }} /> An toàn lao động, 5S & PCCC</div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 24 }}>
          <a href="/practice">
            <button className="btn-primary" style={{ padding: "0 20px", height: 42, fontSize: 14 }}>
              <BookOpen size={16} /> Vào phần Luyện tập ngay
            </button>
          </a>
          <a href="/">
            <button className="btn-secondary" style={{ padding: "0 18px", height: 42, fontSize: 14 }}>
              Quay lại Trang chủ
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}
