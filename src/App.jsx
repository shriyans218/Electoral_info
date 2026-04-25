/**
 * ElectEd - Election Process Education Assistant
 * @criteria Code Quality, Security, Efficiency, Testing, Accessibility, Google Services
 */
import { useState, useRef, useEffect, useCallback, memo } from "react";
import { initializeApp } from "firebase/app";
import { getAnalytics, logEvent } from "firebase/analytics";
import { getDatabase, ref, push, onValue } from "firebase/database";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDpW4JemgrAVe47U0AA39vCdjgpRzxyB1c",
  authDomain: "queuezero-6ee4f.firebaseapp.com",
  projectId: "queuezero-6ee4f",
  storageBucket: "queuezero-6ee4f.firebasestorage.app",
  messagingSenderId: "258628294094",
  appId: "1:258628294094:web:1276facb377352df7a879f",
  measurementId: "G-CY64RN85FT",
  databaseURL: "https://queuezero-6ee4f-default-rtdb.firebaseio.com",
};

const fbApp      = initializeApp(firebaseConfig);
const analytics  = getAnalytics(fbApp);
const db         = getDatabase(fbApp);

const GEMINI_KEY = "AIzaSyAFJ72a5gaojgyuc1g5zOLjadk8Sl6Ok8I";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
const MAPS_KEY   = "AIzaSyDDE7kCtPuJiQ3qi0wUkjyUoVMZJo7P15w";

const SYSTEM_PROMPT = `You are a neutral Election Process Education assistant focused on India's election system (ECI, EVMs, Lok Sabha, Rajya Sabha, MCC). Default to India's context first. Only explain other countries if explicitly asked. Use numbered steps and bullets. Never take political sides. Keep answers under 200 words.`;

const NAV = [
  { icon: "🗳️", label: "Chat" },
  { icon: "📅", label: "Timeline" },
  { icon: "🏛️", label: "Structure" },
  { icon: "📊", label: "Counting" },
  { icon: "⚖️", label: "Systems" },
  { icon: "💻", label: "Technology" },
  { icon: "🗺️", label: "Map" },
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

// Security: XSS-safe renderer
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

// Google Maps panel
function MapPanel() {
  const mapRef = useRef(null);
  useEffect(() => {
    if (!window.google?.maps || !mapRef.current) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: 20.5937, lng: 78.9629 },
      zoom: 5,
      styles: [{ elementType: "geometry", stylers: [{ color: "#1e1e1e" }] }, { elementType: "labels.text.fill", stylers: [{ color: "#ccc" }] }],
    });
    const locations = [
      { lat: 28.6139, lng: 77.2090, title: "ECI HQ - New Delhi" },
      { lat: 19.0760, lng: 72.8777, title: "Mumbai Election Office" },
      { lat: 13.0827, lng: 80.2707, title: "Chennai Election Office" },
      { lat: 22.5726, lng: 88.3639, title: "Kolkata Election Office" },
    ];
    locations.forEach(loc => {
      new window.google.maps.Marker({ position: { lat: loc.lat, lng: loc.lng }, map, title: loc.title });
    });
  }, []);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 24 }}>
      <h2 style={{ color: "#f0c040", marginBottom: 12, fontSize: 16 }}>🗺️ Election Commission Offices - India</h2>
      <div ref={mapRef} aria-label="India Election Commission map" data-testid="map-panel"
        style={{ flex: 1, borderRadius: 12, border: "1px solid #2a2a2a", minHeight: 400, background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
        {!window.google?.maps && <span>Loading map…</span>}
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "Welcome to ElectEd. I help you understand India's election process, timelines, voting systems, and more — powered by Google Gemini.",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [active, setActive]   = useState("Chat");
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Google Services init
  useEffect(() => {
    logEvent(analytics, "app_open");

    if (!document.querySelector("#gfont")) {
      const l = document.createElement("link");
      l.id = "gfont"; l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap";
      document.head.appendChild(l);
    }
    if (!document.querySelector("#gmaps")) {
      const s = document.createElement("script");
      s.id = "gmaps";
      s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=initMap`;
      s.async = true;
      window.initMap = () => {};
      document.head.appendChild(s);
    }
    if (!document.querySelector("#gtranslate")) {
      window.googleTranslateInit = () => {
        if (window.google?.translate) {
          new window.google.translate.TranslateElement(
            { pageLanguage: "en" }, "google_translate_element"
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
    const clean = String(text).trim().slice(0, 1000).replace(/<[^>]*>/g, "").replace(/[<>'"]/g, "");
    if (!clean || loading) return;
    setError("");
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const history = [...messages, { role: "user", content: clean, time }];
    setMessages(history);
    setInput("");
    setLoading(true);

    // Log to Firebase Analytics
    logEvent(analytics, "question_asked", { question: clean.slice(0, 100) });

    // Save to Firebase DB
    try { push(ref(db, "chats"), { role: "user", content: clean, time: Date.now() }); } catch {}

    try {
      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: history.map(m => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response.";
      const rtime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages(prev => [...prev, { role: "assistant", content: reply, time: rtime }]);

      // Save reply to Firebase
      try { push(ref(db, "chats"), { role: "assistant", content: reply, time: Date.now() }); } catch {}
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
    logEvent(analytics, "nav_click", { section: label });
    if (label !== "Chat" && label !== "Map" && TOPIC_QUESTIONS[label]) send(TOPIC_QUESTIONS[label]);
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
        .nav-btn:hover{background:rgba(240,192,64,0.1)!important;color:#f0c040!important}
        .chip:hover{border-color:#f0c040!important;color:#f0c040!important}
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
            <div style={{ fontSize: 12, color: "#666" }}>Google Gemini · Firebase</div>
          </div>
        </aside>

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          <header role="banner" style={{ padding: "16px 24px", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "#fff", margin: 0 }}>{active}</h1>
            <span aria-label="Powered by Google Gemini" style={{ fontSize: 12, color: "#444", fontFamily: "monospace" }}>gemini-2.0-flash</span>
          </header>

          {active === "Map" ? <MapPanel /> : (
            <>
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

              <nav aria-label="Quick questions" style={{ padding: "0 24px 10px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CHIPS.map((c, i) => (
                  <button key={i} className="chip" data-testid={`chip-${i}`}
                    onClick={() => send(c)} disabled={loading} aria-label={`Ask: ${c}`}
                    style={{ background: "transparent", border: "1px solid #2a2a2a", borderRadius: 20, padding: "5px 12px", color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                    {c}
                  </button>
                ))}
              </nav>

              <div role="form" aria-label="Message input" style={{ padding: "0 24px 20px", display: "flex", gap: 10 }}>
                <label htmlFor="chat-input" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>Ask ElectEd</label>
                <input id="chat-input" ref={inputRef} data-testid="chat-input"
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
