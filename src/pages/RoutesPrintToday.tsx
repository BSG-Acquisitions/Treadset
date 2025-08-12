import { useEffect } from "react";
import { routesToday } from "@/data/routes";

export default function RoutesPrintToday() {
  useEffect(() => {
    document.title = "Print – Today’s Routes – BSG";
  }, []);

  return (
    <main className="bg-white text-black p-6">
      <div className="print:hidden mb-4">
        <button onClick={() => window.print()} className="px-4 py-2 border rounded-md">Print</button>
      </div>
      {routesToday.map((r, idx) => (
        <section key={r.vehicle} className={idx > 0 ? "mt-8 print:break-before-page" : ""}>
          <h1 className="text-2xl font-semibold">{r.vehicle} – {r.driver}</h1>
          <p className="mb-4">Capacity: {r.capacity}%</p>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border px-2 py-1 text-left">Stop</th>
                <th className="border px-2 py-1 text-left">Client</th>
              </tr>
            </thead>
            <tbody>
              {r.stops.map((s, i) => (
                <tr key={s}>
                  <td className="border px-2 py-1">{i + 1}</td>
                  <td className="border px-2 py-1">{s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <style>{`@media print { .print\\:hidden { display:none } .print\\:break-before-page { break-before: page } }`}</style>
    </main>
  );
}
