
"use strict";

// WATER ANALYTICS
// Implementação experimental de Isolation Forest
// JavaScript puro, sem dependências externas.

function criarIsolationForest(config = {}) {
    const numeroArvores = config.numeroArvores ?? 40;
    const tamanhoAmostra = config.tamanhoAmostra ?? 128;
    const percentil = config.percentil ?? 0.95;
    const semente = config.semente ?? 2026;

    if (!Number.isInteger(numeroArvores) || numeroArvores < 1) {
        throw new Error("Número de árvores inválido.");
    }

    if (!Number.isInteger(tamanhoAmostra) || tamanhoAmostra < 2) {
        throw new Error("Tamanho de amostra inválido.");
    }

    if (!(percentil > 0 && percentil < 1)) {
        throw new Error("Percentil inválido.");
    }

    const aleatorio = criarAleatorio(semente);

    let arvores = [];
    let limiteAnomalia = 0;
    let tamanhoEfetivo = 0;

    // Fator de correção do comprimento de caminho.
    
const cacheCorrecao = new Map();

function fatorCorrecao(n) {
    if (n <= 1) return 0;

    if (cacheCorrecao.has(n)) {
        return cacheCorrecao.get(n);
    }

    let harmonico = 0;

    for (let i = 1; i < n; i++) {
        harmonico += 1 / i;
    }

    const resultado =
        2 * harmonico - 2 * (n - 1) / n;

    cacheCorrecao.set(n, resultado);

    return resultado;
}


    // Converte cada registro em três características.
    function extrairCaracteristicas(registro) {
        const hora = new Date(registro.timestamp).getUTCHours();
        const angulo = 2 * Math.PI * hora / 24;

        return [
            registro.consumo,
            Math.sin(angulo),
            Math.cos(angulo)
        ];
    }

    function construirArvore(dados, profundidade, maxProfundidade) {
        if (dados.length <= 1 || profundidade >= maxProfundidade) {
            return { folha: true, tamanho: dados.length };
        }

        const candidatos = [];

        for (let coluna = 0; coluna < 3; coluna++) {
            let minimo = Infinity;
            let maximo = -Infinity;

            for (const registro of dados) {
                minimo = Math.min(minimo, registro[coluna]);
                maximo = Math.max(maximo, registro[coluna]);
            }

            if (maximo > minimo) {
                candidatos.push({ coluna, minimo, maximo });
            }
        }

        if (candidatos.length === 0) {
            return { folha: true, tamanho: dados.length };
        }

        const candidato = candidatos[
            Math.floor(aleatorio() * candidatos.length)
        ];

        const pontoCorte = candidato.minimo +
            aleatorio() * (candidato.maximo - candidato.minimo);

        const esquerda = [];
        const direita = [];

        for (const registro of dados) {
            if (registro[candidato.coluna] < pontoCorte) {
                esquerda.push(registro);
            } else {
                direita.push(registro);
            }
        }

        if (esquerda.length === 0 || direita.length === 0) {
            return { folha: true, tamanho: dados.length };
        }

        return {
            folha: false,
            coluna: candidato.coluna,
            pontoCorte,
            esquerda: construirArvore(
                esquerda, profundidade + 1, maxProfundidade
            ),
            direita: construirArvore(
                direita, profundidade + 1, maxProfundidade
            )
        };
    }

    function comprimentoCaminho(arvore, registro) {
        let profundidade = 0;
        let atual = arvore;

        while (!atual.folha) {
            atual = registro[atual.coluna] < atual.pontoCorte
                ? atual.esquerda
                : atual.direita;

            profundidade++;
        }

        return profundidade + fatorCorrecao(atual.tamanho);
    }

    function pontuarCaracteristicas(caracteristicas) {
        let soma = 0;

        for (const arvore of arvores) {
            soma += comprimentoCaminho(arvore, caracteristicas);
        }

        const caminhoMedio = soma / arvores.length;
        const normalizador = fatorCorrecao(tamanhoEfetivo);

        return Math.pow(2, -caminhoMedio / normalizador);
    }

    function amostrarIndices(total, quantidade) {
        const escolhidos = new Set();

        while (escolhidos.size < quantidade) {
            escolhidos.add(Math.floor(aleatorio() * total));
        }

        return [...escolhidos];
    }

    function treinar(registros) {
        if (registros.length < 2) {
            throw new Error("Dados insuficientes para treinamento.");
        }

        const caracteristicas = registros.map(
            extrairCaracteristicas
        );

        tamanhoEfetivo = Math.min(
            tamanhoAmostra, caracteristicas.length
        );

        const profundidadeMaxima = Math.ceil(
            Math.log2(tamanhoEfetivo)
        );

        arvores = [];

        for (let i = 0; i < numeroArvores; i++) {
            const indices = amostrarIndices(
                caracteristicas.length,
                tamanhoEfetivo
            );

            const amostra = indices.map(
                indice => caracteristicas[indice]
            );

            arvores.push(
                construirArvore(amostra, 0, profundidadeMaxima)
            );
        }

        // Estima o limiar exclusivamente no treinamento.
        const pontuacoes = caracteristicas.map(
            pontuarCaracteristicas
        );

        pontuacoes.sort((a, b) => a - b);

        const indice = Math.min(
            pontuacoes.length - 1,
            Math.ceil(percentil * pontuacoes.length) - 1
        );

        limiteAnomalia = pontuacoes[indice];
    }

    function prever(registros) {
        if (arvores.length === 0) {
            throw new Error("O Isolation Forest não foi treinado.");
        }

        return registros.map(registro => {
            const caracteristicas = extrairCaracteristicas(registro);
            const pontuacao = pontuarCaracteristicas(caracteristicas);

            return pontuacao > limiteAnomalia ? 1 : 0;
        });
    }

    function obterLimiar() {
        return limiteAnomalia;
    }

    return {
        treinar,
        prever,
        obterLimiar
    };
}
