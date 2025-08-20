
'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

interface MermaidRendererProps {
  chartDefinition: string;
}

const MermaidRenderer = ({ chartDefinition }: MermaidRendererProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme: appTheme } = useTheme();

  useEffect(() => {
    if (containerRef.current && chartDefinition) {
      import('mermaid').then((mermaid) => {
        mermaid.default.initialize({
          startOnLoad: false,
          theme: appTheme === 'dark' ? 'dark' : 'base',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
          },
          themeVariables: {
            'background': appTheme === 'dark' ? '#020817' : '#FFFFFF', // slate-950 or white
            'primaryColor': appTheme === 'dark' ? '#2563EB' : '#1E40AF', // blue-600 or blue-800
            'primaryTextColor': '#FFFFFF',
            'lineColor': appTheme === 'dark' ? '#334155' : '#E2E8F0', // slate-700 or slate-200
            'textColor': appTheme === 'dark' ? '#F8FAFC' : '#020817', // slate-50 or slate-950
          }
        });

        // Generate a unique ID for each render to avoid conflicts
        const mermaidId = `mermaid-svg-${Date.now()}`;
        mermaid.default.render(mermaidId, chartDefinition, (svgCode) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svgCode;
          }
        });
      });
    }
  }, [chartDefinition, appTheme]);

  return <div ref={containerRef} className="w-full h-full mermaid-container" />;
};

export default MermaidRenderer;
