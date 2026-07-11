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

  // Synthesize some simple sounds using Web Audio API
  private audioCtx: AudioContext | null = null;
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
        // High pitched noise
        const bufferSize = this.audioCtx.sampleRate * 0.5;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 5000;
        
        noise.connect(filter);
        filter.connect(gain);
        
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        
        noise.start(t);
        noise.stop(t + 0.2);
    }
  }

  playSkidSound() {
    this.playSound("skid");
  }
}
