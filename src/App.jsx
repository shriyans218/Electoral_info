import { useState, useRef, useEffect, useCallback, memo } from "react";

const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const API_KEY = import.meta.env.VITE_API_KEY;
const SYSTEM_PROMPT = `You are a neutral Election Process Education assistant focused primarily on India's election system (ECI, EVMs, Lok Sabha, Rajya Sabha, MCC, etc.). When answering, default to India's context first. Only explain other countries if explicitly asked. Explain clearly with numbered steps and bullets. Never take political sides. Keep answers under 200 words.`;

const NAV = [
  { icon: "🗳️", label: "Chat" },
  { icon: "📅", label: "Timeline" },
  { icon: "🏛️", label: "Structure" },
  { icon: "📊", label: "Counting" },
  { icon: "⚖️", label: "Systems" },
  { icon: "💻", label: "Technology" },
];

const CHIPS = [
  "How do I register to vote?",
  "What is FPTP system?",
  "How are EVMs used?",
  "Key election dates?",
  "How are results declared?",
];

const TOPIC_QUESTIONS = {
  "Timeline": "What are the key dates and timeline in an election cycle?",
  "Structure": "How does government work after elections?",
  "Counting": "How are votes counted and results declared?",
  "Systems": "What are different types of electoral systems?",
  "Technology": "How do Electronic Voting Machines (EVMs) work?",
};

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

const Bubble = memo(({ role, content, time }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{
      display: "inline-block",
      maxWidth: "80%",
      padding: "12px 16px",
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
  <div style={{ display: "flex", gap: 5, padding: "4px 0" }}>
    {[0, 1, 2].map(i => (
      <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#f0c040", display: "inline-block", animation: `pulse 1s ${i * 0.18}s infinite` }} />
    ))}
  </div>
));

export default function App() {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "Welcome to ElectEd. I can help you understand the election process, timelines, voting systems, and more — all in an easy-to-follow way.",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState("Chat");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!document.querySelector("#gfont")) {
      const l = document.createElement("link");
      l.id = "gfont"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap";
      document.head.appendChild(l);
    }
    if (!document.querySelector("#gmaps")) {
  const script = document.createElement("script");
  script.id = "gmaps";
  script.src = "https://maps.googleapis.com/maps/api/js";
  document.head.appendChild(script);
}
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = useCallback(async (text) => {
    const clean = String(text).trim().slice(0,1000).replace(/<[^>]*>/g, '').replace(/[<>'"]/g, '');
    if (!clean || loading) return;
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
      if (!res.ok) throw new Error();
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? "No response.";
      const rtime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages(prev => [...prev, { role: "assistant", content: reply, time: rtime }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Could not connect. Please try again.", time: "" }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [messages, loading]);

  const handleNav = (label) => {
    setActive(label);
    if (label !== "Chat" && TOPIC_QUESTIONS[label]) send(TOPIC_QUESTIONS[label]);
  };

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
        button:focus-visible{outline:2px solid #f0c040}
      `}</style>

      <div style={{ display: "flex", height: "100vh", width: "100%" }}>

        {/* Sidebar */}
        <aside style={{ width: 220, background: "#141414", borderRight: "1px solid #1f1f1f", display: "flex", flexDirection: "column", padding: "20px 0", flexShrink: 0 }}>
          {/* Logo */}
          <div style={{ padding: "0 16px 24px" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#f0c040", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, marginBottom: 10 }}>🗳</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>ElectEd</div>
            <div style={{ fontSize: 11, color: "#555", fontFamily: "monospace" }}>election assistant</div>
          </div>

          <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, padding: "0 16px 8px", textTransform: "uppercase" }}>Workspace</div>

          {NAV.map(({ icon, label }) => (
            <button key={label} onClick={() => handleNav(label)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 16px", border: "none", cursor: "pointer", textAlign: "left",
                background: active === label ? "rgba(240,192,64,0.12)" : "transparent",
                borderLeft: active === label ? "2px solid #f0c040" : "2px solid transparent",
                color: active === label ? "#f0c040" : "#666",
                fontSize: 14, fontFamily: "inherit", transition: "all .15s",
              }}>
              <span style={{ fontSize: 15 }}>{icon}</span>{label}
            </button>
          ))}

          <div style={{ marginTop: "auto", padding: "16px", borderTop: "1px solid #1f1f1f" }}>
            <div style={{ fontSize: 11, color: "#444" }}>Powered by</div>
            <div style={{ fontSize: 12, color: "#666" }}>Groq · llama-3.3-70b</div>
          </div>
        </aside>

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Topbar */}
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>{active}</span>
            <span style={{ fontSize: 12, color: "#444", fontFamily: "monospace" }}>groq · llama-3.3-70b</span>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            {messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} time={m.time} />)}
            {loading && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "inline-block", padding: "12px 16px", background: "#1e1e1e", borderRadius: "16px 16px 16px 4px", border: "1px solid #2a2a2a" }}>
                  <Dots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Chips */}
          <div style={{ padding: "0 24px 10px", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CHIPS.map((c, i) => (
              <button key={i} onClick={() => send(c)} disabled={loading}
                style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: 20, padding: "5px 12px", color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#f0c040"; e.currentTarget.style.color = "#f0c040"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.color = "#666"; }}>
                {c}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: "0 24px 20px", display: "flex", gap: 10 }}>
            <label htmlFor="ci" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Ask ElectEd</label>
            <input id="ci" ref={inputRef} data-testid="chat-input"
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask ElectEd — elections, voting, timelines, systems…"
              maxLength={1000} disabled={loading} aria-label="Ask about elections"
              style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "12px 16px", color: "#ccc", fontSize: 14, outline: "none", fontFamily: "inherit" }}
            />
            <button onClick={() => send(input)} disabled={loading || !input.trim()} aria-label="Send"
              style={{ background: loading || !input.trim() ? "#1a1a1a" : "#f0c040", border: "1px solid #2a2a2a", borderRadius: 12, padding: "12px 18px", color: loading || !input.trim() ? "#444" : "#111", fontWeight: 700, fontSize: 16, cursor: loading || !input.trim() ? "not-allowed" : "pointer", transition: "all .15s" }}>
              ➤
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
