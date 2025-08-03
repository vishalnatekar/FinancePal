import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface NetWorthData {
  date: string;
  netWorth: string;
  totalAssets: string;
  totalLiabilities: string;
}

interface NetWorthChartProps {
  data: NetWorthData[];
}

export function NetWorthChart({ data }: NetWorthChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-3xl mb-2">📈</div>
          <p>Net Worth Trend Chart</p>
          <p className="text-sm">Historical data will appear here</p>
        </div>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    date: format(new Date(item.date), "MMM dd"),
    netWorth: parseFloat(item.netWorth),
    assets: parseFloat(item.totalAssets),
    liabilities: parseFloat(item.totalLiabilities),
  })).reverse(); // Show oldest to newest

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            stroke="#6b7280"
            fontSize={12}
            tickFormatter={formatCurrency}
          />
          <Tooltip 
            formatter={(value: number) => [formatCurrency(value), ""]}
            labelStyle={{ color: "#374151" }}
            contentStyle={{
              backgroundColor: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
            }}
          />
          <Line
            type="monotone"
            dataKey="netWorth"
            stroke="hsl(207, 90%, 54%)"
            strokeWidth={3}
            dot={{ fill: "hsl(207, 90%, 54%)", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: "hsl(207, 90%, 54%)", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
