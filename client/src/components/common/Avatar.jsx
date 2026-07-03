export default function Avatar({ src, name = "", size = "md", online }) {
  const sizes = {
    xs: "w-7 h-7 text-xs",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
  };

  const colors = [
    "bg-violet-600", "bg-blue-600", "bg-cyan-600",
    "bg-teal-600", "bg-green-600", "bg-amber-600", "bg-rose-600",
  ];
  const colorIdx = name.charCodeAt(0) % colors.length;
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="relative flex-shrink-0">
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizes[size]} rounded-full object-cover`}
        />
      ) : (
        <div className={`${sizes[size]} ${colors[colorIdx]} rounded-full flex items-center justify-center font-semibold text-white`}>
          {initials || "?"}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-dark-800
            ${online ? "bg-brand-500" : "bg-gray-500"}`}
        />
      )}
    </div>
  );
}
