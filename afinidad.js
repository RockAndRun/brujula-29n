// Cálculo de afinidad. Funciona en el navegador (window.Afinidad) y en Node (tests).
(function (raiz) {
  // Por debajo de este nº de preguntas en común, el % no es fiable y se marca como "pocos datos".
  const MIN_COMUNES = 5;

  /**
   * % de coincidencia con un partido. Las afirmaciones están ordenadas de un polo a otro,
   * así que una respuesta adyacente puntúa parcialmente: 1 - distancia / (nº opciones - 1).
   * Solo cuentan las preguntas que la persona respondió y en las que el partido se pronuncia.
   * @param {Array<{id:string, afirmaciones:Array<{letra:string}>, posiciones:Object}>} preguntas
   * @param {Object<string, {letra:(string|null), importante?:boolean}>} respuestas
   * @param {string} partidoId
   * @returns {{pct:number, comunes:number}|null}
   */
  function afinidad(preguntas, respuestas, partidoId) {
    let suma = 0;
    let pesos = 0;
    let comunes = 0;
    for (const q of preguntas) {
      const r = respuestas[q.id];
      const p = q.posiciones[partidoId];
      if (!r || !r.letra || !p) continue;
      const letras = q.afirmaciones.map((a) => a.letra);
      const distancia = Math.abs(letras.indexOf(r.letra) - letras.indexOf(p.letra));
      const peso = r.importante ? 2 : 1;
      suma += peso * (1 - distancia / (letras.length - 1));
      pesos += peso;
      comunes += 1;
    }
    return comunes ? { pct: Math.round((100 * suma) / pesos), comunes } : null;
  }

  /** Partidos que presentan lista en la provincia elegida. */
  function partidosDeProvincia(partidos, provincia) {
    return partidos.filter(
      (p) => (!p.provincias || p.provincias.includes(provincia)) && !p.excluir.includes(provincia)
    );
  }

  const api = { afinidad, partidosDeProvincia, MIN_COMUNES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else raiz.Afinidad = api;
})(this);
