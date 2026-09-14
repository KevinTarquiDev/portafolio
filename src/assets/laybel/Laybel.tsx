import type { ReactNode } from "react";

interface LaybelProps {
  children: ReactNode;
}

export const Laybel = ({ children }: LaybelProps) => (
  <div className="text-4xl font-bold text-gray-50 text-center mb-10">
    {children}
  </div>
);
export default Laybel;
