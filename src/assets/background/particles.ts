import type { ISourceOptions } from "@tsparticles/engine";

const particlesOptions: ISourceOptions = {
  particles: {
    number: {
      value: 15,
      density: {
        enable: true,
        width: 700,
        height: 700,
      },
    },
    color: {
      value: "#460c9b",
    },
    shape: {
      type: "polygon",
      options: {
        polygon: {
          sides: 6,
        },
      },
    },
    stroke: {
      width: 10,
      color: "#460c9b",
    },
    opacity: {
      value: 0.25,
      animation: {
        enable: false,
        speed: 1,
        sync: false,
      },
    },
    size: {
      value: 125,
      animation: {
        enable: true,
        speed: 10,
        sync: false,
      },
    },
    links: {
      enable: false,
      distance: 100,
      color: "#c846ff",
      opacity: 0.5,
      width: 2,
    },
    move: {
      enable: true,
      speed: 15,
      direction: "none",
      random: true,
      straight: false,
      outModes: {
        default: "out",
      },
    },
  },
  interactivity: {
    detectsOn: "window",
    events: {
      onHover: {
        enable: false,
        mode: "grab",
      },
      onClick: {
        enable: false,
        mode: "push",
      },
      resize: {
        enable: true,
      },
    },
    modes: {
      grab: {
        distance: 400,
        links: {
          opacity: 1,
        },
      },
      bubble: {
        distance: 400,
        size: 40,
        duration: 2,
        opacity: 8,
      },
      repulse: {
        distance: 200,
        duration: 0.4,
      },
      push: {
        quantity: 4,
      },
      remove: {
        quantity: 2,
      },
    },
  },
  detectRetina: true,
};

export default particlesOptions;
