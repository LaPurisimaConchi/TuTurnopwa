export default function Titulo({ children }) {
  return (
    <h1 className="text-center font-bold text-terracota-oscuro mb-6
                   text-xl sm:text-2xl md:text-3xl">
      {children}
    </h1>
  );
}
