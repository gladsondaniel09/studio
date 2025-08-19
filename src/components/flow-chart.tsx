
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
    dynamic_label: true,
  },
  {
    name: 'Cost',
    icon: DollarSign,
    entities: ['tradecost', 'cost', 'cashflow'],
  },
  {
    name: 'Container Shipment',
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
  const tradeStageName = useMemo(() => {
    const tradeEvents = data.filter(event => event.entity_name.toLowerCase().includes('trade'));
    const hasPurchase = tradeEvents.some(event => JSON.stringify(event).toLowerCase().includes('purchase'));
    const hasSell = tradeEvents.some(event => JSON.stringify(event).toLowerCase().includes('sell'));

    if(hasPurchase) return 'Purchase Trade';
    if(hasSell) return 'Sell Trade';

    return 'Physical Purchase Trade';
  }, [data]);

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
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                {flowStages.map((stage, index) => (
                    <div key={stage.name} className="flex items-center w-full">
                    <Button
                        variant="ghost"
                        onClick={() => onStageClick(stage.entities)}
                        className={cn(
                            'flex flex-col items-center text-center gap-2 w-full h-auto p-2 rounded-md transition-all',
                            selectedEntities && JSON.stringify(selectedEntities) === JSON.stringify(stage.entities)
                                ? 'bg-primary/20 border-primary border'
                                : '',
                            activeStages.has(stage.name)
                                ? 'text-primary'
                                : 'text-muted-foreground/70'
                        )}
                    >
                        <div
                        className={cn(
                            'flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all',
                            activeStages.has(stage.name)
                            ? 'bg-primary/10 border-primary'
                            : 'bg-muted border-border',
                            selectedEntities && JSON.stringify(selectedEntities) === JSON.stringify(stage.entities)
                                ? 'bg-primary/20'
                                : ''
                        )}
                        >
                        <stage.icon className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-bold font-headline text-foreground">{stage.dynamic_label ? tradeStageName : stage.name}</p>
                    </Button>
                    {index < flowStages.length - 1 && (
                        <ChevronRight className="w-8 h-8 text-muted-foreground/50 mx-2 hidden sm:block" />
                    )}
                    </div>
                ))}
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
