
"use strict";

function desenharGraficoConsumo(registros) {
    const container = document.getElementById("graficoConsumo");

    const dados = registros
        .filter(r => r.residencia === 1)
        .slice(0, 72);

    if (dados.length === 0) {
        container.textContent = "Nenhum dado disponível.";
        return;
    }

    const largura = 900;
    const altura = 320;
    const margem = { esquerda: 58, direita: 20, topo: 20, baixo: 48 };

    const areaLargura = largura - margem.esquerda - margem.direita;
    const areaAltura = altura - margem.topo - margem.baixo;

    const maximo = Math.max(
        10,
        ...dados.map(d => d.consumo)
    ) * 1.1;

    const x = i => margem.esquerda +
        (i / Math.max(1, dados.length - 1)) * areaLargura;

    const y = valor => margem.topo +
        areaAltura - (valor / maximo) * areaAltura;

    const ns = "http://www.w3.org/2000/svg";

    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", `0 0 ${largura} ${altura}`);
    svg.setAttribute("role", "img");
    svg.setAttribute(
        "aria-label",
        "Consumo horário simulado. Pontos vermelhos representam anomalias."
    );
    svg.style.width = "100%";

    function elemento(nome, atributos) {
        const el = document.createElementNS(ns, nome);

        Object.entries(atributos).forEach(([chave, valor]) => {
            el.setAttribute(chave, valor);
        });

        svg.appendChild(el);
        return el;
    }

    for (let i = 0; i <= 4; i++) {
        const valor = maximo * i / 4;

        elemento("line", {
            x1: margem.esquerda,
            y1: y(valor),
            x2: largura - margem.direita,
            y2: y(valor),
            stroke: "#e2e8f0"
        });

        const texto = elemento("text", {
            x: 48,
            y: y(valor) + 4,
            "text-anchor": "end",
            "font-size": 12,
            fill: "#64748b"
        });

        texto.textContent = valor.toFixed(0);
    }

    const caminho = dados.map((d, i) =>
        `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.consumo)}`
    ).join(" ");

    elemento("path", {
        d: caminho,
        fill: "none",
        stroke: "#0284c7",
        "stroke-width": 2.5,
        "stroke-linejoin": "round"
    });

    dados.forEach((d, i) => {
        if (d.anomalia === 1) {
            elemento("circle", {
                cx: x(i),
                cy: y(d.consumo),
                r: 4,
                fill: "#dc2626"
            });
        }
    });

    for (let i = 0; i < dados.length; i += 12) {
        const texto = elemento("text", {
            x: x(i),
            y: altura - 15,
            "text-anchor": "middle",
            "font-size": 12,
            fill: "#64748b"
        });

        texto.textContent = `${i}h`;
    }

    container.replaceChildren(svg);
}
