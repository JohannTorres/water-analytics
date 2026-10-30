
"use strict";

// WATER ANALYTICS - EXPERIMENTOS CIENTÍFICOS
// Cenários: 1%, 5%, 10% e 15%
// Sementes: 2026, 2027, 2028, 2029, 2030

const pesquisa = {
    taxas: [1, 5, 10, 15],
    sementes: [2026, 2027, 2028, 2029, 2030],
    resultados: [],
    resumo: [],
    executando: false
};

function executarModelo(nome, treino, teste, semente) {
    let modelo;
    let previsoes;
    let tempoTreino = 0;

    // Treinamento, quando necessário.
    let inicio = performance.now();

    if (nome === "Z-score") {
        modelo = treinarZScore(treino, 3);
    }

    if (nome === "Isolation Forest") {
        modelo = criarIsolationForest({
            numeroArvores: 40,
            tamanhoAmostra: 128,
            percentil: 0.95,
            semente
        });

        modelo.treinar(treino);
    }

    tempoTreino = performance.now() - inicio;

    if (nome === "Limiar fixo") {
        tempoTreino = 0;
    }

    // Inferência sobre o conjunto de teste.
    inicio = performance.now();

    if (nome === "Limiar fixo") {
        previsoes = detectarLimiarFixo(teste, 120);
    } else {
        previsoes = modelo.prever(teste);
    }

    const tempoInferencia = performance.now() - inicio;

    const metricas = calcularMetricas(teste, previsoes);
    const tipos = avaliarTipos(teste, previsoes);

    return {
        algoritmo: nome,
        ...metricas,
        tipos,
        tempoTreino,
        tempoInferencia,
        msPorMilRegistros:
            tempoInferencia / teste.length * 1000
    };
}

function mediaDesvio(valores) {
    const n = valores.length;

    const media = valores.reduce(
        (s, v) => s + v, 0
    ) / n;

    const variancia = n > 1
        ? valores.reduce(
            (s, v) => s + (v - media) ** 2, 0
        ) / (n - 1)
        : 0;

    return {
        media,
        desvio: Math.sqrt(variancia)
    };
}

function resumirPesquisa(resultados) {
    const resumo = [];

    for (const taxa of pesquisa.taxas) {
        for (const algoritmo of [
            "Limiar fixo",
            "Z-score",
            "Isolation Forest"
        ]) {
            const grupo = resultados.filter(
                r => r.taxa === taxa &&
                     r.algoritmo === algoritmo
            );

            resumo.push({
                taxa,
                algoritmo,
                precisao: mediaDesvio(
                    grupo.map(r => r.precisao)
                ),
                recall: mediaDesvio(
                    grupo.map(r => r.recall)
                ),
                f1: mediaDesvio(
                    grupo.map(r => r.f1)
                ),
                tempoTreino: mediaDesvio(
                    grupo.map(r => r.tempoTreino)
                ),
                tempoInferencia: mediaDesvio(
                    grupo.map(r => r.tempoInferencia)
                ),
                msPorMilRegistros: mediaDesvio(
                    grupo.map(r => r.msPorMilRegistros)
                )
            });
        }
    }

    return resumo;
}

function mostrarResumoPesquisa(resumo) {
    const corpo = document.getElementById(
        "tabelaPesquisa"
    );

    corpo.replaceChildren();

    for (const r of resumo) {
        const tr = document.createElement("tr");

        const valores = [
            r.taxa + "%",
            r.algoritmo,
            (r.precisao.media * 100).toFixed(2) + "%",
            (r.recall.media * 100).toFixed(2) + "%",
            r.f1.media.toFixed(4),
            r.f1.desvio.toFixed(4)
        ];

        for (const valor of valores) {
            const td = document.createElement("td");
            td.textContent = valor;
            tr.appendChild(td);
        }

        corpo.appendChild(tr);
    }
}

