import "../assets/effect/skills.css"; // Importa el CSS de las animaciones
import { useInView } from "react-intersection-observer";
import Laybel from "../assets/laybel/Laybel.tsx";
import imgJavascript from "../assets/logos/javascript.png";
import imgHtmlCss from "../assets/logos/html_css.jpg";
import imgReact from "../assets/logos/react.webp";
import imgTailwind from "../assets/logos/tailwind.webp";
import imgJava from "../assets/logos/java.png";
import imgSpringboot from "../assets/logos/springboot.png";
import imgGit from "../assets/logos/git.png";
import imgGithub from "../assets/logos/github.svg";
import imgMySql from "../assets/logos/mySql.webp";
import imgPostgreSql from "../assets/logos/postgreSql.png";

interface Skill {
  name: string;
  image: string;
  shadow: string;
}

// Array de habilidades con imágenes y sombras personalizadas
const skills: Skill[] = [
  { name: "Html & CSS", image: imgHtmlCss, shadow: "shadow-orange-500" },
  { name: "JavaScript", image: imgJavascript, shadow: "shadow-yellow-400" },
  { name: "React", image: imgReact, shadow: "shadow-blue-400" },
  { name: "Tailwind CSS", image: imgTailwind, shadow: "shadow-teal-400" },
  { name: "Java", image: imgJava, shadow: "shadow-red-400" },
  { name: "Springboot", image: imgSpringboot, shadow: "shadow-green-500" },
  { name: "Git", image: imgGit, shadow: "shadow-orange-400" },
  { name: "GitHub", image: imgGithub, shadow: "shadow-purple-500" },
  { name: "MySQL", image: imgMySql, shadow: "shadow-blue-500" },
  { name: "PostgreSQL", image: imgPostgreSql, shadow: "shadow-blue-700" },
];

const SkillCard = ({ name, image, shadow }: Skill) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.25, // Se activará cuando el 10% del componente esté visible
  });

  return (
    <li
      ref={ref} // Aplicar ref individual a cada skill
      className={`bg-white mx-6 md:mx-3 lg:mx-0 p-4 rounded-xl shadow-lg ${shadow} flex flex-col items-center transition-opacity duration-1000 ${
        inView ? "fade-in-jump" : "opacity-0"
      }`}
    >
      <h3 className="text-xl font-semibold text-gray-700 mb-2">{name}</h3>
      {image && (
        <img
          src={image}
          alt={name}
          className="w-20 h-20 object-contain rounded-lg"
        />
      )}
    </li>
  );
};

export const Skills = () => {
  return (
    <section id="skills" className="pt-20">
      <div className="max-w-4xl mx-auto text-center">
        <Laybel>Skills</Laybel>
        <ul className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-9 p-4">
          {skills.map((skill) => (
            <SkillCard key={skill.name} {...skill} />
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Skills;
