export default function Seccion({ children, className="" }) {
  return <section className={`mb-6 text-tinta ${className}`}>{children}</section>;
}
