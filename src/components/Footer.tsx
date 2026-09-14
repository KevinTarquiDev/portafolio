interface FooterLinkProps {
  href: string;
  iconClass: string;
}

// Componente reutilizable para los enlaces del footer
const FooterLink = ({ href, iconClass }: FooterLinkProps) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gray-300 hover:text-gray-100"
    >
      <i className={`${iconClass} fa-2x`}></i>
    </a>
  );
};

export const Footer = () => {
  return (
    <footer
      className="bg-violet-950 text-white py-6 mt-10"
      style={{
        borderTop: "2px solid", // Cambiar el borde a la parte superior
        borderImage:
          "linear-gradient(to right, rgba(128, 0, 128, 0.4), rgba(128, 0, 128, 1), rgba(128, 0, 128, 0.4)) 1",
      }}
    >
      <div className="flex justify-center space-x-4">
        <FooterLink
          href="https://www.linkedin.com/in/kevintarquidev/"
          iconClass="fab fa-linkedin"
        />
        <FooterLink
          href="https://github.com/K3VIN16"
          iconClass="fab fa-github"
        />
        <FooterLink
          href="https://www.instagram.com/kevin.tarqui16/"
          iconClass="fab fa-instagram"
        />
      </div>
    </footer>
  );
};

export default Footer;
