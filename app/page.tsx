'use client';

import React from 'react';

import { Menu, ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';



const Dashboard = () => {

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

      img: 'https://images.unsplash.com/photo-1548036328-c9fa64d72a94?auto=format&fit=crop&w=100&q=80' // Leather bag placeholder

    },

    {

      id: 2,

      name: 'Electric Mug',

      sku: '#20293654056',

      status: 'Available',

      views: '8k',

      img: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=100&q=80' // Mug placeholder

    }

  ];



  return (

    <div className="min-h-screen bg-[#171821] text-white p-6 font-sans max-w-md mx-auto border-x border-gray-800">

      

      {/* Header */}

      <header className="flex justify-between items-center mb-8">

        <button className="p-2 hover:bg-white/10 rounded-full">

          <Menu className="w-6 h-6 text-gray-300" />

        </button>

        <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-[#2b2c3b]">

          <img 

            src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" 

            alt="Profile" 

            className="w-full h-full object-cover"

          />

        </div>

      </header>



      {/* Greeting */}

      <div className="mb-8">

        <h1 className="text-2xl font-semibold">Good Morning, John!</h1>

      </div>



      {/* Stats Row */}

      <div className="grid grid-cols-2 gap-4 mb-6">

        {/* Sales Card */}

        <div className="bg-[#21222D] p-5 rounded-3xl shadow-lg">

          <p className="text-gray-400 text-xs mb-2 text-center">Total Sales</p>

          <h2 className="text-2xl font-bold text-center mb-2">$4,200</h2>

          <div className="flex justify-center items-center text-[#00E096] text-xs font-medium">

            <div className="bg-[#00E096]/20 p-0.5 rounded-full mr-1">

                <ChevronUp size={12} strokeWidth={3} />

            </div>

            1.5%

          </div>

        </div>



        {/* Visitors Card */}

        <div className="bg-[#21222D] p-5 rounded-3xl shadow-lg">

          <p className="text-gray-400 text-xs mb-2 text-center">Total Visitors</p>

          <h2 className="text-2xl font-bold text-center mb-2">18,729</h2>

          <div className="flex justify-center items-center text-[#00E096] text-xs font-medium">

            <div className="bg-[#00E096]/20 p-0.5 rounded-full mr-1">

                <ChevronUp size={12} strokeWidth={3} />

            </div>

            0.3%

          </div>

        </div>

      </div>



      {/* Chart Section */}

      <div className="bg-[#21222D] p-5 rounded-3xl shadow-lg mb-6">

        <div className="flex justify-between items-center mb-6">

          <div className="flex items-center gap-2">

            <h3 className="text-lg font-medium">Revenue</h3>

            <div className="flex items-center text-[#00E096] text-sm font-medium">

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



        <div className="h-48 w-full">

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

      <div className="bg-[#21222D] p-6 rounded-3xl shadow-lg mb-6">

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

        <h3 className="font-medium mb-4 text-lg">Popular Products</h3>

        <div className="flex flex-col gap-4">

          {products.map((product) => (

            <div key={product.id} className="bg-[#21222D] p-4 rounded-3xl flex items-center justify-between shadow-lg">

              <div className="flex items-center gap-4">

                <div className="w-12 h-12 bg-white rounded-xl p-1 overflow-hidden flex-shrink-0">

                  <img src={product.img} alt={product.name} className="w-full h-full object-cover rounded-lg" />

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

