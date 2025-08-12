import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

interface CapacityGaugeProps {
  value: number; // 0-100
  size?: number;
}

export function CapacityGauge({ value, size = 80 }: CapacityGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const data = [{ name: "Capacity", value: clamped, fill: "hsl(var(--primary))" }];

  return (
    <div className="relative" style={{ width: size, height: size }} aria-label={`Capacity ${clamped}%`}>
      <RadialBarChart
        width={size}
        height={size}
        cx={size / 2}
        cy={size / 2}
        innerRadius={size * 0.34}
        outerRadius={size * 0.48}
        barSize={size * 0.14}
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar background dataKey="value" cornerRadius={size * 0.1} />
      </RadialBarChart>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground">
          {clamped}%
        </span>
      </div>
    </div>
  );
}
