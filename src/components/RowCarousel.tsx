import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ClientCard } from "./ClientCard";

interface RowCarouselProps {
  title: string;
  items: Array<{ id: string; name: string; capacity: number; lastPickup: string }>;
}

export function RowCarousel({ title, items }: RowCarouselProps) {
  return (
    <section className="mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <div className="relative">
        <Carousel opts={{ align: "start" }}>
          <CarouselContent>
            {items.map((c) => (
              <CarouselItem key={c.id} className="basis-3/4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                <ClientCard id={c.id} name={c.name} capacity={c.capacity} lastPickup={c.lastPickup} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>
    </section>
  );
}