function mostrarGraficoPesquisa(resumo) {
    const container = document.getElementById(
        "graficoPesquisa"
    );

    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");

    const largura = 850;
    const altura = 340;
    const esquerda = 65;
    const topo = 30;
    const areaAltura = 245;
    const areaLargura = 735;

    svg.setAttribute(
        "viewBox", `0 0 ${largura} ${altura}`
    );

    svg.setAttribute("role", "img");
    svg.setAttribute(
        "aria-label",
        "F1-score médio por taxa de anomalia"
    );

    function adicionar(tag, atributos, texto = null) {
        const el = document.createElementNS(ns, tag);

        for (const [chave, valor] of Object.entries(atributos)) {
            el.setAttribute(chave, valor);
        }

        if (texto !== null) {
            el.textContent = texto;
        }

        svg.appendChild(el);
        return el;
    }

    const y = valor =>
        topo + areaAltura * (1 - valor);

    const x = indice =>
        esquerda + indice * areaLargura / 3;

    for (let i = 0; i <= 5; i++) {
        const valor = i / 5;
        const yy = y(valor);

        adicionar("line", {
            x1: esquerda, y1: yy,
            x2: 815, y2: yy,
            stroke: "#cbd5e1",
            "stroke-dasharray": "4 4"
        });

        adicionar("text", {
            x: 50, y: yy + 4,
            "text-anchor": "end",
            "font-size": 12,
            fill: "#475569"
        }, `${Math.round(valor * 100)}%`);
    }

    pesquisa.taxas.forEach((taxa, i) => {
        adicionar("text", {
            x: x(i), y: 300,
            "text-anchor": "middle",
            "font-size": 13,
            fill: "#334155"
        }, taxa + "%");
    });

    const series = [
        { nome: "Limiar fixo", cor: "#64748b" },
        { nome: "Z-score", cor: "#0284c7" },
        { nome: "Isolation Forest", cor: "#ea580c" }
    ];

    series.forEach((serie, indiceSerie) => {
        const pontos = pesquisa.taxas.map((taxa, i) => {
            const r = resumo.find(
                item => item.taxa === taxa &&
                        item.algoritmo === serie.nome
            );

            return {
                x: x(i),
                y: y(r.f1.media)
            };
        });

        const caminho = pontos.map((p, i) =>
            `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`
        ).join(" ");

        adicionar("path", {
            d: caminho,
            fill: "none",
            stroke: serie.cor,
            "stroke-width": 3
        });

        pontos.forEach(p => {
            adicionar("circle", {
                cx: p.x,
                cy: p.y,
                r: 5,
                fill: serie.cor
            });
        });

        const legendaX = 90 + indiceSerie * 245;

        adicionar("line", {
            x1: legendaX,
            y1: 325,
            x2: legendaX + 25,
            y2: 325,
            stroke: serie.cor,
            "stroke-width": 3
        });

        adicionar("text", {
            x: legendaX + 32,
            y: 329,
            "font-size": 12,
            fill: "#334155"
        }, serie.nome);
    });

    container.replaceChildren(svg);
}


