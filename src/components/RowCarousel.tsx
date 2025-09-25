import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ClientCard } from "./ClientCard";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface RowCarouselProps {
  title: string;
  items: Array<{ 
    id: string; 
    name: string; 
    capacity: number; 
  lastPickup: string;
  address?: string;
  revenue?: number;
  pickupsThisMonth?: number;
    status?: 'active' | 'overdue' | 'scheduled';
  }>;
  viewAllLink?: string;
}

export function RowCarousel({ title, items, viewAllLink }: RowCarouselProps) {
  if (items.length === 0) {
    return (
      <section className="mb-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        </div>
        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground">No items to display</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-12 animate-fade-in" role="region" aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-heading`}>
      <div className="flex items-center justify-between mb-6">
        <h2 
          id={`${title.replace(/\s+/g, '-').toLowerCase()}-heading`}
          className="text-xl font-semibold text-foreground"
        >
          {title}
        </h2>
        {viewAllLink && (
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-primary">
            <Link to={viewAllLink} className="flex items-center gap-1">
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
      
      <div className="relative -mx-2">
        <Carousel
          opts={{ 
            align: "start",
            skipSnaps: false,
            dragFree: true
          }}
          className="w-full"
        >
          <CarouselContent className="ml-2">
            {items.map((item) => (
              <CarouselItem 
                key={item.id} 
                className="pl-2 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 2xl:basis-1/5"
              >
                <div className="h-full">
                   <ClientCard 
                     id={item.id} 
                     name={item.name} 
                     capacity={item.capacity} 
                     lastPickup={item.lastPickup}
                     address={item.address}
                     revenue={item.revenue || Math.floor(Math.random() * 50000) + 5000}
                     pickupsThisMonth={item.pickupsThisMonth || Math.floor(Math.random() * 12) + 1}
                     status={item.status || (item.capacity >= 90 ? 'overdue' : Math.random() > 0.7 ? 'scheduled' : 'active')}
                   />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          
          {/* Navigation arrows */}
          <CarouselPrevious className="hidden sm:flex -left-4 shadow-elevation-md hover:shadow-elevation-lg border-border/50" />
          <CarouselNext className="hidden sm:flex -right-4 shadow-elevation-md hover:shadow-elevation-lg border-border/50" />
        </Carousel>
      </div>
    </section>
  );
}
