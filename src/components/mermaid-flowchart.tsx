
'use client';

import { useEffect, useState } from 'react';
import MermaidRenderer from './mermaid-renderer';

interface MermaidFlowchartProps {
  chartDefinition: string;
}

const MermaidFlowchart = ({ chartDefinition }: MermaidFlowchartProps) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Render a placeholder or nothing on the server
    return <div style={{ minHeight: '300px' }} className="flex items-center justify-center text-muted-foreground">Loading Flowchart...</div>;
  }
  
  if (!chartDefinition) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">No data to display in flowchart.</div>;
  }

  return <MermaidRenderer chartDefinition={chartDefinition} />;
};

export default MermaidFlowchart;
