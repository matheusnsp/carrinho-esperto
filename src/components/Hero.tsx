import { FormEvent } from "react";
import { SearchIcon } from "./Icons";

const SUGGESTIONS = ["Arroz 5kg", "Feijão preto 1kg", "Leite integral", "Café 500g", "Óleo de soja", "Ovos"];

interface Props {
  query: string;
  setQuery: (q: string) => void;
  onSearch: (q: string) => void;
  searching: boolean;
}

export function Hero({ query, setQuery, onSearch, searching }: Props) {
  function submit(e: FormEvent) {
    e.preventDefault();
    onSearch(query);
  }
  return (
    <section className="hero">
      <h1>
        Onde está <span className="hl">mais barato</span> hoje?
      </h1>
      <p>Compare o preço do que você precisa nos supermercados perto de você.</p>
      <form onSubmit={submit} className="searchbar">
        <SearchIcon />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busque um produto: arroz, leite, café…"
          aria-label="Produto"
        />
        <button type="submit" className="btn btn-accent" disabled={searching || query.trim().length < 2}>
          {searching ? <span className="spinner" /> : "Comparar"}
        </button>
      </form>
      <div className="suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="pill" onClick={() => onSearch(s)}>
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}
