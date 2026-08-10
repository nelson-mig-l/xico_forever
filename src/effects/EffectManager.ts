import { Scene, ParticleSystem, Texture, Vector3, Color4, Mesh, MeshBuilder, StandardMaterial, Color3, TrailMesh } from "@babylonjs/core";

export class EffectManager {
  private scene: Scene;
  private particleTexture: Texture;

  constructor(scene: Scene) {
    this.scene = scene;
    this.particleTexture = this.createCircleTexture();
  }

  createExplosion(position: Vector3) {
    const particleSystem = new ParticleSystem("explosion", 200, this.scene);
    particleSystem.particleTexture = this.particleTexture;
    particleSystem.emitter = position.clone();
    particleSystem.minEmitBox = new Vector3(-1, 0, -1);
    particleSystem.maxEmitBox = new Vector3(1, 1, 1);
    
    particleSystem.color1 = new Color4(1, 0.5, 0, 1);
    particleSystem.color2 = new Color4(1, 0, 0, 1);
    particleSystem.colorDead = new Color4(0.2, 0.2, 0.2, 0);
    
    particleSystem.minSize = 0.5;
    particleSystem.maxSize = 2.0;
    
    particleSystem.minLifeTime = 0.3;
    particleSystem.maxLifeTime = 1.0;
    
    particleSystem.emitRate = 2000;
    
    particleSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    
    particleSystem.gravity = new Vector3(0, -9.81, 0);
    
    particleSystem.direction1 = new Vector3(-5, 8, 5);
    particleSystem.direction2 = new Vector3(5, 12, -5);
    
    particleSystem.minAngularSpeed = 0;
    particleSystem.maxAngularSpeed = Math.PI;
    
    particleSystem.minEmitPower = 5;
    particleSystem.maxEmitPower = 15;
    particleSystem.updateSpeed = 0.02;
    
    particleSystem.targetStopDuration = 0.2;
    particleSystem.onStoppedObservable.add(() => {
        particleSystem.dispose(false);
    });
    
    particleSystem.start();

    // Flash light
    this.createFlash(position);
    this.playSound("explosion");

    // Spawn some physical debris
    for (let i=0; i<8; i++) {
        this.spawnDebris(position);
    }
  }

  createSparks(position: Vector3, normal: Vector3 = new Vector3(0, 1, 0)) {
    const particleSystem = new ParticleSystem("sparks", 50, this.scene);
    particleSystem.particleTexture = this.particleTexture;
    particleSystem.emitter = position.clone();
    
    particleSystem.color1 = new Color4(1, 1, 0, 1);
    particleSystem.color2 = new Color4(1, 0.5, 0, 1);
    particleSystem.colorDead = new Color4(0, 0, 0, 0);
    
    particleSystem.minSize = 0.1;
    particleSystem.maxSize = 0.3;
    
    particleSystem.minLifeTime = 0.1;
    particleSystem.maxLifeTime = 0.3;
    
    particleSystem.emitRate = 500;
    particleSystem.blendMode = ParticleSystem.BLENDMODE_ONEONE;
    
    particleSystem.direction1 = normal.scale(2).add(new Vector3(-1, 0, -1));
    particleSystem.direction2 = normal.scale(4).add(new Vector3(1, 1, 1));
    
    particleSystem.gravity = new Vector3(0, -9.8, 0);
    
    particleSystem.targetStopDuration = 0.1;
    particleSystem.onStoppedObservable.add(() => {
        particleSystem.dispose(false);
    });
    particleSystem.start();
    this.playSound("crash");
  }

