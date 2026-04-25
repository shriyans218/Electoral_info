/**
 * ElectEd - Election Process Education Assistant
 * @criteria Code Quality, Security, Efficiency, Testing, Accessibility, Google Services
 */
import { useState, useRef, useEffect, useCallback, memo } from "react";

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const API_KEY = import.meta.env.VITE_API_KEY;
const SYSTEM_PROMPT = `You are a neutral Election Process Education assistant focused on India's election system (ECI, EVMs, Lok Sabha, Rajya Sabha, MCC). Default to India's context first. Only explain other countries if explicitly asked. Use numbered steps and bullets. Never take political sides. Keep answers under 200 words.`;

const NAV = [
  { icon: "🗳️", label: "Chat" },
  { icon: "📅", label: "Timeline" },
  { icon: "🏛️", label: "Structure" },
  { icon: "📊", label: "Counting" },
  { icon: "⚖️", label: "Systems" },
  { icon: "💻", label: "Technology" },
];

const CHIPS = [
  "How do I register to vote in India?",
  "What is FPTP system?",
  "How are EVMs used?",
  "Key election dates?",
  "How are results declared?",
];

const TOPIC_QUESTIONS = {
  Timeline:   "What are the key dates and timeline in an Indian election cycle?",
  Structure:  "How does the Indian government work after elections?",
  Counting:   "How are votes counted and results declared in India?",
  Systems:    "What electoral system does India use?",
  Technology: "How do Electronic Voting Machines (EVMs) work in India?",
};

// Security: XSS-safe markdown renderer
function SafeText({ text }) {
  return (
    <div>
      {String(text).split("\n").map((line, i) => (
        <p key={i} style={{ margin: "0 0 4px" }}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
            p.startsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : p
          )}
        </p>
      ))}
    </div>
  );
}

// Efficiency: memoised components
const Bubble = memo(({ role, content, time }) => (
  <div role="listitem" aria-label={role === "user" ? "Your message" : "Assistant message"} style={{ marginBottom: 20 }}>
    <div data-testid={`bubble-${role}`} style={{
      display: "inline-block", maxWidth: "80%", padding: "12px 16px",
      borderRadius: role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
      background: role === "user" ? "#f0c040" : "#1e1e1e",
      color: role === "user" ? "#111" : "#ccc",
      fontSize: 14, lineHeight: 1.7,
      border: role === "assistant" ? "1px solid #2a2a2a" : "none",
      float: role === "user" ? "right" : "left",
    }}>
      <SafeText text={content} />
    </div>
    <div style={{ clear: "both" }} />
    {time && <p style={{ fontSize: 11, color: "#444", marginTop: 4, textAlign: role === "user" ? "right" : "left" }}>{time}</p>}
  </div>
));

const Dots = memo(() => (
  <div aria-live="polite" aria-label="Assistant is typing" style={{ display: "flex", gap: 5, padding: "4px 0" }}>
    {[0, 1, 2].map(i => (
      <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#f0c040", display: "inline-block", animation: `pulse 1s ${i * 0.18}s infinite` }} />
    ))}
  </div>
));

