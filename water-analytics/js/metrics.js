
"use strict";

function calcularMetricas(registros, previsoes) {
    if (registros.length !== previsoes.length) {
        throw new Error(
            "Quantidade de previsões diferente dos registros."
        );
    }

    let vp = 0;
    let fp = 0;
    let vn = 0;
    let fn = 0;

    for (let i = 0; i < registros.length; i++) {
        const real = registros[i].anomalia;
        const previsto = previsoes[i];

        if (real === 1 && previsto === 1) vp++;
        else if (real === 0 && previsto === 1) fp++;
        else if (real === 0 && previsto === 0) vn++;
        else if (real === 1 && previsto === 0) fn++;
    }

    const precisao = vp + fp > 0
        ? vp / (vp + fp)
        : 0;

    const recall = vp + fn > 0
        ? vp / (vp + fn)
        : 0;

    const f1 = precisao + recall > 0
        ? 2 * precisao * recall / (precisao + recall)
        : 0;

    return {
        vp,
        fp,
        vn,
        fn,
        precisao,
        recall,
        f1,
        detectadas: vp + fp
    };
}
