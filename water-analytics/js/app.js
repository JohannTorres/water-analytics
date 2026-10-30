
"use strict";

let dadosSimulados = [];
let resultadosExportacao = [];

const btnSimular = document.getElementById("btnSimular");
const btnValidar = document.getElementById("btnValidar");
const btnExportar = document.getElementById("btnExportar");

const status = document.getElementById("status");
const statusValidacao = document.getElementById(
    "statusValidacao"
);

function validarConfiguracao() {
    const residencias = Number(
        document.getElementById("residencias").value
    );

    const dias = Number(
        document.getElementById("dias").value
    );

    const taxaAnomalias = Number(
        document.getElementById("anomalias").value
    );

    if (
        !Number.isInteger(residencias) ||
        residencias < 1 || residencias > 500 ||
        !Number.isInteger(dias) ||
        dias < 5 || dias > 365 ||
        !Number.isFinite(taxaAnomalias) ||
        taxaAnomalias < 0 || taxaAnomalias > 100
    ) {
        throw new Error("Parâmetros inválidos.");
    }

    if (residencias * dias * 24 > 300000) {
        throw new Error(
            "O limite desta versão é de 300.000 registros."
        );
    }

    return { residencias, dias, taxaAnomalias };
}

function separarTreinoTeste(registros, dias) {
    const diasTreino = Math.floor(dias * 0.3);
    const limiteHoras = diasTreino * 24;

    const inicio = Date.parse(
        "2026-01-01T00:00:00.000Z"
    );

    const treinamento = [];
    const teste = [];

    for (const registro of registros) {
        const horas = (
            Date.parse(registro.timestamp) - inicio
        ) / 3600000;

        if (horas < limiteHoras) {
            treinamento.push(registro);
        } else {
            teste.push(registro);
        }
    }

    return { treinamento, teste };
}

function avaliarAlgoritmo(nome, teste, executar, semente) {
    const inicio = performance.now();

    const previsoes = executar();

    const tempo = performance.now() - inicio;

    const metricas = calcularMetricas(
        teste, previsoes
    );

    return {
        nome,
        semente,
        tempo,
        ...metricas,
        tipos: avaliarTipos(teste, previsoes)
    };
}

function realizarExperimento(config, semente) {
    const registros = gerarDadosSinteticos({
        ...config,
        semente
    });

    const { treinamento, teste } = separarTreinoTeste(
        registros, config.dias
    );

    const resultados = [];

    // Algoritmo 1
    resultados.push(
        avaliarAlgoritmo(
            "Limiar fixo",
            teste,
            () => detectarLimiarFixo(teste, 120),
            semente
        )
    );

    // Algoritmo 2
    resultados.push(
        avaliarAlgoritmo(
            "Z-score",
            teste,
            () => detectarZScore(treinamento, teste, 3),
            semente
        )
    );

    // Algoritmo 3
    resultados.push(
        avaliarAlgoritmo(
            "Isolation Forest",
            teste,
            () => {
                const modelo = criarIsolationForest({
                    numeroArvores: 40,
                    tamanhoAmostra: 128,
                    percentil: 0.95,
                    semente
                });

                modelo.treinar(treinamento);
                return modelo.prever(teste);
            },
            semente
        )
    );

    return {
        registros,
        treinamento,
        teste,
        resultados
    };
}

function atualizarIndicadores(registros, config) {
    const totalAnomalias = registros.reduce(
        (soma, registro) => soma + registro.anomalia,
        0
    );

    document.getElementById(
        "totalResidencias"
    ).textContent = config.residencias.toLocaleString("pt-BR");

    document.getElementById(
        "totalRegistros"
    ).textContent = registros.length.toLocaleString("pt-BR");

    document.getElementById(
        "totalAnomalias"
    ).textContent = totalAnomalias.toLocaleString("pt-BR");
}

function atualizarTabela(resultados) {
    const corpo = document.getElementById(
        "tabelaResultados"
    );

    corpo.replaceChildren();

    resultados.forEach(r => {
        const tr = document.createElement("tr");

        const valores = [
            r.nome,
            (r.precisao * 100).toFixed(2) + "%",
            (r.recall * 100).toFixed(2) + "%",
            r.f1.toFixed(4),
            r.tempo.toFixed(2)
        ];

        valores.forEach(valor => {
            const td = document.createElement("td");
            td.textContent = valor;
            tr.appendChild(td);
        });

        corpo.appendChild(tr);
    });
}

// Espera uma atualização de tela antes de processar.
function aguardarInterface() {
    return new Promise(resolve => {
        setTimeout(resolve, 0);
    });
}

// Primeira simulação com semente fixa.
btnSimular.addEventListener("click", async () => {
    btnSimular.disabled = true;
    btnValidar.disabled = true;

    try {
        const config = validarConfiguracao();

        status.textContent = "Executando experimento...";

        await aguardarInterface();

        const experimento = realizarExperimento(
            config, 2026
        );

        dadosSimulados = experimento.registros;
        resultadosExportacao = experimento.resultados;

        atualizarIndicadores(dadosSimulados, config);
        desenharGraficoConsumo(dadosSimulados);

        atualizarTabela(experimento.resultados);
        desenharMatrizes(experimento.resultados);
        desenharTabelaTipos(experimento.resultados);

        btnExportar.disabled = false;

        status.textContent =
            "Experimento executado com sucesso. " +
            "Matrizes e análises atualizadas.";

        console.table(experimento.resultados);

    } catch (erro) {
        console.error(erro);
        status.textContent = erro.message;
    } finally {
        btnSimular.disabled = false;
        btnValidar.disabled = false;
    }
});

// Validação com cinco simulações independentes.
btnValidar.addEventListener("click", async () => {
    btnSimular.disabled = true;
    btnValidar.disabled = true;
    btnExportar.disabled = true;

    try {
        const config = validarConfiguracao();

        const sementes = [
            2026, 2027, 2028, 2029, 2030
        ];

        const resultados = [];

        for (let i = 0; i < sementes.length; i++) {
            statusValidacao.textContent =
                `Executando ${i + 1} de ${sementes.length}...`;

            await aguardarInterface();

            const experimento = realizarExperimento(
                config, sementes[i]
            );

            resultados.push(...experimento.resultados);

            // Libera os dados de cada rodada antes da próxima.
        }

        const resumo = calcularResumo(resultados);

        desenharTabelaValidacao(resumo);

        resultadosExportacao = resultados;
        btnExportar.disabled = false;

        statusValidacao.textContent =
            "Validação concluída: 5 sementes, " +
            "15 avaliações de algoritmos.";

        console.table(resumo);

    } catch (erro) {
        console.error(erro);
        statusValidacao.textContent = erro.message;
    } finally {
        btnSimular.disabled = false;
        btnValidar.disabled = false;
    }
});

btnExportar.addEventListener("click", () => {
    if (resultadosExportacao.length > 0) {
        exportarCSV(resultadosExportacao);
    }
});
