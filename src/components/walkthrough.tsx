
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverAnchor } from './ui/popover';
import { cn } from '@/lib/utils';

export interface Step {
  element: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface WalkthroughProps {
  steps: Step[];
  isOpen: boolean;
  onClose: () => void;
}

export function Walkthrough({ steps, isOpen, onClose }: WalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const findElement = () => {
        try {
            const element = document.querySelector(steps[currentStep].element) as HTMLElement;
            if (element) {
                setTargetElement(element);
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                if(intervalRef.current) clearInterval(intervalRef.current);
            }
        } catch(e) {
            console.error("Walkthrough element not found:", steps[currentStep].element);
        }
    };
    
    // Sometimes elements need a moment to render
    intervalRef.current = setInterval(findElement, 100);

    return () => {
        if(intervalRef.current) clearInterval(intervalRef.current);
    };

  }, [currentStep, steps, isOpen]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setTargetElement(null);
    onClose();
  };

  if (!isOpen || !targetElement) {
    return null;
  }

  const step = steps[currentStep];

  return (
    <>
        <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={handleClose} />
        <Popover open={true}>
            <PopoverAnchor 
                className={cn(
                    "fixed z-50 rounded-lg ring-2 ring-primary ring-offset-4 ring-offset-background transition-all duration-300",
                )}
                style={{
                    top: targetElement.getBoundingClientRect().top,
                    left: targetElement.getBoundingClientRect().left,
                    width: targetElement.getBoundingClientRect().width,
                    height: targetElement.getBoundingClientRect().height,
                }}
            />
            <PopoverContent
                side={step.placement || 'bottom'}
                align="start"
                className="z-50 w-80"
                onEscapeKeyDown={handleClose}
            >
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h3 className="font-bold text-lg">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.content}</p>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                            {currentStep + 1} / {steps.length}
                        </span>
                        <div className="flex gap-2">
                            {currentStep > 0 && (
                                <Button variant="outline" size="sm" onClick={handlePrev}>
                                    <ArrowLeft className="mr-1 h-4 w-4" /> Prev
                                </Button>
                            )}
                            <Button size="sm" onClick={handleNext}>
                                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                                <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={handleClose}>
                    <X className="h-4 w-4" />
                </Button>
            </PopoverContent>
        </Popover>
    </>
  );
}