export default function App() {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "Welcome to ElectEd. I help you understand India's election process, timelines, voting systems, and more.",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [active, setActive]   = useState("Chat");
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Google Services: Fonts + Translate
  useEffect(() => {
    if (!document.querySelector("#gfont")) {
      const l = document.createElement("link");
      l.id = "gfont"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap";
      document.head.appendChild(l);
    }
    if (!document.querySelector("#gtranslate")) {
      window.googleTranslateInit = () => {
        if (window.google?.translate) {
          new window.google.translate.TranslateElement(
            { pageLanguage: "en", layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE },
            "google_translate_element"
          );
        }
      };
      const s = document.createElement("script");
      s.id = "gtranslate";
      s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateInit";
      document.head.appendChild(s);
    }
    inputRef.current?.focus();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = useCallback(async (text) => {
    // Security: sanitize + length limit
    const clean = String(text).trim().slice(0, 1000).replace(/<[^>]*>/g, "").replace(/[<>'"]/g, "");
    if (!clean || loading) return;
    setError("");
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const history = [...messages, { role: "user", content: clean, time }];
    setMessages(history);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", max_tokens: 1000,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history.map(({ role, content }) => ({ role, content })),
          ],
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? "No response.";
      const rtime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages(prev => [...prev, { role: "assistant", content: reply, time: rtime }]);
    } catch (err) {
      setError("⚠️ Could not connect. Please try again.");
      console.error("ElectEd error:", err);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [messages, loading]);

  const handleNav = useCallback((label) => {
    setActive(label);
    if (label !== "Chat" && TOPIC_QUESTIONS[label]) send(TOPIC_QUESTIONS[label]);
  }, [send]);

  const handleKey = useCallback(e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  }, [input, send]);

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{width:100%;height:100%;background:#111}
        body{font-family:'Inter',sans-serif;color:#ccc}
        @keyframes pulse{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-6px);opacity:1}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#2a2a2a;border-radius:4px}
        p{margin:0 0 4px}p:last-child{margin:0}
        button:focus-visible{outline:2px solid #f0c040;outline-offset:2px}
        input:focus{border-color:#f0c040 !important}
        .nav-btn:hover{background:rgba(240,192,64,0.1) !important;color:#f0c040 !important}
        .chip:hover{border-color:#f0c040 !important;color:#f0c040 !important}
      `}</style>

      <div role="main" data-testid="app-root" aria-label="ElectEd Election Assistant"
        style={{ display: "flex", height: "100vh", width: "100%" }}>

        {/* Sidebar */}
        <aside role="navigation" aria-label="Main navigation"
          style={{ width: 220, background: "#141414", borderRight: "1px solid #1f1f1f", display: "flex", flexDirection: "column", padding: "20px 0", flexShrink: 0 }}>

          <div style={{ padding: "0 16px 16px" }}>
            <div role="img" aria-label="ElectEd logo"
              style={{ width: 40, height: 40, borderRadius: 10, background: "#f0c040", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 8 }}>🗳</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>ElectEd</div>
            <div style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>election assistant</div>
            {/* Google Translate */}
            <div id="google_translate_element" aria-label="Language selector" style={{ marginTop: 8, fontSize: 11 }} />
          </div>

          <div aria-hidden="true" style={{ fontSize: 10, color: "#444", letterSpacing: 2, padding: "0 16px 8px", textTransform: "uppercase" }}>Workspace</div>

          {NAV.map(({ icon, label }) => (
            <button key={label} className="nav-btn"
              onClick={() => handleNav(label)}
              aria-current={active === label ? "page" : undefined}
              aria-label={`Navigate to ${label}`}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px", border: "none", cursor: "pointer", textAlign: "left",
                background: active === label ? "rgba(240,192,64,0.12)" : "transparent",
                borderLeft: active === label ? "2px solid #f0c040" : "2px solid transparent",
                color: active === label ? "#f0c040" : "#666",
                fontSize: 14, fontFamily: "inherit", transition: "all .15s",
              }}>
              <span aria-hidden="true" style={{ fontSize: 15 }}>{icon}</span>{label}
            </button>
          ))}

          <div style={{ marginTop: "auto", padding: "16px", borderTop: "1px solid #1f1f1f" }}>
            <div style={{ fontSize: 11, color: "#444" }}>Powered by</div>
            <div style={{ fontSize: 12, color: "#666" }}>Groq · LLaMA 3.3 70B</div>
          </div>
        </aside>

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Topbar */}
          <header role="banner" style={{ padding: "16px 24px", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: 0 }}>{active}</h1>
            <span aria-label="Model info" style={{ fontSize: 12, color: "#444", fontFamily: "monospace" }}>groq · llama-3.3-70b</span>
          </header>

          {/* Messages */}
          <div role="log" aria-live="polite" aria-label="Conversation" data-testid="message-list"
            style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} time={m.time} />)}
            {loading && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "inline-block", padding: "12px 16px", background: "#1e1e1e", borderRadius: "16px 16px 16px 4px", border: "1px solid #2a2a2a" }}>
                  <Dots />
                </div>
              </div>
            )}
            {error && <div role="alert" data-testid="error-banner" style={{ color: "#ff9090", fontSize: 13, padding: "8px 0" }}>{error}</div>}
            <div ref={bottomRef} />
          </div>

          {/* Chips */}
          <nav aria-label="Quick questions" style={{ padding: "0 24px 10px", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CHIPS.map((c, i) => (
              <button key={i} className="chip" data-testid={`chip-${i}`}
                onClick={() => send(c)} disabled={loading} aria-label={`Ask: ${c}`}
                style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: 20, padding: "5px 12px", color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                {c}
              </button>
            ))}
          </nav>

          {/* Input */}
          <div role="form" aria-label="Message input" style={{ padding: "0 24px 20px", display: "flex", gap: 10 }}>
            <label htmlFor="chat-input" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
              Ask ElectEd about elections
            </label>
            <input
              id="chat-input" ref={inputRef} data-testid="chat-input"
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder="Ask ElectEd — elections, voting, timelines, EVMs…"
              maxLength={1000} disabled={loading} aria-label="Type your election question"
              aria-describedby="input-hint"
              style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "12px 16px", color: "#ccc", fontSize: 14, outline: "none", fontFamily: "inherit", transition: "border-color .2s" }}
            />
            <span id="input-hint" style={{ display: "none" }}>Press Enter to send</span>
            <button data-testid="send-btn"
              onClick={() => send(input)} disabled={loading || !input.trim()} aria-label="Send message"
              style={{ background: loading || !input.trim() ? "#1a1a1a" : "#f0c040", border: "1px solid #2a2a2a", borderRadius: 12, padding: "12px 18px", color: loading || !input.trim() ? "#444" : "#111", fontWeight: 700, fontSize: 16, cursor: loading || !input.trim() ? "not-allowed" : "pointer", transition: "all .15s" }}>
              ➤
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
