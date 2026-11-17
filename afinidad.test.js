// Ejecutar: node web/afinidad.test.js
const assert = require("node:assert/strict");
const { afinidad, partidosDeProvincia, MIN_COMUNES } = require("./afinidad.js");

const preg = (id, n, posiciones) => ({
  id, afirmaciones: "ABCD".slice(0, n).split("").map((letra) => ({ letra })), posiciones,
});
const P = [
  preg("q1", 3, { X: { letra: "A" }, Y: { letra: "C" } }),
  preg("q2", 4, { X: { letra: "B" }, Y: { letra: "D" } }),
  preg("q3", 3, { X: { letra: "C" } }),
];

// Coincidencia total con X en las tres preguntas
let r = afinidad(P, { q1: { letra: "A" }, q2: { letra: "B" }, q3: { letra: "C" } }, "X");
assert.equal(r.pct, 100);
assert.equal(r.comunes, 3);

// Extremo opuesto vale 0; adyacente en 4 opciones vale 2/3
r = afinidad(P, { q1: { letra: "C" } }, "X");
assert.equal(r.pct, 0);
r = afinidad(P, { q2: { letra: "C" } }, "X");
assert.equal(r.pct, 67);

// Y no se pronuncia en q3: no cuenta ni a favor ni en contra
r = afinidad(P, { q1: { letra: "C" }, q3: { letra: "A" } }, "Y");
assert.equal(r.pct, 100);
assert.equal(r.comunes, 1);

// "Ninguna me convence" (letra null) no cuenta
r = afinidad(P, { q1: { letra: null }, q2: { letra: "B" } }, "X");
assert.equal(r.comunes, 1);
assert.equal(r.pct, 100);

// "Me importa mucho" pesa el doble: q1 acierto (peso 2), q3 fallo total (peso 1) -> 2/3
r = afinidad(P, { q1: { letra: "A", importante: true }, q3: { letra: "A" } }, "X");
assert.equal(r.pct, 67);

// Sin preguntas en común -> null
assert.equal(afinidad(P, {}, "X"), null);
assert.equal(afinidad(P, { q1: { letra: "A" } }, "Z"), null);

// Filtrado por provincia
const partidos = [
  { id: "N", provincias: null, excluir: [] },
  { id: "R", provincias: ["Lugo"], excluir: [] },
  { id: "E", provincias: null, excluir: ["Lugo"] },
];
assert.deepEqual(partidosDeProvincia(partidos, "Lugo").map((p) => p.id), ["N", "R"]);
assert.deepEqual(partidosDeProvincia(partidos, "Madrid").map((p) => p.id), ["N", "E"]);

assert.ok(MIN_COMUNES >= 1);
console.log("afinidad: todos los tests OK");
