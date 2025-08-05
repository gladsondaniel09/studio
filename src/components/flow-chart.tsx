
'use client';

import { useMemo } from 'react';
import { ShoppingCart, Ship, CheckCircle, Tag, FileText, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { Button } from './ui/button';

const SampleEventSchema = z.object({
  entity_name: z.string(),
  action: z.string(),
});
type AuditEvent = z.infer<typeof SampleEventSchema>;

const flowStages = [
  {
    name: 'Physical Purchase Trade',
    icon: ShoppingCart,
    entities: ['trade'],
  },
  {
    name: 'Container Shipment',
    icon: Ship,
    entities: ['shipment', 'container'],
  },
  {
    name: 'Actualization',
    icon: CheckCircle,
    entities: ['actualization'],
  },
  {
    name: 'Pricing',
    icon: Tag,
    entities: ['pricing', 'price'],
  },
  {
    name: 'Commercial Invoice',
    icon: FileText,
    entities: ['invoice'],
  },
];

type FlowChartProps = {
  data: AuditEvent[];
  onStageClick: (entities: string[]) => void;
  selectedEntities: string[] | null;
};

export default function FlowChart({ data, onStageClick, selectedEntities }: FlowChartProps) {
  const activeStages = useMemo(() => {
    const active = new Set<string>();
    data.forEach(event => {
      const entityName = event.entity_name.toLowerCase();
      flowStages.forEach(stage => {
        if (stage.entities.some(e => entityName.includes(e))) {
          active.add(stage.name);
        }
      });
    });
    return active;
  }, [data]);

  return (
    <div>
        <h2 className="text-xl font-bold font-headline mb-4">Business Process Flow</h2>
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                {flowStages.map((stage, index) => (
                    <div key={stage.name} className="flex items-center">
                    <Button
                        variant="ghost"
                        onClick={() => onStageClick(stage.entities)}
                        className={cn(
                            'flex flex-col items-center text-center gap-2 w-32 h-auto p-2 rounded-md',
                            selectedEntities && JSON.stringify(selectedEntities) === JSON.stringify(stage.entities)
                                ? 'bg-primary/20'
                                : '',
                            activeStages.has(stage.name)
                                ? 'text-primary'
                                : 'text-muted-foreground'
                        )}
                    >
                        <div
                        className={cn(
                            'flex items-center justify-center w-12 h-12 rounded-full border-2',
                            activeStages.has(stage.name)
                            ? 'bg-primary/10 border-primary'
                            : 'bg-muted border-border'
                        )}
                        >
                        <stage.icon className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-semibold">{stage.name}</p>
                    </Button>
                    {index < flowStages.length - 1 && (
                        <ChevronRight className="w-8 h-8 text-muted-foreground mx-4 hidden sm:block" />
                    )}
                    </div>
                ))}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
