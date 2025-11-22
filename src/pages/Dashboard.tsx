import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Users, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Chart Data - Weekly Revenue (Car Garage)
  const chartData = [
    { day: 'Mon', val: 320 },
    { day: 'Tue', val: 480 },
    { day: 'Wed', val: 650 },
    { day: 'Thu', val: 520 },
    { day: 'Fri', val: 720 },
    { day: 'Sat', val: 680 },
    { day: 'Sun', val: 240 },
  ];

  // Invoice Data - Car Garage Services
  const invoices = [
    {
      id: "INV-001",
      client: "Mike Johnson",
      service: "Oil Change & Brake Inspection",
      amount: "$89.50",
      status: "Paid",
      date: "2024-01-15",
    },
    {
      id: "INV-002",
      client: "Sarah Martinez",
      service: "Tire Replacement (4x)",
      amount: "$420.00",
      status: "Pending",
      date: "2024-01-20",
    },
    {
      id: "INV-003",
      client: "David Chen",
      service: "Engine Diagnostic & Repair",
      amount: "$325.00",
      status: "Paid",
      date: "2024-01-22",
    },
    {
      id: "INV-004",
      client: "Emily Williams",
      service: "AC System Service",
      amount: "$145.00",
      status: "Paid",
      date: "2024-01-18",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "text-[#00E096]";
      case "Pending":
        return "text-yellow-400";
      case "Overdue":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#171821] text-white p-4 sm:p-6 font-sans max-w-md mx-auto">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-6 sm:mb-8 relative">
        <div className="flex items-center gap-2">
          {/* Hamburger Menu Button */}
          <button 
            onClick={() => setOpen(!open)}
            className="p-2.5 hover:bg-white/10 rounded-xl relative z-10 active:scale-95 transition-transform"
          >
            {/* Custom Mobile Hamburger Menu */}
            <div className="w-6 h-5 flex flex-col justify-between">
              <span className={`block h-0.5 w-full bg-gray-300 rounded-full transition-all duration-300 ${open ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`block h-0.5 w-full bg-gray-300 rounded-full transition-all duration-300 ${open ? 'opacity-0' : ''}`}></span>
              <span className={`block h-0.5 w-full bg-gray-300 rounded-full transition-all duration-300 ${open ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </div>
          </button>
          
          {/* Sliding Icons */}
          <div className="flex items-center gap-2 overflow-hidden">
            {/* Agent Icon */}
            <button
              onClick={() => {
                navigate('/agent');
                setOpen(false);
              }}
              className={`
                p-2.5 bg-[#21222D] hover:bg-[#2b2c3b] rounded-xl shadow-lg
                transition-all duration-300 ease-out
                border border-[#2b2c3b]
                ${open ? 'translate-x-0 opacity-100' : 'translate-x-[-100%] opacity-0 pointer-events-none'}
              `}
              style={{ transitionDelay: open ? '100ms' : '0ms' }}
            >
              <Users className="w-5 h-5 text-[#7c4dff]" />
            </button>
            
            {/* Invoice Icon */}
            <button
              onClick={() => {
                navigate('/invoices');
                setOpen(false);
              }}
              className={`
                p-2.5 bg-[#21222D] hover:bg-[#2b2c3b] rounded-xl shadow-lg
                transition-all duration-300 ease-out
                border border-[#2b2c3b]
                ${open ? 'translate-x-0 opacity-100' : 'translate-x-[-100%] opacity-0 pointer-events-none'}
              `}
              style={{ transitionDelay: open ? '200ms' : '0ms' }}
            >
              <FileText className="w-5 h-5 text-[#00E096]" />
            </button>
          </div>
        </div>
        
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
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-1 sm:mb-2">$2,840</h2>
          <div className="flex justify-center items-center text-[#00E096] text-xs font-medium">
            <div className="bg-[#00E096]/20 p-0.5 rounded-full mr-1">
                <ChevronUp size={12} strokeWidth={3} />
            </div>
            8.2%
          </div>
        </div>

        {/* Invoices Card */}
        <div className="bg-[#21222D] p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-lg">
          <p className="text-gray-400 text-xs mb-1 sm:mb-2 text-center">Total Invoices</p>
          <h2 className="text-xl sm:text-2xl font-bold text-center mb-1 sm:mb-2">18</h2>
          <div className="flex justify-center items-center text-[#00E096] text-xs font-medium">
            <div className="bg-[#00E096]/20 p-0.5 rounded-full mr-1">
                <ChevronUp size={12} strokeWidth={3} />
            </div>
            5.9%
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
                tickFormatter={(value) => `$${value}`}
                domain={[0, 800]}
                ticks={[0, 200, 400, 600, 800]}
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

      {/* Recent Invoices */}
      <div>
        <h3 className="font-medium mb-3 sm:mb-4 text-base sm:text-lg">Recent Invoices</h3>
        <div className="flex flex-col gap-3 sm:gap-4">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="bg-[#21222D] p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1">{invoice.id}</h4>
                  <p className="text-xs text-gray-400 mb-1">{invoice.client}</p>
                  <p className="text-xs text-gray-500">{invoice.service}</p>
                </div>
                <div className="text-right ml-3">
                  <div className="font-semibold text-sm mb-1">{invoice.amount}</div>
                  <span className={`text-xs font-medium ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500 pt-2 border-t border-[#2b2c3b]">
                {invoice.date}
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
};

export default Dashboard;

