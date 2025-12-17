import React, { forwardRef } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableWidgetProps {
  children: React.ReactNode;
  title?: string;
  isEditing?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const DraggableWidget = forwardRef<HTMLDivElement, DraggableWidgetProps>(
  ({ children, title, isEditing, className, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        style={style}
        className={cn(
          "relative h-full rounded-lg overflow-hidden",
          isEditing && "ring-2 ring-primary/50 animate-wiggle",
          className
        )}
        {...props}
      >
        {/* Drag Handle - Only visible in edit mode */}
        {isEditing && (
          <div className="drag-handle absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-primary/20 to-transparent cursor-grab active:cursor-grabbing z-10 flex items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">{title || 'Drag to move'}</span>
            <GripVertical className="h-4 w-4 text-primary" />
          </div>
        )}

        {/* Resize Handles - Corner indicators */}
        {isEditing && (
          <>
            <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-primary/50 rounded-tl pointer-events-none" />
            <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-primary/50 rounded-tr pointer-events-none" />
            <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-primary/50 rounded-bl pointer-events-none" />
            <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-primary/50 rounded-br pointer-events-none" />
          </>
        )}

        {/* Widget Content */}
        <div className="h-full overflow-auto">
          {children}
        </div>
      </div>
    );
  }
);

DraggableWidget.displayName = 'DraggableWidget';
