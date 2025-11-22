import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Download } from "lucide-react";

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
      return "bg-green-100 text-green-800 hover:bg-green-100";
    case "Pending":
      return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
    case "Overdue":
      return "bg-red-100 text-red-800 hover:bg-red-100";
    default:
      return "bg-gray-100 text-gray-800 hover:bg-gray-100";
  }
};

const Invoices = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Track and manage all your invoices in one place.
          </p>
        </div>
        <Button className="gap-2 w-full sm:w-auto">
          <Plus className="w-4 h-4" />
          Create Invoice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>
            View and manage your recent billing documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 p-3 sm:p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-sm sm:text-base">{invoice.id}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{invoice.client}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6">
                  <div className="text-left sm:text-right">
                    <p className="font-semibold text-sm sm:text-base">{invoice.amount}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{invoice.date}</p>
                  </div>
                  <Badge variant="secondary" className={getStatusColor(invoice.status)}>
                    {invoice.status}
                  </Badge>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
