import React, { useState } from 'react';
import { Menu, ChevronUp, ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, Users, FileText } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agent", href: "/agent", icon: Users },
  { name: "Invoices", href: "/invoices", icon: FileText },
];

const Dashboard = () => {
  const [open, setOpen] = useState(false);

  const NavContent = () => (
    <>
      <div className="p-6 border-b border-[#2b2c3b]">
        <h1 className="text-xl font-bold text-white">Menu</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className="flex items-center gap-3 px-4 py-3 text-gray-300 rounded-lg transition-colors hover:bg-[#2b2c3b]"
            activeClassName="bg-[#2b2c3b] text-[#7c4dff] font-medium"
            onClick={() => setOpen(false)}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );

  // Chart Data
  const chartData = [
    { day: 'Mon', val: 500 },
    { day: 'Tue', val: 1400 },
    { day: 'Wed', val: 3800 },
    { day: 'Thu', val: 2500 },
    { day: 'Fri', val: 3200 },
    { day: 'Sat', val: 3100 },
    { day: 'Sun', val: 4100 },
  ];

  // Product Data
  const products = [
    {
      id: 1,
      name: 'Creative Bag',
      sku: '#20293654058',
      status: 'Available',
      views: '14k',
      img: 'https://via.placeholder.com/100/7c4dff/ffffff?text=Bag'
    },
    {
      id: 2,
      name: 'Electric Mug',
      sku: '#20293654056',
      status: 'Available',
      views: '8k',
      img: 'https://via.placeholder.com/100/00E096/ffffff?text=Mug'
    }
  ];

  return (
    <div className="min-h-screen bg-[#171821] text-white p-4 sm:p-6 font-sans max-w-md mx-auto">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-6 sm:mb-8">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="p-2 hover:bg-white/10 rounded-full">
              <Menu className="w-6 h-6 text-gray-300" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-[#21222D] p-0 border-r border-[#2b2c3b]">
            <NavContent />
          </SheetContent>
        </Sheet>
        <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[#2b2c3b]">
          <div className="w-full h-full bg-gradient-to-br from-[#7c4dff] to-[#00E096] flex items-center justify-center text-white font-bold text-lg">
            JD
          </div>
        </div>
      </header>

      {/* Greeting */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold">Good Morning, John!</h1>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Sales Card */}
        <div className="bg-[#21222D] p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg">
          <p className="text-gray-400 text-xs mb-1 sm:mb-2 text-center">Total Sales</p>
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-1 sm:mb-2">$4,200</h2>
          <div className="flex justify-center items-center text-[#00E096] text-xs font-medium">
            <div className="bg-[#00E096]/20 p-0.5 rounded-full mr-1">
                <ChevronUp size={12} strokeWidth={3} />
            </div>
            1.5%
          </div>
        </div>

        {/* Visitors Card */}
        <div className="bg-[#21222D] p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg">
          <p className="text-gray-400 text-xs mb-1 sm:mb-2 text-center">Total Visitors</p>
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-1 sm:mb-2">18,729</h2>
          <div className="flex justify-center items-center text-[#00E096] text-xs font-medium">
            <div className="bg-[#00E096]/20 p-0.5 rounded-full mr-1">
                <ChevronUp size={12} strokeWidth={3} />
            </div>
            0.3%
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-[#21222D] p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg mb-4 sm:mb-6">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-medium">Revenue</h3>
            <div className="flex items-center text-[#00E096] text-xs sm:text-sm font-medium">
                <div className="bg-[#00E096]/20 p-0.5 rounded-full mr-1">
                    <ChevronUp size={12} strokeWidth={3} />
                </div>
                2%
            </div>
          </div>
          <button className="text-xs text-gray-400 flex items-center gap-1 hover:text-white">
            Last Week <ChevronDown size={12} />
          </button>
        </div>

        <div className="h-40 sm:h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2b2c3b" />
              <XAxis 
                dataKey="day" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6b7280', fontSize: 10 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#6b7280', fontSize: 10 }} 
                tickFormatter={(value) => `$${value/1000}k`}
                domain={[0, 4500]}
                ticks={[0, 1000, 2000, 3000, 4000]}
              />
              <Line 
                type="monotone" 
                dataKey="val" 
                stroke="#7c4dff" 
                strokeWidth={4} 
                dot={false} 
                activeDot={{ r: 6, fill: '#7c4dff', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tasks Done */}
      <div className="bg-[#21222D] p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg mb-4 sm:mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-medium">Tasks Done</h3>
          <span className="font-medium">60%</span>
        </div>
        <div className="w-full bg-[#2b2c3b] rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-orange-300 to-orange-600 h-2 rounded-full" 
            style={{ width: '60%' }}
          ></div>
        </div>
      </div>

      {/* Popular Products */}
      <div>
        <h3 className="font-medium mb-3 sm:mb-4 text-base sm:text-lg">Popular Products</h3>
        <div className="flex flex-col gap-3 sm:gap-4">
          {products.map((product) => (
            <div key={product.id} className="bg-[#21222D] p-3 sm:p-4 rounded-2xl sm:rounded-3xl flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl p-1 overflow-hidden flex-shrink-0">
                  <img src={product.img} alt={product.name} className="w-full h-full object-contain rounded-lg" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">{product.name}</h4>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[#00E096] text-xs font-medium mb-1 flex items-center justify-end gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00E096]"></div>
                    {product.status}
                </div>
                <div className="text-xs text-gray-400 flex items-center justify-end gap-1">
                    <div className="bg-gray-600/50 p-0.5 rounded-full">
                         <ChevronUp size={8} className="text-gray-300" /> 
                    </div>
                    {product.views} views
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
};

export default Dashboard;
