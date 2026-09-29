"use client";

import { useEffect, useRef, useState } from "react";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Xin chào! Mình có thể giúp bạn tra cứu câu hỏi trong ngân hàng ôn tập — cứ hỏi thoải mái, ví dụ: \"có câu nào về turbo máy phát không?\" 👋" },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: newMessages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .slice(-8)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Xin lỗi, mình gặp lỗi: " + (data.message || "không rõ nguyên nhân") },
        ]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Không kết nối được, thử lại sau nhé." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        className="chat-widget-launcher no-print"
        onClick={() => setOpen((o) => !o)}
        aria-label="Mở trợ lý tra cứu câu hỏi"
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div className="chat-widget-panel no-print">
          <div className="chat-widget-header">
            <span>Trợ lý tra cứu câu hỏi</span>
            <button className="chat-widget-close" onClick={() => setOpen(false)} aria-label="Đóng">
              ✕
            </button>
          </div>

          <div className="chat-widget-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble chat-bubble-${m.role}`}>
                {m.content}
              </div>
            ))}
            {sending && <div className="chat-bubble chat-bubble-assistant chat-typing">Đang tra cứu...</div>}
            <div ref={bottomRef} />
          </div>

          <form className="chat-widget-input-row" onSubmit={handleSend}>
            <input
              className="field"
              style={{ margin: 0, flex: 1 }}
              type="text"
              placeholder="Hỏi về câu hỏi trong ngân hàng ôn tập..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button className="btn-primary" type="submit" disabled={sending} style={{ width: "auto", padding: "12px 16px" }}>
              Gửi
            </button>
          </form>
        </div>
      )}
    </>
  );
}
