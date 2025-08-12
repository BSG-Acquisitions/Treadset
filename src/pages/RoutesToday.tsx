import { useEffect } from "react";
import { routesToday, getStopNames } from "@/data/routes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function RoutesToday() {
  useEffect(() => {
    document.title = "Today’s Routes – BSG";
  }, []);

  return (
    <main className="container py-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Today’s Routes</h1>
          <p className="text-sm text-muted-foreground">Demo data</p>
        </div>
        <Link to="/routes/print/today"><Button variant="brand">Print View</Button></Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vehicle</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Stops</TableHead>
            <TableHead>Capacity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {routesToday.map((r) => (
            <TableRow key={r.vehicle}>
              <TableCell className="font-medium">{r.vehicle}</TableCell>
              <TableCell>{r.driver}</TableCell>
              <TableCell className="text-muted-foreground">{getStopNames(r.stops)}</TableCell>
              <TableCell>{r.capacity}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </main>
  );
}
