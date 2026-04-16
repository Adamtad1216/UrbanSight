import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/api";
import { NewConnectionRequest } from "@/types/request";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { RequestTimeline } from "@/components/request/RequestTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CitizenDraftCard } from "@/components/citizen/CitizenDraftCard";
import {
  deleteNewConnectionDraft,
  readNewConnectionDraft,
  type NewConnectionDraftPreview,
  type NewConnectionDraftRecord,
} from "@/lib/citizen-draft";

interface CitizenIssue {
  _id: string;
  title: string;
  category?: string;
  status: string;
  createdAt: string;
  totalEstimatedCost?: number;
}

export default function CitizenMyRequestsPage() {
  const [requests, setRequests] = useState<NewConnectionRequest[]>([]);
  const [issues, setIssues] = useState<CitizenIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedDraft, setSavedDraft] =
    useState<NewConnectionDraftRecord<NewConnectionDraftPreview> | null>(null);

  useEffect(() => {
    setSavedDraft(readNewConnectionDraft<NewConnectionDraftPreview>());

    const load = async () => {
      try {
        const response = await apiRequest<{ requests: NewConnectionRequest[] }>(
          "/requests/my",
        );
        setRequests(response.requests);

        const issueResponse = await apiRequest<{ issues: CitizenIssue[] }>(
          "/issues/my",
        );
        setIssues(issueResponse.issues || []);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleDeleteDraft = () => {
    deleteNewConnectionDraft();
    setSavedDraft(null);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track your water connection applications
          </p>
        </div>
        <Button asChild>
          <Link to="/citizen/new-connection">New Connection Request</Link>
        </Button>
      </motion.div>

      {savedDraft && (
        <CitizenDraftCard draft={savedDraft} onDelete={handleDeleteDraft} />
      )}

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Issue Reports
          </h2>
          <p className="text-muted-foreground text-sm">
            View all issues you submitted and their current workflow stage
          </p>
        </div>

        {loading ? (
          <div className="text-muted-foreground">Loading issues...</div>
        ) : issues.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-6 text-center text-muted-foreground">
              No issue reports submitted yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {issues.map((issue, index) => (
              <motion.div
                key={issue._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="glass-card rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Issue ID</p>
                    <p className="font-mono text-sm">
                      {issue._id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                  <StatusBadge status={issue.status} />
                </div>

                <div>
                  <p className="font-medium text-sm">{issue.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {issue.category || "general"}
                  </p>
                </div>

                <div className="text-xs text-muted-foreground">
                  Submitted on {new Date(issue.createdAt).toLocaleDateString()}
                </div>

                {issue.status === "waiting_payment" ? (
                  <p className="text-xs text-warning">
                    Waiting for your payment submission.
                  </p>
                ) : null}

                {issue.totalEstimatedCost ? (
                  <p className="text-xs text-muted-foreground">
                    Estimated tools/payment: ${issue.totalEstimatedCost}
                  </p>
                ) : null}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border/70" />

      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          New Connection Requests
        </h2>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading requests...</div>
      ) : requests.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-10 text-center text-muted-foreground">
            No requests submitted yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {requests.map((request, index) => (
            <motion.div
              key={request._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card rounded-xl p-4 space-y-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Request ID</p>
                  <p className="font-mono text-sm">
                    {request._id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </div>

              <div className="text-sm text-muted-foreground">
                Submitted on {new Date(request.createdAt).toLocaleDateString()}
              </div>

              <RequestTimeline
                timeline={request.timeline}
                workflowLogs={request.workflowLogs}
              />

              {request.status === "waiting_payment" ? (
                <Button asChild>
                  <Link to={`/citizen/payment/${request._id}`}>
                    Proceed to Payment
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" asChild>
                  <Link to={`/citizen/requests/${request._id}`}>
                    View details
                  </Link>
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
