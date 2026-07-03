export default function Spinner({ size = "md" }) {
  const s = size === "sm" ? "w-5 h-5" : size === "lg" ? "w-12 h-12" : "w-8 h-8";
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[100px]">
      <div className={`${s} border-2 border-dark-600 border-t-brand-500 rounded-full animate-spin`} />
    </div>
  );
}
