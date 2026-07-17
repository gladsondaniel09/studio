
'use client';

import { useMemo } from 'react';
import { ShoppingCart, Ship, CheckCircle, Tag, FileText, ChevronRight, DollarSign, Warehouse } from 'lucide-react';
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
    entities: ['trade', 'plannedobligation', 'physicalobligationeodrawdata'],
  },
  {
    name: 'Cost',
    icon: DollarSign,
    entities: ['tradecost', 'cost', 'cashflow'],
  },
  {
    name: 'Planning',
    icon: Ship,
    entities: ['shipment', 'container'],
  },
    {
    name: 'Inventory',
    icon: Warehouse,
    entities: ['stock', 'movement'],
  },
  {
    name: 'Actualization',
    icon: CheckCircle,
    entities: ['actualization', 'actualizedquantityobligation'],
  },
  {
    name: 'Pricing',
    icon: Tag,
    entities: ['pricing', 'price'],
  },
  {
    name: 'Invoice',
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
        if (!event.entity_name) return;
        const entityName = event.entity_name.toLowerCase();
        flowStages.forEach(stage => {
            if (stage.name === 'Physical Purchase Trade') {
                if (stage.entities.some(e => entityName.includes(e) && !entityName.includes('cost'))) {
                    active.add(stage.name);
                }
            } else {
                if (stage.entities.some(e => entityName.includes(e))) {
                    active.add(stage.name);
                }
            }
        });
    });
    return active;
  }, [data]);

  return (
    <div className="w-full">
        <Card>
            <CardContent className="p-1.5">
                <div className="flex items-center justify-between">
                {flowStages.map((stage, index) => (
                    <div key={stage.name} className="flex items-center w-full">
                    <Button
                        variant="ghost"
                        onClick={() => onStageClick(stage.entities)}
                        className={cn(
                            'flex items-center justify-center gap-1.5 w-full h-auto py-1 px-1.5 rounded-md transition-all',
                            selectedEntities && JSON.stringify(selectedEntities) === JSON.stringify(stage.entities)
                                ? 'bg-primary/20'
                                : ''
                        )}
                    >
                        <div
                        className={cn(
                            'flex items-center justify-center w-6 h-6 rounded-full border shrink-0 transition-all',
                            activeStages.has(stage.name)
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-muted border-border text-muted-foreground',
                            selectedEntities && JSON.stringify(selectedEntities) === JSON.stringify(stage.entities)
                                ? 'bg-primary/20'
                                : ''
                        )}
                        >
                        <stage.icon className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[11px] font-bold font-headline text-foreground truncate">{stage.name}</p>
                    </Button>
                    {index < flowStages.length - 1 && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 mx-1 hidden sm:block shrink-0" />
                    )}
                    </div>
                ))}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
