'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export interface FormattedMetric {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  requestsPerSec: number;
  value?: number;
}

export interface DataHeatmapD3Props {
  /**
   * Tableau de métriques structurées ou simples valeurs numériques
   */
  data: FormattedMetric[] | number[];
}

export default function DataHeatmapD3({ data }: DataHeatmapD3Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    // Extraction et normalisation des valeurs numériques
    const values: number[] = data.map((item) =>
      typeof item === 'number'
        ? item
        : item.cpuUsage ?? item.value ?? item.memoryUsage ?? 0
    );

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Dimensions du conteneur et grille
    const width = 320;
    const height = 160;
    const cols = 5;
    const cellSize = 32;
    const cellPadding = 8;

    // Échelle de couleurs D3 (interpolation Violet/Indigo pour Tailwind)
    const colorScale = d3
      .scaleSequential(d3.interpolatePurples)
      .domain([0, 100]);

    const g = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(35, 10)`);

    // Affichage des 20 derniers points sous forme de grille Heatmap (5x4)
    values.slice(-20).forEach((val, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);

      const cellGroup = g.append('g');

      // Cellule Heatmap avec bords arrondis
      cellGroup
        .append('rect')
        .attr('x', col * (cellSize + cellPadding))
        .attr('y', row * (cellSize + cellPadding))
        .attr('width', cellSize)
        .attr('height', cellSize)
        .attr('rx', 6)
        .attr('fill', colorScale(Math.max(10, val))) // Valeur min à 10 pour conserver de la visibilité
        .attr('stroke', '#334155')
        .attr('stroke-width', 1)
        .style('transition', 'fill 0.3s ease');

      // Label textuel de la valeur dans la cellule
      cellGroup
        .append('text')
        .attr('x', col * (cellSize + cellPadding) + cellSize / 2)
        .attr('y', row * (cellSize + cellPadding) + cellSize / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', val > 60 ? '#ffffff' : '#cbd5e1')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .text(`${Math.round(val)}%`);

      // Tooltip au survol
      cellGroup
        .append('title')
        .text(`Point ${idx + 1}: ${val.toFixed(1)}%`);
    });
  }, [data]);

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 bg-slate-950/50 rounded-lg border border-slate-800/80">
      {data.length > 0 ? (
        <svg ref={svgRef} className="w-full h-48 overflow-visible" />
      ) : (
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
          En attente de données pour la Heatmap...
        </div>
      )}
    </div>
  );
}