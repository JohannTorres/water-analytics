
"use strict";

// WATER ANALYTICS - ANÁLISE CIENTÍFICA

function avaliarTipos(registros, previsoes) {
    const tipos = [
        "pico",
        "vazamento_continuo",
        "vazamento_gradual"
    ];

    const resultado = {};

    for (const tipo of tipos) {
        let total = 0;
        let detectados = 0;

        registros.forEach((registro, i) => {
            if (registro.tipo === tipo) {
                total++;

                if (previsoes[i] === 1) {
                    detectados++;
                }
            }
        });

        resultado[tipo] = {
            total,
            detectados,
            recall: total > 0 ? detectados / total : null
        };
    }

    return resultado;
}

function desenharMatrizes(resultados) {
    const container = document.getElementById(
        "matrizesConfusao"
    );

    container.replaceChildren();

    for (const r of resultados) {
        const card = document.createElement("article");
        card.className = "matrix-card";

        const titulo = document.createElement("h4");
        titulo.textContent = r.nome;
        card.appendChild(titulo);

        const tabela = document.createElement("table");
        tabela.className = "matrix-table";

        const linhas = [
            ["Real / Previsto", "Normal", "Anomalia"],
            ["Normal", r.vn, r.fp],
            ["Anomalia", r.fn, r.vp]
        ];

        linhas.forEach((valores, i) => {
            const tr = document.createElement("tr");

            valores.forEach((valor, j) => {
                const celula = document.createElement(
                    i === 0 || j === 0 ? "th" : "td"
                );

                celula.textContent = valor;

                if (i > 0 && j > 0) {
                    celula.className = i === j
                        ? "matrix-correct"
                        : "matrix-error";
                }

                tr.appendChild(celula);
            });

            tabela.appendChild(tr);
        });

        card.appendChild(tabela);
        container.appendChild(card);
    }
}

function desenharTabelaTipos(resultados) {
    const corpo = document.getElementById("tabelaTipos");
    corpo.replaceChildren();

    function percentual(valor) {
        return valor === null
            ? "N/A"
            : (valor * 100).toFixed(2) + "%";
    }

    resultados.forEach(r => {
        const tr = document.createElement("tr");

        const valores = [
            r.nome,
            percentual(r.tipos.pico.recall),
            percentual(r.tipos.vazamento_continuo.recall),
            percentual(r.tipos.vazamento_gradual.recall)
        ];

        valores.forEach(valor => {
            const td = document.createElement("td");
            td.textContent = valor;
            tr.appendChild(td);
        });

        corpo.appendChild(tr);
    });
}

function calcularResumo(resultados) {
    const nomes = [...new Set(
        resultados.map(r => r.nome)
    )];

    function estatisticas(valores) {
        const media = valores.reduce(
            (soma, valor) => soma + valor, 0
        ) / valores.length;

        const variancia = valores.length > 1
            ? valores.reduce(
                (soma, valor) => soma + (valor - media) ** 2,
                0
            ) / (valores.length - 1)
            : 0;

        return {
            media,
            desvio: Math.sqrt(variancia)
        };
    }

    return nomes.map(nome => {
        const grupo = resultados.filter(
            r => r.nome === nome
        );

        return {
            nome,
            precisao: estatisticas(
                grupo.map(r => r.precisao)
            ),
            recall: estatisticas(
                grupo.map(r => r.recall)
            ),
            f1: estatisticas(
                grupo.map(r => r.f1)
            )
        };
    });
}

function desenharTabelaValidacao(resumo) {
    const corpo = document.getElementById(
        "tabelaValidacao"
    );

    corpo.replaceChildren();

    resumo.forEach(r => {
        const tr = document.createElement("tr");

        const valores = [
            r.nome,
            (r.precisao.media * 100).toFixed(2) + "%",
            (r.recall.media * 100).toFixed(2) + "%",
            r.f1.media.toFixed(4),
            r.f1.desvio.toFixed(4)
        ];

        valores.forEach(valor => {
            const td = document.createElement("td");
            td.textContent = valor;
            tr.appendChild(td);
        });

        corpo.appendChild(tr);
    });
}

function exportarCSV(resultados) {
    const cabecalho = [
        "semente",
        "algoritmo",
        "precisao",
        "recall",
        "f1",
        "vp",
        "fp",
        "vn",
        "fn",
        "tempo_ms",
        "recall_pico",
        "recall_continuo",
        "recall_gradual"
    ];

    const linhas = resultados.map(r => [
        r.semente,
        r.nome,
        r.precisao,
        r.recall,
        r.f1,
        r.vp,
        r.fp,
        r.vn,
        r.fn,
        r.tempo,
        r.tipos.pico.recall ?? "",
        r.tipos.vazamento_continuo.recall ?? "",
        r.tipos.vazamento_gradual.recall ?? ""
    ]);

    
    const conteudo = [
        "sep=;",
        ...[cabecalho, ...linhas].map(linha =>
            linha.map(valor => {
                if (typeof valor === "number") {
                return String(valor).replace(".", ",");
                }

            const texto = String(valor ?? "");
            return '"' + texto.replace(/"/g, '""') + '"';
                }).join(";")
            )
        ].join("\r\n");


    const blob = new Blob(
        [conteudo],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "water_analytics_resultados.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}
