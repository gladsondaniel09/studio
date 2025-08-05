
'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { analyzeAudit, type FormState, type AuditMetrics } from '@/app/actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Accessibility, AlertCircle, ArrowRight, Gauge, Lightbulb, Loader2, Search, ShieldCheck } from 'lucide-react';
import PerformanceChart from './performance-chart';
import MetricCard from './metric-card';
import { Skeleton } from './ui/skeleton';

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Analyzing...
        </>
      ) : (
        <>
          Analyze Audit <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}

export default function AuditClient() {
  const [state, formAction] = useFormState(analyzeAudit, initialState);
  const { pending } = useFormStatus();
  const { toast } = useToast();

  useEffect(() => {
    if (state.error) {
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: state.error,
      });
    }
  }, [state.error, toast]);

  const metricIcons: { [key: string]: React.ReactElement } = {
    Performance: <Gauge className="h-6 w-6 text-blue-500" />,
    Accessibility: <Accessibility className="h-6 w-6 text-green-500" />,
    'Best Practices': <ShieldCheck className="h-6 w-6 text-purple-500" />,
    SEO: <Search className="h-6 w-6 text-orange-500" />,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Start Your Analysis</CardTitle>
          <CardDescription>Enter a Firebase Studio audit link to get an AI-powered breakdown and actionable insights.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow">
                <Input
                  name="url"
                  type="url"
                  placeholder="https://studio.firebase.google.com/audit-visualiser-..."
                  required
                  className="text-base"
                  aria-describedby="url-error"
                />
                 {state.zodErrors?.url && (
                   <p id="url-error" className="text-red-600 text-sm mt-1">
                     {state.zodErrors.url[0]}
                   </p>
                 )}
              </div>
              <SubmitButton />
            </div>
          </form>
        </CardContent>
      </Card>

      {pending && <LoadingSkeleton />}

      {state.data && !pending && (
        <div className="space-y-8 animate-fade-in">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Audit Results</CardTitle>
              <CardDescription>Here is a visualization of the key performance indicators from your audit.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="h-[350px] w-full">
                  <PerformanceChart metrics={state.data.metrics} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(state.data.metrics).map(([name, score]) => (
                    <MetricCard
                      key={name}
                      title={name}
                      value={score}
                      icon={metricIcons[name] || <Gauge className="h-6 w-6" />}
                      unit="%"
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center gap-3">
              <Lightbulb className="w-8 h-8 text-primary"/>
              <div>
                <CardTitle className="font-headline text-2xl">AI-Powered Insights</CardTitle>
                <CardDescription>Actionable recommendations to improve your web application.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="font-bold">Summary</AlertTitle>
                <AlertDescription>
                  {state.data.summary}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="h-[350px] w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/3" />
           <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
           <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
