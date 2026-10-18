// Web Audio API chime synthesizer for in-game chat notifications
// No external assets required, instant and lightweight

let audioCtx: AudioContext | null = null;

export function playChatChime(type: "incoming" | "command" | "agent_reply" = "incoming") {
  try {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === "command") {
      // Crisp dual-tone command acknowledgement
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === "agent_reply") {
      // Soft melodic reply ping (Minecraft XP ping style)
      osc.type = "triangle";
      osc.frequency.setValueAtTime(783.99, now); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.08); // C6
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      // Gentle standard in-game chat pop
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    }
  } catch {
    // Audio contexts can be restricted by browser autoplay policies before user interaction; ignore safely
  }
}
