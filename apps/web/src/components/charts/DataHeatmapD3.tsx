'use client';

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface DataHeatmapProps {
  data: number[];
}

export default function DataHeatmapD3({ data }: DataHeatmapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 400;
    const height = 100;
    const barWidth = width / data.length;

    const colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, 1]);

    svg
      .attr('width', width)
      .attr('height', height)
      .selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (_, i) => i * barWidth)
      .attr('y', 0)
      .attr('width', barWidth - 1)
      .attr('height', height)
      .attr('fill', (d) => colorScale(d));
  }, [data]);

  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
      <h4 className="text-sm font-medium text-slate-400 mb-2">D3.js Normalized Data Intensity</h4>
      <svg ref={svgRef} className="w-full h-auto rounded" />
    </div>
  );
}