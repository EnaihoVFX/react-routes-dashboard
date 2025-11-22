import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Calendar, DollarSign, Building2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const invoices = [
  {
    id: "INV-001",
    client: "Acme Corporation",
    amount: "$5,234.00",
    status: "Paid",
    date: "2024-01-15",
  },
  {
    id: "INV-002",
    client: "TechStart Inc.",
    amount: "$3,421.00",
    status: "Pending",
    date: "2024-01-20",
  },
  {
    id: "INV-003",
    client: "Global Solutions",
    amount: "$8,932.00",
    status: "Paid",
    date: "2024-01-22",
  },
  {
    id: "INV-004",
    client: "Innovation Labs",
    amount: "$2,156.00",
    status: "Overdue",
    date: "2024-01-10",
  },
  {
    id: "INV-005",
    client: "Digital Ventures",
    amount: "$4,567.00",
    status: "Paid",
    date: "2024-01-25",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "Paid":
      return "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400";
    case "Pending":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "Overdue":
      return "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400";
  }
};

const Invoices = () => {
  const navigate = useNavigate();

  return (
    <div className="p-3 space-y-4 md:p-6 md:space-y-6 lg:p-8 lg:space-y-8">
      {/* Header - Mobile First */}
      <div className="space-y-3 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden -ml-2 shrink-0" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Invoices</h1>
          </div>
          <p className="text-sm text-muted-foreground md:text-base">
            Track and manage all your invoices in one place.
          </p>
        </div>
        <Button className="w-full gap-2 md:w-auto" size="lg">
          <Plus className="w-4 h-4 md:w-5 md:h-5" />
          <span className="md:hidden">Create</span>
          <span className="hidden md:inline">Create Invoice</span>
        </Button>
      </div>

      {/* Invoices Card - Mobile First */}
      <Card className="border-0 shadow-sm md:border md:shadow">
        <CardHeader className="p-4 pb-3 md:p-6 md:pb-4">
          <CardTitle className="text-lg md:text-2xl">Recent Invoices</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            View and manage your recent billing documents
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3 md:p-6 md:pt-0 md:space-y-4">
          {invoices.map((invoice) => (
            <Card
              key={invoice.id}
              className="border transition-all hover:shadow-md active:scale-[0.98] md:hover:shadow"
            >
              <CardContent className="p-4 md:p-5">
                {/* Mobile Layout - Stacked */}
                <div className="space-y-4 md:hidden">
                  {/* Top Row: ID and Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base truncate">{invoice.id}</p>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={`shrink-0 ${getStatusColor(invoice.status)}`}
                    >
                      {invoice.status}
                    </Badge>
                  </div>

                  {/* Client Info */}
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground flex-1">{invoice.client}</p>
                  </div>

                  {/* Amount and Date */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="font-bold text-lg">{invoice.amount}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{invoice.date}</span>
                    </div>
                  </div>

                  {/* Action Button - Full Width on Mobile */}
                  <Button 
                    variant="outline" 
                    className="w-full gap-2 mt-2"
                    size="lg"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>

                {/* Desktop Layout - Horizontal */}
                <div className="hidden md:flex md:items-center md:justify-between md:gap-6">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base">{invoice.id}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <p className="text-sm text-muted-foreground truncate">{invoice.client}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="font-semibold text-base">{invoice.amount}</p>
                      <div className="flex items-center gap-1.5 justify-end mt-1">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{invoice.date}</p>
                      </div>
                    </div>
                    
                    <Badge 
                      variant="secondary" 
                      className={`shrink-0 ${getStatusColor(invoice.status)}`}
                    >
                      {invoice.status}
                    </Badge>
                    
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="shrink-0"
                      aria-label="Download invoice"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
