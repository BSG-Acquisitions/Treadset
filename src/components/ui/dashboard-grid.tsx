import React, { useState, useEffect, useCallback } from 'react';
import GridLayout from 'react-grid-layout';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'react-grid-layout/css/styles.css';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const WidthProvider = require('react-grid-layout').WidthProvider;
const ReactGridLayout = WidthProvider(GridLayout);

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
    <div className={cn("relative", className)}>
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
      <ReactGridLayout
        className="layout"
        layout={layout}
        cols={cols}
        rowHeight={rowHeight}
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
      </ReactGridLayout>

      {/* Edit Mode Indicator */}
      {isEditing && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg z-50 animate-fade-in">
          <span className="text-sm font-medium">Drag to move • Corners to resize</span>
        </div>
      )}
    </div>
  );
}
