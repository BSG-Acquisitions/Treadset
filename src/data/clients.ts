export type Location = {
  id: string;
  name: string;
  address: string;
  capacity: number; // percent 0-100
}

export type Client = {
  id: string;
  name: string;
  capacity: number; // overall capacity percent
  lastPickup: string; // ISO date
  locations: Location[];
  activity: string[];
}

export const clients: Client[] = [
  {
    id: "bsg-industries",
    name: "BSG Industries",
    capacity: 72,
    lastPickup: "2025-08-01",
    locations: [
      { id: "loc-1", name: "Main Facility", address: "123 Greenway Rd, Austin, TX", capacity: 68 },
      { id: "loc-2", name: "East Yard", address: "44 Rubber Ln, Austin, TX", capacity: 80 },
    ],
    activity: ["Pickup completed • Aug 1", "Capacity alert • Jul 28", "New contact added • Jul 22"],
  },
  {
    id: "eco-tire-co",
    name: "Eco Tire Co.",
    capacity: 35,
    lastPickup: "2025-08-09",
    locations: [
      { id: "loc-1", name: "Warehouse A", address: "78 Pine St, Dallas, TX", capacity: 30 },
      { id: "loc-2", name: "Warehouse B", address: "12 Cedar Ave, Dallas, TX", capacity: 40 },
    ],
    activity: ["Pickup scheduled • Aug 12", "Invoice sent • Aug 10"],
  },
  {
    id: "green-loop",
    name: "Green Loop Recycling",
    capacity: 88,
    lastPickup: "2025-08-03",
    locations: [
      { id: "loc-1", name: "North Plant", address: "200 Ridge Rd, Waco, TX", capacity: 92 },
    ],
    activity: ["Capacity critical • Aug 11", "Route updated • Aug 10"],
  },
  {
    id: "tire-works",
    name: "TireWorks",
    capacity: 54,
    lastPickup: "2025-08-06",
    locations: [
      { id: "loc-1", name: "Service Center", address: "19 Maple Blvd, Houston, TX", capacity: 55 },
    ],
    activity: ["Contact updated • Aug 9"],
  },
  {
    id: "roadmax",
    name: "RoadMax Auto",
    capacity: 23,
    lastPickup: "2025-08-10",
    locations: [
      { id: "loc-1", name: "Garage", address: "904 Route 7, San Antonio, TX", capacity: 22 },
    ],
    activity: ["Pickup completed • Aug 10"],
  },
  {
    id: "metro-tires",
    name: "Metro Tires",
    capacity: 67,
    lastPickup: "2025-08-08",
    locations: [
      { id: "loc-1", name: "Downtown", address: "77 4th St, Austin, TX", capacity: 64 },
      { id: "loc-2", name: "Suburban", address: "15 Lakeview Dr, Round Rock, TX", capacity: 70 },
    ],
    activity: ["Pickup scheduled • Aug 12", "Note added • Aug 9"],
  },
  {
    id: "riverside-auto",
    name: "Riverside Auto",
    capacity: 41,
    lastPickup: "2025-08-02",
    locations: [
      { id: "loc-1", name: "Riverside", address: "5 River Rd, Austin, TX", capacity: 40 },
    ],
    activity: ["Pickup completed • Aug 2"],
  },
  {
    id: "lone-star",
    name: "Lone Star Fleet",
    capacity: 95,
    lastPickup: "2025-08-01",
    locations: [
      { id: "loc-1", name: "Fleet HQ", address: "600 Commerce St, Fort Worth, TX", capacity: 95 },
    ],
    activity: ["Capacity critical • Aug 11", "Pickup missed • Aug 9"],
  },
]

export function getClientById(id: string) {
  return clients.find((c) => c.id === id)
}
