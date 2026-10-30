
"use strict";

// Algoritmo 1: limiar fixo
function detectarLimiarFixo(registros, limite = 120) {
    return registros.map(registro =>
        registro.consumo > limite ? 1 : 0
    );
}
