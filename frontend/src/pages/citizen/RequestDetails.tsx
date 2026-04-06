import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { NewConnectionRequest } from "@/types/request";
import { ApplicationDetailView } from "@/components/request/ApplicationDetailView";
import { Button } from "@/components/ui/button";

export default function CitizenRequestDetailsPage() {
  const { id } = useParams();
  const [request, setRequest] = useState<NewConnectionRequest | null>(null);
  const [showMeterReaderInfo, setShowMeterReaderInfo] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const response = await apiRequest<{ request: NewConnectionRequest }>(
          `/requests/${id}`,
        );
        setRequest(response.request);

        try {
          const configResponse = await apiRequest<{
            configuration?: {
              citizenPortal?: { showAssignedMeterReaderInfo?: boolean };
            };
          }>("/configuration");

          setShowMeterReaderInfo(
            configResponse.configuration?.citizenPortal
              ?.showAssignedMeterReaderInfo ?? true,
          );
        } catch {
          setShowMeterReaderInfo(true);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return (
      <div className="text-muted-foreground">Loading request details...</div>
    );
  }

  if (!request) {
    return <div className="text-destructive">Request not found.</div>;
  }

  const canSubmitPayment =
    request.status === "waiting_payment" ||
    request.status === "payment_rejected";
  const canResubmitAdjustment = request.status === "adjustment_requested";

  return (
    <div className="space-y-6">
      <ApplicationDetailView
        request={request}
        showCitizenMeterReaderInfo={showMeterReaderInfo}
        actionPanel={
          canSubmitPayment ? (
            <Button asChild>
              <Link to={`/citizen/payment/${request._id}`}>
                Proceed to Payment
              </Link>
            </Button>
          ) : canResubmitAdjustment ? (
            <div className="space-y-3">
              {request.adjustment?.reason ? (
                <p className="text-sm text-muted-foreground">
                  Adjustment reason: {request.adjustment.reason}
                </p>
              ) : null}
              <Button asChild>
                <Link
                  to={`/citizen/new-connection?adjustmentRequestId=${request._id}`}
                >
                  Edit and Resubmit Application
                </Link>
              </Button>
            </div>
          ) : null
        }
      />
    </div>
  );
}
