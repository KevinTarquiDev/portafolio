import "./App.css";
import { NavBar } from "./components/NavBar";
import { Header } from "./components/Header";
import { Skills } from "./components/Skills.tsx";
import { Projects } from "./components/Projects.tsx";
import { Contact } from "./components/Contact.tsx";
import { Footer } from "./components/Footer.tsx";
import { ParticlesBackground } from "./assets/background/ParticlesBackground.tsx";

function App() {
  return (
    <div id="top" className="App">
      <ParticlesBackground />
      <NavBar />
      <Header />
      <Skills />
      <Projects />
      <Contact />
      <Footer />
    </div>
  );
}

export default App;
