import { useState } from "react";

export const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav
      className="text-white bg-violet-950 px-5 sm:px-10 py-3 flex justify-between items-center sticky top-0 z-50"
      style={{
        borderBottom: "2px solid",
        borderImage:
          "linear-gradient(to right, rgba(128, 0, 128, 0.4), rgba(128, 0, 128, 1), rgba(128, 0, 128, 0.4)) 1",
      }}
    >
      <div className="text-lg font-bold">Kevin</div>

      {/* Botón de menú para dispositivos móviles */}
      <div className="sm:hidden">
        <button onClick={toggleMenu} className="text-white focus:outline-none">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16m-7 6h7"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Menú en pantallas grandes */}
      <div className="hidden sm:flex space-x-10">
        <ul className="flex space-x-10">
          <li>
            <a href="#top" className="hover:text-gray-300">
              Home
            </a>
          </li>
          <li>
            <a href="#skills" className="hover:text-gray-300">
              Skills
            </a>
          </li>
          <li>
            <a href="#projects" className="hover:text-gray-300">
              Projects
            </a>
          </li>
          <li>
            <a href="#contact" className="hover:text-gray-300">
              Contact me
            </a>
          </li>
        </ul>
      </div>

      {/* Menú desplegable para dispositivos móviles */}
      {isOpen && (
        <div className="absolute top-12 left-0 w-full bg-violet-950 sm:hidden">
          <ul className="flex flex-col items-end space-y-4 py-4 pr-4">
            <li>
              <a href="#top" className="hover:text-gray-300 hover:underline">
                Home
              </a>
            </li>
            <li>
              <a href="#skills" className="hover:text-gray-300 hover:underline">
                Skills
              </a>
            </li>
            <li>
              <a
                href="#projects"
                className="hover:text-gray-300 hover:underline"
              >
                Projects
              </a>
            </li>
            <li>
              <a
                href="#contact"
                className="hover:text-gray-300 hover:underline"
              >
                Contact me
              </a>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
};