  createDust(position: Vector3) {
    const particleSystem = new ParticleSystem("dust", 50, this.scene);
    particleSystem.particleTexture = this.particleTexture;
    particleSystem.emitter = position.clone();
    
    particleSystem.color1 = new Color4(0.8, 0.8, 0.8, 0.5);
    particleSystem.color2 = new Color4(0.6, 0.6, 0.6, 0.2);
    particleSystem.colorDead = new Color4(0.4, 0.4, 0.4, 0);
    
    particleSystem.minSize = 0.5;
    particleSystem.maxSize = 1.5;
    
    particleSystem.minLifeTime = 0.5;
    particleSystem.maxLifeTime = 1.5;
    
    particleSystem.emitRate = 100;
    particleSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    
    particleSystem.direction1 = new Vector3(-1, 0.1, -1);
    particleSystem.direction2 = new Vector3(1, 1, 1);
    
    particleSystem.minEmitPower = 1;
    particleSystem.maxEmitPower = 3;
    
    particleSystem.targetStopDuration = 0.1;
    particleSystem.onStoppedObservable.add(() => {
        particleSystem.dispose(false);
    });
    particleSystem.start();
  }

  createDriftDust(emitter: Mesh | Vector3): ParticleSystem {
    const particleSystem = new ParticleSystem("driftDust", 200, this.scene);
    particleSystem.particleTexture = this.particleTexture;
    particleSystem.emitter = emitter;
    
    particleSystem.color1 = new Color4(0.8, 0.8, 0.8, 0.3);
    particleSystem.color2 = new Color4(0.6, 0.6, 0.6, 0.1);
    particleSystem.colorDead = new Color4(0.4, 0.4, 0.4, 0);
    
    particleSystem.minSize = 0.5;
    particleSystem.maxSize = 2.0;
    
    particleSystem.minLifeTime = 0.4;
    particleSystem.maxLifeTime = 1.0;
    
    particleSystem.emitRate = 50;
    particleSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    
    particleSystem.direction1 = new Vector3(-1, 0.1, -1);
    particleSystem.direction2 = new Vector3(1, 0.5, 1);
    
    particleSystem.minEmitPower = 0.5;
    particleSystem.maxEmitPower = 1.5;
    return particleSystem;
  }

  private createFlash(position: Vector3) {
    const flash = MeshBuilder.CreateSphere("flash", {diameter: 4}, this.scene);
    flash.position = position.clone();
    const mat = new StandardMaterial("flashMat", this.scene);
    mat.emissiveColor = new Color3(1, 0.8, 0.2);
    mat.disableLighting = true;
    mat.alpha = 0.8;
    flash.material = mat;

    let scale = 1;
    const obs = this.scene.onBeforeRenderObservable.add(() => {
        scale += 0.2;
        flash.scaling.setAll(scale);
        mat.alpha -= 0.1;
        if (mat.alpha <= 0) {
            this.scene.onBeforeRenderObservable.remove(obs);
            flash.dispose();
        }
    });
  }

  private spawnDebris(position: Vector3) {
    const size = 0.2 + Math.random() * 0.4;
    const debris = MeshBuilder.CreateBox("debris", {size}, this.scene);
    debris.position = position.clone();
    debris.position.y += 1;
    
    const mat = new StandardMaterial("debrisMat", this.scene);
    mat.diffuseColor = new Color3(0.2, 0.2, 0.2);
    debris.material = mat;
    
    let vel = new Vector3((Math.random()-0.5)*15, Math.random()*15 + 5, (Math.random()-0.5)*15);
    let rotVel = new Vector3(Math.random()*5, Math.random()*5, Math.random()*5);
    
    const obs = this.scene.onBeforeRenderObservable.add(() => {
        const dt = this.scene.getEngine().getDeltaTime() / 1000;
        vel.y -= 9.81 * dt * 2; // gravity
        debris.position.addInPlace(vel.scale(dt));
        debris.rotation.addInPlace(rotVel.scale(dt));
        
        if (debris.position.y < size/2) {
            debris.position.y = size/2;
            vel.scaleInPlace(0.5);
            vel.y *= -0.5; // bounce
            if (vel.lengthSquared() < 0.1) {
                this.scene.onBeforeRenderObservable.remove(obs);
                setTimeout(() => debris.dispose(), 2000);
            }
        }
    });
  }

