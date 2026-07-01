import { useState, useEffect } from "react";

// Bandeau discret pour installer la PWA.
// - Android / Chrome desktop : bouton natif via l'événement beforeinstallprompt.
// - iOS Safari : pas d'événement natif → on affiche les instructions "Partager → Sur l'écran d'accueil".
const DISMISS_KEY = "install-prompt-dismissed";

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Déjà installée (mode standalone) → ne rien montrer.
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (standalone) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
    if (ios) { setIsIOS(true); setVisible(true); return; }

    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); setVisible(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  const dismiss = () => { setVisible(false); localStorage.setItem(DISMISS_KEY, "1"); };

  if (!visible) return null;

  const S = {
    bar: { position: "fixed", left: 12, right: 12, bottom: 12, maxWidth: 720, margin: "0 auto", background: "#111520", border: "1px solid #1a1f2e", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, zIndex: 900, boxShadow: "0 8px 30px rgba(0,0,0,.5)", fontFamily: "'Inter',system-ui,sans-serif" },
    icon: { fontSize: 22, flexShrink: 0 },
    txt: { flex: 1, minWidth: 0 },
    title: { fontSize: 12.5, fontWeight: 700, color: "#f8fafc" },
    desc: { fontSize: 11, color: "#64748b", marginTop: 2, lineHeight: 1.4 },
    btn: { background: "#3b82f6", border: "none", color: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 },
    close: { background: "transparent", border: "none", color: "#334155", cursor: "pointer", fontSize: 16, flexShrink: 0, padding: "0 2px" },
  };

  return (
    <div style={S.bar}>
      <span style={S.icon}>📲</span>
      <div style={S.txt}>
        <div style={S.title}>Installer l&apos;application</div>
        {isIOS ? (
          <div style={S.desc}>Appuie sur <strong>Partager</strong> ⬆️ puis <strong>« Sur l&apos;écran d&apos;accueil »</strong>.</div>
        ) : (
          <div style={S.desc}>Accès rapide depuis ton écran d&apos;accueil, fonctionne hors-ligne.</div>
        )}
      </div>
      {!isIOS && <button style={S.btn} onClick={install}>Installer</button>}
      <button style={S.close} onClick={dismiss} aria-label="Fermer">✕</button>
    </div>
  );
}
