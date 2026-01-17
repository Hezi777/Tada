import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, BarChart3 } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

// Sample data for charts
const revenueData = [
  { name: "Jan", value: 4000 },
  { name: "Feb", value: 3000 },
  { name: "Mar", value: 5000 },
  { name: "Apr", value: 4500 },
  { name: "May", value: 6000 },
  { name: "Jun", value: 5500 },
  { name: "Jul", value: 7000 },
];

const categoryData = [
  { name: "Electronics", value: 35, color: "hsl(199, 89%, 48%)" },
  { name: "Accessories", value: 28, color: "hsl(187, 75%, 55%)" },
  { name: "Clothing", value: 22, color: "hsl(173, 80%, 40%)" },
  { name: "Home", value: 15, color: "hsl(210, 60%, 50%)" },
];

const productData = [
  { name: "Widget A", sales: 4500 },
  { name: "Widget B", sales: 3200 },
  { name: "Widget C", sales: 2800 },
  { name: "Widget D", sales: 2400 },
  { name: "Widget E", sales: 1900 },
];

const dailyData = [
  { day: "Mon", orders: 45 },
  { day: "Tue", orders: 52 },
  { day: "Wed", orders: 48 },
  { day: "Thu", orders: 61 },
  { day: "Fri", orders: 55 },
  { day: "Sat", orders: 78 },
  { day: "Sun", orders: 82 },
];

const metrics = [
  { 
    title: "Total Revenue", 
    value: "$109,500", 
    change: "+23%", 
    trend: "up" as const,
    icon: DollarSign,
  },
  { 
    title: "Orders", 
    value: "1,247", 
    change: "+12%", 
    trend: "up" as const,
    icon: ShoppingCart,
  },
  { 
    title: "Customers", 
    value: "892", 
    change: "+8%", 
    trend: "up" as const,
    icon: Users,
  },
  { 
    title: "Avg. Order", 
    value: "$87.80", 
    change: "-2%", 
    trend: "down" as const,
    icon: BarChart3,
  },
] as const;

export function Dashboard() {
  return (
    <div className="flex-1 overflow-auto p-6 bg-surface">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Sales Dashboard</h1>
          <p className="text-muted-foreground">AI-generated from your uploaded data</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <div key={metric.title} className="bg-card rounded-xl p-5 border border-border shadow-card">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <metric.icon className="h-5 w-5 text-primary" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  metric.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                  {metric.trend === 'up' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {metric.change}
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{metric.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{metric.title}</p>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-card rounded-xl p-5 border border-border shadow-card">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">Revenue Over Time</h3>
              <p className="text-sm text-muted-foreground">Monthly revenue trend</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 25%, 91%)" />
                  <XAxis dataKey="name" stroke="hsl(215, 16%, 47%)" fontSize={12} />
                  <YAxis stroke="hsl(215, 16%, 47%)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(0, 0%, 100%)', 
                      border: '1px solid hsl(210, 25%, 91%)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(199, 89%, 48%)" 
                    strokeWidth={2}
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Pie Chart */}
          <div className="bg-card rounded-xl p-5 border border-border shadow-card">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">By Category</h3>
              <p className="text-sm text-muted-foreground">Revenue distribution</p>
            </div>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(0, 0%, 100%)', 
                      border: '1px solid hsl(210, 25%, 91%)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Product Bar Chart */}
          <div className="bg-card rounded-xl p-5 border border-border shadow-card">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">Top Products</h3>
              <p className="text-sm text-muted-foreground">By sales volume</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 25%, 91%)" horizontal={false} />
                  <XAxis type="number" stroke="hsl(215, 16%, 47%)" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="hsl(215, 16%, 47%)" fontSize={12} width={70} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(0, 0%, 100%)', 
                      border: '1px solid hsl(210, 25%, 91%)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="sales" fill="hsl(199, 89%, 48%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Orders Line Chart */}
          <div className="bg-card rounded-xl p-5 border border-border shadow-card">
            <div className="mb-4">
              <h3 className="font-semibold text-foreground">Daily Orders</h3>
              <p className="text-sm text-muted-foreground">This week's order volume</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 25%, 91%)" />
                  <XAxis dataKey="day" stroke="hsl(215, 16%, 47%)" fontSize={12} />
                  <YAxis stroke="hsl(215, 16%, 47%)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(0, 0%, 100%)', 
                      border: '1px solid hsl(210, 25%, 91%)',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="orders" 
                    stroke="hsl(187, 75%, 55%)" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(187, 75%, 55%)", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* AI Insight Card */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">AI Insight</h3>
              <p className="text-sm text-muted-foreground">
                Weekend sales are consistently 40% higher than weekday averages. Consider increasing 
                inventory and marketing spend on Fridays. Widget A shows the strongest growth trajectory 
                with 23% month-over-month increase.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
