import { CartIcon, PinIcon, SearchIcon } from "./Icons";

const STEPS = [
  { icon: <PinIcon size={22} />, title: "Diga onde você está", text: "Use sua localização ou toque no mapa." },
  { icon: <SearchIcon size={22} />, title: "Busque o produto", text: "Arroz, leite, café, o que precisar." },
  { icon: <CartIcon size={22} />, title: "Veja o mais barato", text: "Comparamos os mercados ao seu redor." },
];

export function EmptyState() {
  return (
    <div className="steps">
      {STEPS.map((s, i) => (
        <div key={s.title} className="step">
          <span className="step-icon">{s.icon}</span>
          <span className="step-n">{i + 1}</span>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
        </div>
      ))}
    </div>
  );
}
