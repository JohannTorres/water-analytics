
"use strict";

// Gerador de números pseudoaleatórios reproduzíveis
function criarAleatorio(semente) {
    let estado = semente >>> 0;

    return function () {
        estado += 0x6D2B79F5;
        let t = estado;

        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Gerador de dados sintéticos de consumo de água
function gerarDadosSinteticos(config) {
    const {
        residencias,
        dias,
        taxaAnomalias,
        semente = 2026
    } = config;

    const aleatorio = criarAleatorio(semente);
    const horasPorResidencia = dias * 24;
    const registros = [];

    const inicio = Date.UTC(2026, 0, 1);

    const tipos = {
        0: "normal",
        1: "pico",
        2: "vazamento_continuo",
        3: "vazamento_gradual"
    };

    function perfilHorario(hora) {
        if (hora >= 6 && hora <= 9) return 2.1;
        if (hora >= 18 && hora <= 22) return 2.4;
        if (hora >= 0 && hora <= 5) return 0.25;
        return 1.0;
    }

    for (let casa = 1; casa <= residencias; casa++) {
        const perfilCasa = 0.7 + aleatorio() * 0.8;

        const rotulos = new Uint8Array(horasPorResidencia);
        const progresso = new Float32Array(horasPorResidencia);

        const alvo = Math.round(
            horasPorResidencia * taxaAnomalias / 100
        );

        let marcados = 0;
        let tentativas = 0;

        // Inserção de eventos anômalos
        while (marcados < alvo && tentativas < 10000) {
            tentativas++;

            const inicioEvento = Math.floor(
                aleatorio() * horasPorResidencia
            );

            const duracao = Math.min(
                4 + Math.floor(aleatorio() * 21),
                alvo - marcados
            );

            if (inicioEvento + duracao > horasPorResidencia) {
                continue;
            }

            let disponivel = true;

            for (let j = 0; j < duracao; j++) {
                if (rotulos[inicioEvento + j] !== 0) {
                    disponivel = false;
                    break;
                }
            }

            if (!disponivel) continue;

            const tipo = 1 + Math.floor(aleatorio() * 3);

            for (let j = 0; j < duracao; j++) {
                const indice = inicioEvento + j;

                rotulos[indice] = tipo;

                progresso[indice] = duracao === 1
                    ? 1
                    : j / (duracao - 1);
            }

            marcados += duracao;
        }

        // Completa a quantidade desejada
        for (let h = 0; h < horasPorResidencia && marcados < alvo; h++) {
            if (rotulos[h] === 0) {
                rotulos[h] = 1;
                progresso[h] = 1;
                marcados++;
            }
        }

        // Geração das medições horárias
        for (let h = 0; h < horasPorResidencia; h++) {
            const hora = h % 24;
            const dia = Math.floor(h / 24);
            const diaSemana = (4 + dia) % 7;

            const fatorFimSemana =
                diaSemana === 0 || diaSemana === 6
                    ? 1.12
                    : 1;

            const ruido = 0.8 + aleatorio() * 0.4;

            const consumoNormal =
                32 *
                perfilCasa *
                perfilHorario(hora) *
                fatorFimSemana *
                ruido;

            let consumo = consumoNormal;
            const tipo = rotulos[h];

            if (tipo === 1) {
                consumo += 90 + aleatorio() * 110;
            }

            if (tipo === 2) {
                consumo += 35 + aleatorio() * 15;
            }

            if (tipo === 3) {
                consumo += 10 + progresso[h] * 100;
            }

            registros.push({
                residencia: casa,
                timestamp: new Date(
                    inicio + h * 3600000
                ).toISOString(),
                consumo: Number(consumo.toFixed(2)),
                consumoNormal: Number(
                    consumoNormal.toFixed(2)
                ),
                anomalia: tipo === 0 ? 0 : 1,
                tipo: tipos[tipo]
            });
        }
    }

    return registros;
}
