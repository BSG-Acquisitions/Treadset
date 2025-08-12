import { clients } from "./clients";

export type VehicleRoute = {
  vehicle: string;
  driver: string;
  capacity: number; // percent full across route
  stops: string[]; // client ids
}

export const routesToday: VehicleRoute[] = [
  {
    vehicle: "Truck #12",
    driver: "M. Carter",
    capacity: 78,
    stops: ["green-loop", "metro-tires", "riverside-auto"],
  },
  {
    vehicle: "Truck #7",
    driver: "A. Nguyen",
    capacity: 52,
    stops: ["eco-tire-co", "tire-works"],
  },
  {
    vehicle: "Truck #3",
    driver: "S. Patel",
    capacity: 91,
    stops: ["lone-star", "bsg-industries"],
  },
];

export function getStopNames(ids: string[]) {
  return ids
    .map((id) => clients.find((c) => c.id === id)?.name || id)
    .join(", ");
}