  private createCircleTexture(): Texture {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.8)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    return Texture.CreateFromBase64String(canvas.toDataURL(), "particleTex", this.scene);
  }

  // Synthesize realistic sounds using Web Audio API
  private audioCtx: AudioContext | null = null;
  private skidGain: GainNode | null = null;
  private skidNoiseSource: AudioBufferSourceNode | null = null;
  private skidFilterAsphalt: BiquadFilterNode | null = null;
  private skidFilterScreech: BiquadFilterNode | null = null;
  private skidOsc1: OscillatorNode | null = null;
  private skidOsc2: OscillatorNode | null = null;
  private skidOscGain: GainNode | null = null;
  private skidChatterLfo: OscillatorNode | null = null;
  private skidTremoloLfo: OscillatorNode | null = null;
  private skidActive: boolean = false;

  // Engine Sound Nodes
  private engineGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineNoiseSource: AudioBufferSourceNode | null = null;
  private engineActive: boolean = false;

  private initEngineAudio() {
    if (this.engineActive) return;
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const ctx = this.audioCtx;

    // Master Engine Gain Node
    this.engineGain = ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, ctx.currentTime);
    this.engineGain.connect(ctx.destination);

    // Filter to simulate engine block / air intake dampening
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.setValueAtTime(300, ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.0, ctx.currentTime);
    this.engineFilter.connect(this.engineGain);

    // Primary Cylinder Firing Oscillator (Sawtooth)
    this.engineOsc1 = ctx.createOscillator();
    this.engineOsc1.type = "sawtooth";
    this.engineOsc1.frequency.setValueAtTime(45, ctx.currentTime);

    const osc1Gain = ctx.createGain();
    osc1Gain.gain.setValueAtTime(0.5, ctx.currentTime);
    this.engineOsc1.connect(osc1Gain);
    osc1Gain.connect(this.engineFilter);

    // Harmonic / Exhaust Oscillator (Square with detune)
    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = "square";
    this.engineOsc2.frequency.setValueAtTime(33.75, ctx.currentTime);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.2, ctx.currentTime);
    this.engineOsc2.connect(osc2Gain);
    osc2Gain.connect(this.engineFilter);

    // Sub-Bass Rumble (Sine at 0.5x base frequency)
    this.engineSubOsc = ctx.createOscillator();
    this.engineSubOsc.type = "sine";
    this.engineSubOsc.frequency.setValueAtTime(22.5, ctx.currentTime);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.6, ctx.currentTime);
    this.engineSubOsc.connect(subGain);
    subGain.connect(this.engineFilter);

    // Exhaust White Noise for Airflow / Mechanical Texture
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    this.engineNoiseSource = ctx.createBufferSource();
    this.engineNoiseSource.buffer = buffer;
    this.engineNoiseSource.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(400, ctx.currentTime);
    noiseFilter.Q.setValueAtTime(1.5, ctx.currentTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, ctx.currentTime);

    this.engineNoiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.engineFilter);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineSubOsc.start();
    this.engineNoiseSource.start();

    this.engineActive = true;
  }

  public updateEngineSound(speedRatio: number, throttle: number, isCrashed: boolean) {
    if (isCrashed) {
      if (this.engineGain && this.audioCtx) {
        this.engineGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
      }
      return;
    }

    if (!this.engineActive) {
      this.initEngineAudio();
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    if (this.engineGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;

      // RPM calculation: base idle + speed scaling + throttle load boost
      const normalizedSpeed = Math.min(1.0, Math.max(0, speedRatio));
      const throttleLoad = Math.max(-0.5, Math.min(1.0, throttle));
      
      const baseFreq = 42 + normalizedSpeed * 150 + (throttleLoad > 0 ? throttleLoad * 35 : 0);
      
      // Pitch targets
      if (this.engineOsc1) {
        this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
      }
      if (this.engineOsc2) {
        this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.75, now, 0.04);
      }
      if (this.engineSubOsc) {
        this.engineSubOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.04);
      }

      // Filter cutoff: higher cutoff under load / speed gives throatier rev
      const cutoffFreq = 260 + normalizedSpeed * 1200 + (throttleLoad > 0 ? throttleLoad * 900 : 0);
      if (this.engineFilter) {
        this.engineFilter.frequency.setTargetAtTime(cutoffFreq, now, 0.04);
      }

      // Volume scaling: idle volume around 0.04, up to 0.12 at full speed & throttle
      let targetVolume = 0.04 + normalizedSpeed * 0.06;
      if (throttleLoad > 0) {
        targetVolume += throttleLoad * 0.03;
      } else if (throttleLoad < 0) {
        targetVolume *= 0.8;
      }

      this.engineGain.gain.setTargetAtTime(targetVolume, now, 0.05);
    }
  }

  private initSkidAudio() {
    if (this.skidActive) return;
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const ctx = this.audioCtx;

    // Master Skid Gain Node
    this.skidGain = ctx.createGain();
    this.skidGain.gain.setValueAtTime(0, ctx.currentTime);
    this.skidGain.connect(ctx.destination);

    // 1. White Noise Generator for Asphalt Friction / Scrub
    const bufferSize = ctx.sampleRate * 2; // 2 sec buffer loop
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    this.skidNoiseSource = ctx.createBufferSource();
    this.skidNoiseSource.buffer = buffer;
    this.skidNoiseSource.loop = true;

    // Real tire squeal has its spectral peak around 500-1500Hz (the stick-slip vibration
    // between rubber and road, per acoustic measurements of slip-angle squeal) — not up in
    // "musical tone" territory. Filter A shapes the broad scrub texture; filter B carves a
    // narrower resonant peak inside that same band for the squeal's tonal body.
    this.skidFilterAsphalt = ctx.createBiquadFilter();
    this.skidFilterAsphalt.type = "bandpass";
    this.skidFilterAsphalt.frequency.setValueAtTime(700, ctx.currentTime);
    this.skidFilterAsphalt.Q.setValueAtTime(1.5, ctx.currentTime);

    this.skidFilterScreech = ctx.createBiquadFilter();
    this.skidFilterScreech.type = "bandpass";
    this.skidFilterScreech.frequency.setValueAtTime(1100, ctx.currentTime);
    this.skidFilterScreech.Q.setValueAtTime(9.0, ctx.currentTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, ctx.currentTime);

    this.skidNoiseSource.connect(this.skidFilterAsphalt);
    this.skidFilterAsphalt.connect(this.skidFilterScreech);
    this.skidFilterScreech.connect(noiseGain);
    noiseGain.connect(this.skidGain);

    // 2. Tonal squeal. The two oscillators are detuned CLOSE together (~2%, not a musical
    // interval) so they beat against each other, and a fast LFO frequency-modulates both —
    // this stick-slip "chatter" is what actually reads as rubber rather than a synth chord;
    // a slower LFO adds a matching amplitude wobble.
    this.skidOsc1 = ctx.createOscillator();
    this.skidOsc1.type = "sawtooth";
    this.skidOsc1.frequency.setValueAtTime(950, ctx.currentTime);

    this.skidOsc2 = ctx.createOscillator();
    this.skidOsc2.type = "sawtooth";
    this.skidOsc2.frequency.setValueAtTime(970, ctx.currentTime);

    this.skidOscGain = ctx.createGain();
    this.skidOscGain.gain.setValueAtTime(0.1, ctx.currentTime);

    const oscBandpass = ctx.createBiquadFilter();
    oscBandpass.type = "bandpass";
    oscBandpass.frequency.setValueAtTime(1200, ctx.currentTime);
    oscBandpass.Q.setValueAtTime(1.2, ctx.currentTime);

    this.skidChatterLfo = ctx.createOscillator();
    this.skidChatterLfo.type = "sine";
    this.skidChatterLfo.frequency.setValueAtTime(20, ctx.currentTime);
    const chatterDepth = ctx.createGain();
    chatterDepth.gain.setValueAtTime(40, ctx.currentTime); // +/-40Hz wobble on the squeal pitch
    this.skidChatterLfo.connect(chatterDepth);
    chatterDepth.connect(this.skidOsc1.frequency);
    chatterDepth.connect(this.skidOsc2.frequency);

    this.skidTremoloLfo = ctx.createOscillator();
    this.skidTremoloLfo.type = "sine";
    this.skidTremoloLfo.frequency.setValueAtTime(7, ctx.currentTime);
    const tremoloDepth = ctx.createGain();
    tremoloDepth.gain.setValueAtTime(0.03, ctx.currentTime); // small: stays positive against the 0.1 base gain
    this.skidTremoloLfo.connect(tremoloDepth);
    tremoloDepth.connect(this.skidOscGain.gain);

    this.skidOsc1.connect(oscBandpass);
    this.skidOsc2.connect(oscBandpass);
    oscBandpass.connect(this.skidOscGain);
    this.skidOscGain.connect(this.skidGain);

    this.skidNoiseSource.start();
    this.skidOsc1.start();
    this.skidOsc2.start();
    this.skidChatterLfo.start();
    this.skidTremoloLfo.start();

    this.skidActive = true;
  }

  public updateSkidSound(isDrifting: boolean, intensity: number = 0.5, speedRatio: number = 0.5) {
    if (!isDrifting) {
      if (this.skidGain && this.audioCtx) {
        this.skidGain.gain.setTargetAtTime(0, this.audioCtx.currentTime, 0.05);
      }
      return;
    }

    if (!this.skidActive) {
      this.initSkidAudio();
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    if (this.skidGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;

      // Target volume based on drift intensity & speed
      const targetGain = Math.min(0.3, 0.06 + intensity * 0.18 + speedRatio * 0.06);
      this.skidGain.gain.setTargetAtTime(targetGain, now, 0.03);

      // Pitch / frequency calculation. Real squeal peaks in the 500-1500Hz band; a bigger
      // slip angle (here approximated by drift intensity) raises the pitch AND makes the
      // stick-slip chatter faster/more agitated, so the chatter LFO rate scales with it too.
      const squealBase = 650 + speedRatio * 250 + intensity * 300;

      if (this.skidFilterAsphalt) {
        this.skidFilterAsphalt.frequency.setTargetAtTime(500 + speedRatio * 250, now, 0.04);
      }
      if (this.skidFilterScreech) {
        this.skidFilterScreech.frequency.setTargetAtTime(squealBase + 150 + (Math.random() - 0.5) * 60, now, 0.04);
      }
      if (this.skidOsc1) {
        this.skidOsc1.frequency.setTargetAtTime(squealBase, now, 0.04);
      }
      if (this.skidOsc2) {
        this.skidOsc2.frequency.setTargetAtTime(squealBase * 1.02, now, 0.04); // keep the beat-detune ratio
      }
      if (this.skidChatterLfo) {
        this.skidChatterLfo.frequency.setTargetAtTime(15 + intensity * 25, now, 0.06);
      }
    }
  }

  private playSound(type: "explosion" | "crash" | "skid") {
    if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
    }

    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    if (type === "explosion") {
        // Noise-like explosion
        const bufferSize = this.audioCtx.sampleRate * 2; // 2 seconds
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, t);
        filter.frequency.exponentialRampToValueAtTime(100, t + 1);

        noise.connect(filter);
        filter.connect(gain);
        
        gain.gain.setValueAtTime(1, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 1);
        
        noise.start(t);
        noise.stop(t + 1);
        
    } else if (type === "crash") {
        osc.type = "square";
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
        
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
        
        osc.start(t);
        osc.stop(t + 0.3);
    } else if (type === "skid") {
        this.updateSkidSound(true, 0.7, 0.7);
    }
  }

  playSkidSound() {
    this.updateSkidSound(true, 0.7, 0.7);
  }
}
