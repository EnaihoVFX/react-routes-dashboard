import React, { useState } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  Settings, 
  LogOut, 
  User as UserIcon, 
  FileText,
  Plus,
  Bell
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const navigate = useNavigate();
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);
  const [jobAccepted, setJobAccepted] = useState(false);

  // Job notification data
  const jobSummary = {
    summary: "The user contacted Auto King Bethnal Green because their 2019 Ford Focus engine was smoking and smelled like oil. The agent gathered details about the car and the issue. The user is bringing the car in for assessment and provided the registration number AB12CDE. The agent advised caution while driving and confirmed they would be ready for the user's arrival."
  };

  const handleAcceptJob = () => {
    setJobAccepted(true);
    setHasUnreadNotification(false);
    // Here you would typically handle the job acceptance logic
    console.log("Job accepted");
  };

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
        return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans max-w-md mx-auto border-x border-border">
      
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
           <Button 
             variant="default" 
             size="sm" 
             className="h-9 px-4 bg-[#7c4dff] hover:bg-[#6d3fef] text-white shadow-sm rounded-full flex items-center gap-1.5"
             onClick={() => navigate('/agent')}
           >
             <Plus size={16} strokeWidth={2.5} />
             <span className="font-semibold text-xs">New Job</span>
           </Button>
           <Button 
             variant="ghost" 
             size="icon" 
             className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
             onClick={() => navigate('/invoices')}
           >
             <FileText className="h-5 w-5" />
             <span className="sr-only">Invoices</span>
           </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <Bell className="h-5 w-5" />
                {hasUnreadNotification && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full border-2 border-background"></span>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-3rem)] max-w-sm p-0" align="end">
              {!jobAccepted ? (
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm">New Job Notification</h3>
                    <Badge variant="default" className="bg-[#7c4dff]">New</Badge>
                  </div>
                  
                  <div className="mb-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Summary</p>
                      <p className="text-sm leading-relaxed">{jobSummary.summary}</p>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-[#7c4dff] hover:bg-[#6d3fef] text-white"
                    onClick={handleAcceptJob}
                  >
                    Accept Job
                  </Button>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">No new notifications</p>
                </div>
              )}
            </PopoverContent>
          </Popover>
          
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden border-2 border-primary/20 hover:border-primary transition-colors">
              <Avatar className="h-full w-full">
                 <AvatarImage src="https://github.com/shadcn.png" alt="JD" />
                 <AvatarFallback className="bg-primary/10 text-primary">JD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
             <DropdownMenuLabel>My Account</DropdownMenuLabel>
             <DropdownMenuSeparator />
             <DropdownMenuItem className="cursor-pointer">
               <UserIcon className="mr-2 h-4 w-4" />
               <span>Profile</span>
             </DropdownMenuItem>
             <DropdownMenuItem className="cursor-pointer">
               <Settings className="mr-2 h-4 w-4" />
               <span>Settings</span>
             </DropdownMenuItem>
             <DropdownMenuSeparator />
             <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
               <LogOut className="mr-2 h-4 w-4" />
               <span>Log out</span>
             </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        {/* Greeting */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold">Good Morning, John!</h1>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Sales Card */}
          <div className="bg-card p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-border hover:shadow-md transition-shadow">
            <p className="text-muted-foreground text-xs mb-1 sm:mb-2 text-center">Total Sales</p>
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-1 sm:mb-2">$2,840</h2>
            <div className="flex justify-center items-center text-[#00E096] text-xs font-medium">
              <div className="bg-[#00E096]/20 p-0.5 rounded-full mr-1">
                  <ChevronUp size={12} strokeWidth={3} />
              </div>
              8.2%
            </div>
          </div>

          {/* Invoices Card */}
          <div className="bg-card p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-border hover:shadow-md transition-shadow">
            <p className="text-muted-foreground text-xs mb-1 sm:mb-2 text-center">Total Invoices</p>
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
        <div className="bg-card p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm mb-4 sm:mb-6 border border-border hover:shadow-md transition-shadow">
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
            <button className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
              Last Week <ChevronDown size={12} />
            </button>
          </div>

          <div className="h-40 sm:h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} 
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
        <div className="bg-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm mb-4 sm:mb-6 border border-border hover:shadow-md transition-shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Tasks Done</h3>
            <span className="font-medium">60%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
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
              <div key={invoice.id} className="bg-card p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border border-border hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">{invoice.id}</h4>
                    <p className="text-xs text-muted-foreground mb-1">{invoice.client}</p>
                    <p className="text-xs text-muted-foreground">{invoice.service}</p>
                  </div>
                  <div className="text-right ml-3">
                    <div className="font-semibold text-sm mb-1">{invoice.amount}</div>
                    <span className={`text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                  {invoice.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default Dashboard;
