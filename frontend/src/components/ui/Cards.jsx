import clsx from "clsx";

export default function Card({ children, className }) {
  return (
    <div
      className={clsx(
        "bg-white border border-gray-200 rounded-xl shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}