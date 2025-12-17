import React, { useState, useEffect, useCallback, useRef } from 'react';
import GridLayoutBase from 'react-grid-layout';
import type ReactGridLayout from 'react-grid-layout';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'react-grid-layout/css/styles.css';

// Cast to properly typed component
const GridLayout = GridLayoutBase as unknown as React.ComponentType<ReactGridLayout.ReactGridLayoutProps>;

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

interface DashboardGridProps {
  children: React.ReactNode;
  defaultLayout: LayoutItem[];
  storageKey: string;
  cols?: number;
  rowHeight?: number;
  className?: string;
}

export function DashboardGrid({
  children,
  defaultLayout,
  storageKey,
  cols = 12,
  rowHeight = 80,
  className,
}: DashboardGridProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [layout, setLayout] = useState<LayoutItem[]>(defaultLayout);
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load saved layout from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`dashboard-layout-${storageKey}`);
    if (saved) {
      try {
        setLayout(JSON.parse(saved));
      } catch {
        setLayout(defaultLayout);
      }
    }
  }, [storageKey, defaultLayout]);

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleLayoutChange = useCallback((newLayout: LayoutItem[]) => {
    setLayout(newLayout);
    localStorage.setItem(`dashboard-layout-${storageKey}`, JSON.stringify(newLayout));
  }, [storageKey]);

  const resetLayout = useCallback(() => {
    setLayout(defaultLayout);
    localStorage.removeItem(`dashboard-layout-${storageKey}`);
  }, [defaultLayout, storageKey]);

  // Clone children and add editing state
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<{ isEditing?: boolean }>, {
        isEditing,
      });
    }
    return child;
  });

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Edit Controls */}
      <div className="flex items-center gap-2 mb-4 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={resetLayout}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Layout
        </Button>
        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
          className="gap-2"
        >
          {isEditing ? (
            <>
              <Lock className="h-4 w-4" />
              Lock Layout
            </>
          ) : (
            <>
              <Unlock className="h-4 w-4" />
              Customize
            </>
          )}
        </Button>
      </div>

      {/* Grid Layout */}
      <GridLayout
        className="layout"
        layout={layout}
        cols={cols}
        rowHeight={rowHeight}
        width={containerWidth}
        onLayoutChange={handleLayoutChange}
        isDraggable={isEditing}
        isResizable={isEditing}
        draggableHandle=".drag-handle"
        resizeHandles={['se', 'sw', 'ne', 'nw']}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
      >
        {childrenWithProps}
      </GridLayout>

      {/* Edit Mode Indicator */}
      {isEditing && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg z-50 animate-fade-in">
          <span className="text-sm font-medium">Drag to move • Corners to resize</span>
        </div>
      )}
    </div>
  );
}
