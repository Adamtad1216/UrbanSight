import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { NewConnectionRequest } from "@/types/request";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/StatusBadge";

function needsPayment(status: string) {
  return ["waiting_payment", "payment_rejected"].includes(status);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function CitizenPaymentsPage() {
  const [requests, setRequests] = useState<NewConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiRequest<{ requests: NewConnectionRequest[] }>(
          "/requests/my",
        );
        setRequests(response.requests || []);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const paymentQueue = useMemo(
    () => requests.filter((request) => needsPayment(request.status)),
    [requests],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete payment for requests awaiting verification.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8 text-muted-foreground">Loading payment queue...</CardContent>
        </Card>
      ) : paymentQueue.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-muted-foreground text-center">
            No pending payments right now.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {paymentQueue.map((request) => (
            <Card key={request._id} className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="font-mono">{request._id.slice(-8).toUpperCase()}</span>
                  <StatusBadge status={request.status} />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Service: {request.serviceType}
                </p>
                <p className="text-sm font-medium">
                  Amount: {formatCurrency(request.totalEstimatedCost || 0)}
                </p>
                <Button asChild>
                  <Link to={`/citizen/payment/${request._id}`}>Pay Now</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