function baixarCSV(nome, cabecalho, linhas) {

    // Protege textos que contenham delimitadores ou aspas.
    function formatarValor(valor) {

        if (valor === null || valor === undefined) {
            return "";
        }

        // Converte separador decimal para o padrão brasileiro.
        if (typeof valor === "number") {
            return Number.isFinite(valor)
                ? String(valor).replace(".", ",")
                : "";
        }

        const texto = String(valor);

        return '"' + texto.replace(/"/g, '""') + '"';
    }

    // Usa ponto e vírgula como separador de colunas.
    const conteudo = [
        "sep=;",
        ...[cabecalho, ...linhas].map(linha =>
            linha.map(formatarValor).join(";")
        )
    ].join("\r\n");

    // BOM UTF-8 para preservar acentos no Excel.
    const blob = new Blob(
        ["\uFEFF" + conteudo],
        {
            type: "text/csv;charset=utf-8;"
        }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = nome;

    document.body.appendChild(link);
    link.click();

    link.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);
}


function exportarDetalhado() {
    const cabecalho = [
        "taxa_anomalia_pct", "semente", "algoritmo",
        "residencias", "dias", "registros_treino",
        "registros_teste", "precisao", "recall", "f1",
        "vp", "fp", "vn", "fn",
        "tempo_treino_ms", "tempo_inferencia_ms",
        "ms_por_1000_registros",
        "recall_pico", "recall_continuo", "recall_gradual"
    ];

    const linhas = pesquisa.resultados.map(r => [
        r.taxa, r.semente, r.algoritmo,
        r.residencias, r.dias,
        r.registrosTreino, r.registrosTeste,
        r.precisao, r.recall, r.f1,
        r.vp, r.fp, r.vn, r.fn,
        r.tempoTreino, r.tempoInferencia,
        r.msPorMilRegistros,
        r.tipos.pico.recall,
        r.tipos.vazamento_continuo.recall,
        r.tipos.vazamento_gradual.recall
    ]);

    baixarCSV(
        "water_analytics_experimentos_detalhados.csv",
        cabecalho,
        linhas
    );
}

function exportarResumo() {
    const cabecalho = [
        "taxa_anomalia_pct", "algoritmo",
        "precisao_media", "recall_medio",
        "f1_medio", "f1_desvio_padrao",
        "treino_medio_ms", "inferencia_media_ms",
        "inferencia_ms_por_1000_registros"
    ];

    const linhas = pesquisa.resumo.map(r => [
        r.taxa, r.algoritmo,
        r.precisao.media, r.recall.media,
        r.f1.media, r.f1.desvio,
        r.tempoTreino.media,
        r.tempoInferencia.media,
        r.msPorMilRegistros.media
    ]);

    baixarCSV(
        "water_analytics_resumo_cientifico.csv",
        cabecalho,
        linhas
    );
}

// Execução assíncrona entre rodadas para
// permitir a atualização visual do progresso.
function liberarInterface() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

async function executarPesquisaAmpliada() {
    if (pesquisa.executando) return;

    const botao = document.getElementById("btnPesquisa");
    const status = document.getElementById("statusPesquisa");
    const progresso = document.getElementById("progressoPesquisa");

    const btnSimular = document.getElementById("btnSimular");
    const btnValidar = document.getElementById("btnValidar");

    let config;

    try {
        config = validarConfiguracao();
    } catch (erro) {
        status.textContent = erro.message;
        return;
    }

    pesquisa.executando = true;
    pesquisa.resultados = [];
    pesquisa.resumo = [];

    botao.disabled = true;
    btnSimular.disabled = true;
    btnValidar.disabled = true;

    document.getElementById("btnCSVDetalhado").disabled = true;
    document.getElementById("btnCSVResumo").disabled = true;

    progresso.value = 0;

    try {
        const total = pesquisa.taxas.length *
            pesquisa.sementes.length;

        let rodada = 0;

        for (const taxa of pesquisa.taxas) {
            for (const semente of pesquisa.sementes) {
                status.textContent =
                    `Simulação ${rodada + 1} de ${total}: ` +
                    `${taxa}% de anomalias, semente ${semente}.`;

                await liberarInterface();

                const registros = gerarDadosSinteticos({
                    ...config,
                    taxaAnomalias: taxa,
                    semente
                });

                const { treinamento, teste } =
                    separarTreinoTeste(registros, config.dias);

                for (const nome of [
                    "Limiar fixo",
                    "Z-score",
                    "Isolation Forest"
                ]) {
                    const resultado = executarModelo(
                        nome, treinamento, teste, semente
                    );

                    pesquisa.resultados.push({
                        ...resultado,
                        taxa,
                        semente,
                        residencias: config.residencias,
                        dias: config.dias,
                        registrosTreino: treinamento.length,
                        registrosTeste: teste.length
                    });
                }

                rodada++;
                progresso.value = rodada;
            }
        }

        pesquisa.resumo = resumirPesquisa(
            pesquisa.resultados
        );

        mostrarResumoPesquisa(pesquisa.resumo);
        mostrarGraficoPesquisa(pesquisa.resumo);

        document.getElementById(
            "btnCSVDetalhado"
        ).disabled = false;

        document.getElementById(
            "btnCSVResumo"
        ).disabled = false;

        status.textContent =
            "Concluído: 20 simulações e 60 avaliações. " +
            "Resultados disponíveis para exportação.";

        console.table(pesquisa.resumo);

    } catch (erro) {
        console.error(erro);
        status.textContent = "Erro: " + erro.message;
    } finally {
        pesquisa.executando = false;
        botao.disabled = false;
        btnSimular.disabled = false;
        btnValidar.disabled = false;
    }
}

document.getElementById("btnPesquisa")
    .addEventListener("click", executarPesquisaAmpliada);

document.getElementById("btnCSVDetalhado")
    .addEventListener("click", exportarDetalhado);

document.getElementById("btnCSVResumo")
    .addEventListener("click", exportarResumo);
