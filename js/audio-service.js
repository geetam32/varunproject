// Web Audio API Sound Generator for DNR College Bus Tracking System
// 100% self-contained synthesized sounds - no external audio files required!

const AudioService = {
    ctx: null,
    isMuted: false,
    sirenInterval: null,

    init() {
        if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
    },

    resumeContext() {
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume();
        }
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopSiren();
        }
        return this.isMuted;
    },

    // Pleasant two-tone chime for announcements and updates
    playChime() {
        if (this.isMuted) return;
        try {
            this.init();
            this.resumeContext();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            
            // First note (E5)
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(659.25, now);
            gain1.gain.setValueAtTime(0.15, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            osc1.connect(gain1);
            gain1.connect(this.ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.35);

            // Second note (G#5)
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(830.61, now + 0.12);
            gain2.gain.setValueAtTime(0.18, now + 0.12);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.start(now + 0.12);
            osc2.stop(now + 0.5);
        } catch (e) {
            console.warn("AudioService chime error:", e);
        }
    },

    // Crisp UI click feedback
    playClick() {
        if (this.isMuted) return;
        try {
            this.init();
            this.resumeContext();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.05);
        } catch (e) {
            // ignore
        }
    },

    // Urgent SOS Emergency Siren
    playSiren() {
        if (this.isMuted) return;
        this.stopSiren();
        try {
            this.init();
            this.resumeContext();
            if (!this.ctx) return;

            let high = true;
            const triggerTone = () => {
                if (this.isMuted || !this.ctx) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = "sawtooth";
                const freq = high ? 950 : 650;
                osc.frequency.setValueAtTime(freq, now);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now);
                osc.stop(now + 0.28);
                high = !high;
            };

            triggerTone();
            this.sirenInterval = setInterval(triggerTone, 320);

            // Auto shutoff after 12 seconds to prevent user annoyance if unattended
            setTimeout(() => {
                this.stopSiren();
            }, 12000);
        } catch (e) {
            console.warn("AudioService siren error:", e);
        }
    },

    stopSiren() {
        if (this.sirenInterval) {
            clearInterval(this.sirenInterval);
            this.sirenInterval = null;
        }
    }
};
