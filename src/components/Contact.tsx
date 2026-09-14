import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import Laybel from "../assets/laybel/Laybel.tsx";
import emailjs from "@emailjs/browser";

interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

export const Contact = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    message: "",
  });

  const [sent, setSent] = useState(false);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Ajusta los nombres de las variables para que coincidan con el template de EmailJS
    const templateParams = {
      to_name: "Kevin Tarqui",
      from_name: formData.name,
      message: formData.message,
    };

    emailjs
      .send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
        templateParams,
        { publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY },
      )
      .then(
        (response) => {
          console.log("SUCCESS!", response.status, response.text);
          setSent(true);
          setFormData({ name: "", email: "", message: "" });
        },
        (err) => {
          console.log("FAILED...", err);
        },
      );
  };

  return (
    <section id="contact" className="pt-10">
      <div className="container mx-auto px-5">
        <Laybel>Contact me</Laybel>
        <form
          onSubmit={handleSubmit}
          className="max-w-lg mx-auto bg-white bg-opacity-80 p-6 rounded-lg shadow-lg"
        >
          {sent && (
            <div className="text-green-500 text-center mb-4">
              ¡Mensaje enviado exitosamente!
            </div>
          )}
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Name:
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Juan Pérez"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Email address:
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="example@gmail.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="message"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Message:
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            ></textarea>
          </div>
          <button
            type="submit"
            className="w-full bg-purple-600 text-white px-4 py-2 rounded-full hover:bg-purple-700"
          >
            Enviar Mensaje
          </button>
        </form>
      </div>
    </section>
  );
};

export default Contact;
