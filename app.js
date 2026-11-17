// Interfaz: inicio (provincia) -> preguntas -> resultado. Sin dependencias; todo el texto se inserta con textContent.
(function () {
  const D = window.DATOS;
  const A = window.Afinidad;
  const $ = (id) => document.getElementById(id);
  const ALTO_CARRIL = 82; // px por fila de marcas en el eje
  const ANCHO_MARCA = 96; // px que ocupa la etiqueta de cada marca

  let estado = nuevoEstado();

  function nuevoEstado() {
    return { provincia: "", idx: 0, respuestas: {}, barajadas: D.preguntas.map((q) => barajar(q.afirmaciones)) };
  }

  /** Copia barajada (Fisher-Yates): el orden interno A..D va de un polo a otro y no debe insinuarse. */
  function barajar(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function el(tag, props = {}, hijos = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "style") Object.assign(n.style, v);
      else if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else n.setAttribute(k, v);
    }
    for (const h of [].concat(hijos)) if (h) n.append(h);
    return n;
  }

  function mostrar(id) {
    for (const s of ["inicio", "test", "resultado"]) $(s).hidden = s !== id;
    window.scrollTo(0, 0);
  }

  const partidosProvincia = () => A.partidosDeProvincia(D.partidos, estado.provincia);
  const nombres = (ps) => ps.map((p) => p.nombre).join(", ");

  // ---------- INICIO ----------
  function initInicio() {
    $("n-preguntas").textContent = D.preguntas.length;
    $("actualizado").textContent = new Date(D.actualizado).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
    const provincias = D.provincias.slice().sort((a, b) => a.localeCompare(b, "es"));
    for (const p of provincias) $("provincia").append(el("option", { value: p, text: p }));
    $("provincia").addEventListener("change", (e) => {
      estado.provincia = e.target.value;
      $("empezar").disabled = !estado.provincia;
      avisoPendientes();
    });
    $("empezar").addEventListener("click", () => { estado.idx = 0; mostrar("test"); pintarPregunta(); });
    avisoPendientes();
  }

  function avisoPendientes() {
    const ps = (estado.provincia ? partidosProvincia() : D.partidos.filter((p) => !p.provincias)).filter((p) => !p.publicado);
    $("aviso-pendientes").textContent = ps.length
      ? `Aún no han publicado su programa y no se incluyen todavía: ${nombres(ps)}. La web se actualizará cuando lo hagan.`
      : "";
  }

  // ---------- PREGUNTAS ----------
  function pintarPregunta() {
    const q = D.preguntas[estado.idx];
    const r = estado.respuestas[q.id];
    const total = D.preguntas.length;
    $("contador").textContent = `Pregunta ${estado.idx + 1} de ${total} · ${q.tema}`;
    $("barra-progreso").style.width = `${(100 * estado.idx) / total}%`;
    $("pregunta").textContent = q.pregunta;
    $("opciones").replaceChildren(...estado.barajadas[estado.idx].map((a) => {
      const input = el("input", { type: "radio", name: "op", value: a.letra });
      input.checked = !!r && r.letra === a.letra;
      return el("label", { class: "opcion" }, [input, el("span", { text: a.texto })]);
    }));
    document.querySelector('.ninguna input').checked = !!r && r.letra === null;
    $("importante").checked = !!r && !!r.importante;
    $("anterior").disabled = estado.idx === 0;
    $("siguiente").disabled = !r;
    $("siguiente").textContent = estado.idx === total - 1 ? "Ver resultado" : "Siguiente";
  }

  function guardar() {
    const marcada = document.querySelector('input[name="op"]:checked');
    if (!marcada) return;
    const q = D.preguntas[estado.idx];
    estado.respuestas = { ...estado.respuestas, [q.id]: { letra: marcada.value || null, importante: $("importante").checked } };
    $("siguiente").disabled = false;
  }

  function initTest() {
    $("test").addEventListener("change", guardar);
    $("anterior").addEventListener("click", () => { estado.idx -= 1; pintarPregunta(); });
    $("siguiente").addEventListener("click", () => {
      if (estado.idx < D.preguntas.length - 1) { estado.idx += 1; pintarPregunta(); }
      else { mostrar("resultado"); pintarResultado(); }
    });
  }

  // ---------- RESULTADO ----------
  function calcular() {
    return partidosProvincia().filter((p) => p.publicado)
      .map((p) => ({ p, r: A.afinidad(D.preguntas, estado.respuestas, p.id) }))
      .filter((x) => x.r);
  }

  function pintarResultado() {
    const todos = calcular();
    const validos = todos.filter((x) => x.r.comunes >= A.MIN_COMUNES).sort((a, b) => b.r.pct - a.r.pct);
    const pocos = todos.filter((x) => x.r.comunes < A.MIN_COMUNES);
    $("res-provincia").textContent = `Provincia: ${estado.provincia}`;

    if (validos.length) {
      const max = validos[0].r.pct;
      const top = validos.filter((x) => x.r.pct === max);
      $("res-ganador").textContent = `Tu mayor afinidad es con ${nombres(top.map((x) => x.p))} (${max} %).`;
    } else {
      $("res-ganador").textContent = "No hay suficientes respuestas en común con ningún partido para calcular un resultado fiable.";
    }
    pintarEje(validos);
    $("lista").replaceChildren(...validos.map((x) => fichaPartido(x)), ...pocos.map((x) => fichaPartido(x, true)));
    $("res-pocos").textContent = pocos.length
      ? `Con pocos datos (menos de ${A.MIN_COMUNES} preguntas en común): ${nombres(pocos.map((x) => x.p))}. Su porcentaje es poco fiable y no aparece en el eje.`
      : "";
    const pend = partidosProvincia().filter((p) => !p.publicado);
    $("res-pendientes").textContent = pend.length ? `Sin programa publicado todavía (no incluidos): ${nombres(pend)}.` : "";
    window.onresize = () => pintarEje(validos);
  }

  function pintarEje(validos) {
    const eje = $("eje");
    const ancho = eje.clientWidth || 700;
    const huecoPct = (100 * ANCHO_MARCA) / ancho;
    const max = validos.length ? validos[0].r.pct : 0;
    // Reparto en carriles para que las etiquetas no se solapen
    const ordenados = validos.slice().sort((a, b) => a.p.ches - b.p.ches);
    const finCarril = [];
    const colocados = ordenados.map((x) => {
      const pos = x.p.ches * 10;
      let carril = finCarril.findIndex((fin) => pos - fin >= huecoPct);
      if (carril === -1) carril = finCarril.length;
      finCarril[carril] = pos;
      return { ...x, pos, carril };
    });
    const carriles = Math.max(1, finCarril.length);
    eje.style.height = `${carriles * ALTO_CARRIL + 6}px`;
    eje.replaceChildren(...colocados.map(({ p, r, pos, carril }) => {
      const d = Math.round(14 + r.pct * 0.3);
      return el("div", {
        class: "marca" + (r.pct === max ? " top" : ""),
        style: { left: `${pos}%`, top: `${(carriles - 1 - carril) * ALTO_CARRIL + (44 - d) / 2}px` },
        title: `${p.nombre}: ${r.pct} % · CHES ${p.ches.toFixed(1)}${p.ches_nota ? " (" + p.ches_nota + ")" : ""}`,
      }, [
        el("span", { class: "punto", style: { width: `${d}px`, height: `${d}px`, background: p.color } }),
        el("span", { class: "pct", text: `${r.pct} %` }),
        el("span", { class: "nombre", text: p.nombre }),
      ]);
    }));
    eje.setAttribute("aria-label", "De izquierda a derecha: " +
      ordenados.map((x) => `${x.p.nombre} ${x.r.pct} %`).join(", "));
  }

  function primeraPagina(pag) {
    const m = String(Array.isArray(pag) ? pag[0] : pag).match(/\d+/);
    return m ? m[0] : null;
  }

  function fichaPartido({ p, r }, pocosDatos = false) {
    const meta = `${r.comunes} preguntas en común · eje CHES ${p.ches.toFixed(1)}/10` +
      (p.ches_nota ? ` (${p.ches_nota})` : "") + (pocosDatos ? " · pocos datos" : "");
    const resumen = el("summary", {}, [
      el("span", { class: "nombre" }, [el("span", { class: "chip", style: { background: p.color } }), p.nombre]),
      el("span", { class: "pct", text: `${r.pct} %` }),
      el("span", { class: "barra" }, el("div", { style: { width: `${r.pct}%`, background: p.color } })),
      el("span", { class: "meta", text: meta }),
    ]);
    return el("details", { class: "partido" }, [resumen, el("div", { class: "detalle" }, detalle(p))]);
  }

  function detalle(p) {
    return D.preguntas.filter((q) => q.posiciones[p.id]).map((q) => {
      const pos = q.posiciones[p.id];
      const tuya = estado.respuestas[q.id];
      const letras = q.afirmaciones.map((a) => a.letra);
      const texto = (l) => q.afirmaciones.find((a) => a.letra === l).texto;
      let sello = null;
      if (tuya && tuya.letra) {
        const dist = Math.abs(letras.indexOf(tuya.letra) - letras.indexOf(pos.letra));
        sello = dist === 0 ? ["si", "Coincide"] : dist === 1 ? ["cerca", "Cerca"] : ["no", "Lejos"];
      }
      const pag = primeraPagina(pos.pag);
      const fuente = p.programa
        ? el("a", { href: p.programa + (pag ? `#page=${pag}` : ""), target: "_blank", rel: "noopener", text: `programa, pág. ${pos.pag}` })
        : `programa, pág. ${pos.pag}`;
      return el("div", { class: "item" }, [
        el("p", { class: "q" }, [q.pregunta, sello && el("span", { class: `sello ${sello[0]}`, text: sello[1] })]),
        el("p", { text: `Tú: ${tuya && tuya.letra ? texto(tuya.letra) : "no contestaste"}` }),
        el("p", { text: `${p.nombre}: ${texto(pos.letra)}` }),
        el("blockquote", {}, [`«${pos.cita}» — `, fuente]),
      ]);
    });
  }

  function initResultado() {
    $("repetir").addEventListener("click", () => {
      estado = nuevoEstado();
      $("provincia").value = "";
      $("empezar").disabled = true;
      avisoPendientes();
      mostrar("inicio");
    });
  }

  initInicio();
  initTest();
  initResultado();
})();
