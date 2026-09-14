import Particles, { ParticlesProvider } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine } from "@tsparticles/engine";
import particlesConfig from "./particles.ts";
import "./particles.css";

const initEngine = async (engine: Engine) => {
  await loadSlim(engine);
};

export function ParticlesBackground() {
  return (
    <ParticlesProvider init={initEngine}>
      <Particles
        className="particles-background"
        id="tsparticles"
        options={particlesConfig}
      />
    </ParticlesProvider>
  );
}
