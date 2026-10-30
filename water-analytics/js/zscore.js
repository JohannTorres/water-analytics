
"use strict";

function treinarZScore(treinamento, limite = 3) {
    const grupos = new Map();

    function chave(registro) {
        const hora = new Date(
            registro.timestamp
        ).getUTCHours();

        return `${registro.residencia}_${hora}`;
    }

    for (const registro of treinamento) {
        const k = chave(registro);

        if (!grupos.has(k)) {
            grupos.set(k, {
                soma: 0,
                somaQuadrados: 0,
                quantidade: 0
            });
        }

        const grupo = grupos.get(k);

        grupo.soma += registro.consumo;
        grupo.somaQuadrados += registro.consumo ** 2;
        grupo.quantidade++;
    }

    const estatisticas = new Map();

    for (const [k, grupo] of grupos) {
        const media = grupo.soma / grupo.quantidade;

        const variancia = Math.max(
            0,
            grupo.somaQuadrados / grupo.quantidade -
                media ** 2
        );

        estatisticas.set(k, {
            media,
            desvio: Math.max(Math.sqrt(variancia), 5)
        });
    }

    return {
        prever(teste) {
            return teste.map(registro => {
                const estatistica = estatisticas.get(
                    chave(registro)
                );

                if (!estatistica) return 0;

                const z = (
                    registro.consumo - estatistica.media
                ) / estatistica.desvio;

                return z > limite ? 1 : 0;
            });
        }
    };
}

// Compatibilidade com as etapas anteriores.
function detectarZScore(treinamento, teste, limite = 3) {
    const modelo = treinarZScore(treinamento, limite);
    return modelo.prever(teste);
}
