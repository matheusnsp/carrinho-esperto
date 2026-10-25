import type { SyntheticEvent } from "react";

/** Esconde fotos de produto que não carregam, em vez de mostrar o ícone de imagem quebrada. */
export const hideBroken = (e: SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.visibility = "hidden";
};
