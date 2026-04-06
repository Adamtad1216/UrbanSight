import { FormEvent, useEffect, useMemo, useState } from "react";
import { Settings2, Save } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type AppConfiguration = {
  workflow: {
    requiredTechniciansForCompletion: number;
    autoAssignSurveyor: boolean;
    autoAssignTechnicians: boolean;
    autoAssignMeterReader: boolean;
  };
  payments: {
    requireReceiptUpload: boolean;
    allowResubmissionAfterRejection: boolean;
    supportedMethods: string[];
  };
  tools: {
    maxImportFileSizeMb: number;
    updateDuplicateCodeOnImport: boolean;
  };
  notifications: {
    notifyCitizenOnStatusChange: boolean;
    notifyAssigneeOnAutoAssignment: boolean;
    enablePush: boolean;
    enableEmail: boolean;
    accountCreationTemplate: {
      push: string;
      email: string;
    };
    workflowStepTemplates: {
      new_connection: Record<
        string,
        {
          push?: string;
          email?: string;
        }
      >;
    };
  };
  citizenPortal: {
    showAssignedMeterReaderInfo: boolean;
  };
};

const defaultConfiguration: AppConfiguration = {
  workflow: {
    requiredTechniciansForCompletion: 2,
    autoAssignSurveyor: true,
    autoAssignTechnicians: true,
    autoAssignMeterReader: true,
  },
  payments: {
    requireReceiptUpload: true,
    allowResubmissionAfterRejection: true,
    supportedMethods: [],
  },
  tools: {
    maxImportFileSizeMb: 5,
    updateDuplicateCodeOnImport: true,
  },
  notifications: {
    notifyCitizenOnStatusChange: true,
    notifyAssigneeOnAutoAssignment: true,
    enablePush: true,
    enableEmail: true,
    accountCreationTemplate: {
      push: "Welcome to UrbanSight, {{name}}. Your {{role}} account has been created successfully.",
      email:
        "Hello {{name}},\n\nWelcome to UrbanSight. Your {{role}} account has been created successfully for {{email}}.\n\nRegards,\nUrbanSight Team",
    },
    workflowStepTemplates: {
      new_connection: {},
    },
  },
  citizenPortal: {
    showAssignedMeterReaderInfo: true,
  },
};

const requestWorkflowSteps = [
  "submitted",
  "adjustment_requested",
  "under_review",
  "inspection",
  "waiting_payment",
  "payment_submitted",
  "payment_verified",
  "payment_rejected",
  "approved",
  "completed",
  "rejected",
];

function toStepLabel(step: string) {
  return step
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function methodsToTextarea(methods: string[]) {
  return methods.join("\n");
}

function textareaToMethods(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function ConfigurationPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AppConfiguration>(defaultConfiguration);
  const [paymentMethodsInput, setPaymentMethodsInput] = useState("");
  const [selectedStep, setSelectedStep] = useState("submitted");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await apiRequest<{ configuration: AppConfiguration }>(
          "/configuration",
        );
        const nextConfiguration =
          response.configuration || defaultConfiguration;
        setConfig({
          ...nextConfiguration,
          notifications: {
            ...defaultConfiguration.notifications,
            ...(nextConfiguration.notifications || {}),
            accountCreationTemplate: {
              ...defaultConfiguration.notifications.accountCreationTemplate,
              ...(nextConfiguration.notifications?.accountCreationTemplate ||
                {}),
            },
            workflowStepTemplates: {
              new_connection: {
                ...(defaultConfiguration.notifications.workflowStepTemplates
                  .new_connection || {}),
                ...(nextConfiguration.notifications?.workflowStepTemplates
                  ?.new_connection || {}),
              },
            },
          },
        });
        setPaymentMethodsInput(
          methodsToTextarea(
            response.configuration?.payments?.supportedMethods || [],
          ),
        );
      } catch (error) {
        toast({
          title: "Failed to load configuration",
          description: error instanceof Error ? error.message : "Try again",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [toast]);

  const methodsCount = useMemo(
    () => textareaToMethods(paymentMethodsInput).length,
    [paymentMethodsInput],
  );

  const selectedTemplate =
    config.notifications.workflowStepTemplates?.new_connection?.[
      selectedStep
    ] || {};

  const saveConfiguration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload: AppConfiguration = {
      ...config,
      payments: {
        ...config.payments,
        supportedMethods: textareaToMethods(paymentMethodsInput),
      },
    };

    try {
      setSaving(true);
      const response = await apiRequest<{ configuration: AppConfiguration }>(
        "/configuration",
        {
          method: "PATCH",
          body: payload,
        },
      );

      setConfig(response.configuration || payload);
      setPaymentMethodsInput(
        methodsToTextarea(
          response.configuration?.payments?.supportedMethods || [],
        ),
      );

      toast({
        title: "Configuration saved",
        description: "System configuration has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to save configuration",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-muted-foreground">Loading configuration...</div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={saveConfiguration}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Configuration Center
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure workflow behavior, payments, imports, notifications, and
          citizen portal visibility in one place.
        </p>
      </div>

      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Required Technicians for Completion</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={config.workflow.requiredTechniciansForCompletion}
              onChange={(event) =>
                setConfig((previous) => ({
                  ...previous,
                  workflow: {
                    ...previous.workflow,
                    requiredTechniciansForCompletion: Number(
                      event.target.value || 1,
                    ),
                  },
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <span className="text-sm">Auto-assign Surveyor</span>
            <Switch
              checked={config.workflow.autoAssignSurveyor}
              onCheckedChange={(checked) =>
                setConfig((previous) => ({
                  ...previous,
                  workflow: {
                    ...previous.workflow,
                    autoAssignSurveyor: checked,
                  },
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <span className="text-sm">Auto-assign Technicians</span>
            <Switch
              checked={config.workflow.autoAssignTechnicians}
              onCheckedChange={(checked) =>
                setConfig((previous) => ({
                  ...previous,
                  workflow: {
                    ...previous.workflow,
                    autoAssignTechnicians: checked,
                  },
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <span className="text-sm">Auto-assign Meter Reader</span>
            <Switch
              checked={config.workflow.autoAssignMeterReader}
              onCheckedChange={(checked) =>
                setConfig((previous) => ({
                  ...previous,
                  workflow: {
                    ...previous.workflow,
                    autoAssignMeterReader: checked,
                  },
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border p-3">
            <span className="text-sm">Require Receipt Upload</span>
            <Switch
              checked={config.payments.requireReceiptUpload}
              onCheckedChange={(checked) =>
                setConfig((previous) => ({
                  ...previous,
                  payments: {
                    ...previous.payments,
                    requireReceiptUpload: checked,
                  },
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <span className="text-sm">Allow Resubmission After Rejection</span>
            <Switch
              checked={config.payments.allowResubmissionAfterRejection}
              onCheckedChange={(checked) =>
                setConfig((previous) => ({
                  ...previous,
                  payments: {
                    ...previous.payments,
                    allowResubmissionAfterRejection: checked,
                  },
                }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label>Supported Payment Methods ({methodsCount})</Label>
            <Textarea
              value={paymentMethodsInput}
              onChange={(event) => setPaymentMethodsInput(event.target.value)}
              rows={8}
              placeholder="One payment method per line"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Tools and Notifications</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Tools Import Max File Size (MB)</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={config.tools.maxImportFileSizeMb}
              onChange={(event) =>
                setConfig((previous) => ({
                  ...previous,
                  tools: {
                    ...previous.tools,
                    maxImportFileSizeMb: Number(event.target.value || 1),
                  },
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <span className="text-sm">
              Update Duplicate Tool Codes on Import
            </span>
            <Switch
              checked={config.tools.updateDuplicateCodeOnImport}
              onCheckedChange={(checked) =>
                setConfig((previous) => ({
                  ...previous,
                  tools: {
                    ...previous.tools,
                    updateDuplicateCodeOnImport: checked,
                  },
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <span className="text-sm">Notify Citizen on Status Change</span>
            <Switch
              checked={config.notifications.notifyCitizenOnStatusChange}
              onCheckedChange={(checked) =>
                setConfig((previous) => ({
                  ...previous,
                  notifications: {
                    ...previous.notifications,
                    notifyCitizenOnStatusChange: checked,
                  },
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <span className="text-sm">Enable In-App Push Notifications</span>
            <Switch
              checked={config.notifications.enablePush}
              onCheckedChange={(checked) =>
                setConfig((previous) => ({
                  ...previous,
                  notifications: {
                    ...previous.notifications,
                    enablePush: checked,
                  },
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <span className="text-sm">Enable Email Notifications</span>
            <Switch
              checked={config.notifications.enableEmail}
              onCheckedChange={(checked) =>
                setConfig((previous) => ({
                  ...previous,
                  notifications: {
                    ...previous.notifications,
                    enableEmail: checked,
                  },
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3">
            <span className="text-sm">Notify Assignee on Auto Assignment</span>
            <Switch
              checked={config.notifications.notifyAssigneeOnAutoAssignment}
              onCheckedChange={(checked) =>
                setConfig((previous) => ({
                  ...previous,
                  notifications: {
                    ...previous.notifications,
                    notifyAssigneeOnAutoAssignment: checked,
                  },
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border p-3 sm:col-span-2">
            <span className="text-sm">
              Show Assigned Meter Reader in Citizen Portal
            </span>
            <Switch
              checked={config.citizenPortal.showAssignedMeterReaderInfo}
              onCheckedChange={(checked) =>
                setConfig((previous) => ({
                  ...previous,
                  citizenPortal: {
                    ...previous.citizenPortal,
                    showAssignedMeterReaderInfo: checked,
                  },
                }))
              }
            />
          </div>

          <div className="space-y-3 rounded-xl border p-4 sm:col-span-2">
            <div className="space-y-1">
              <Label>Account Created Push Template</Label>
              <Textarea
                value={config.notifications.accountCreationTemplate.push || ""}
                onChange={(event) => {
                  const push = event.target.value;
                  setConfig((previous) => ({
                    ...previous,
                    notifications: {
                      ...previous.notifications,
                      accountCreationTemplate: {
                        ...previous.notifications.accountCreationTemplate,
                        push,
                      },
                    },
                  }));
                }}
                rows={3}
                placeholder="Push message for successful account creation"
              />
            </div>

            <div className="space-y-1">
              <Label>Account Created Email Template</Label>
              <Textarea
                value={config.notifications.accountCreationTemplate.email || ""}
                onChange={(event) => {
                  const email = event.target.value;
                  setConfig((previous) => ({
                    ...previous,
                    notifications: {
                      ...previous.notifications,
                      accountCreationTemplate: {
                        ...previous.notifications.accountCreationTemplate,
                        email,
                      },
                    },
                  }));
                }}
                rows={5}
                placeholder="Email body for successful account creation"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Account placeholders: {"{{name}}"}, {"{{role}}"}, {"{{email}}"}.
            </p>

            <div className="space-y-1">
              <Label htmlFor="workflow-step-template">
                Workflow Step Template
              </Label>
              <select
                id="workflow-step-template"
                title="Workflow Step Template"
                aria-label="Workflow Step Template"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedStep}
                onChange={(event) => setSelectedStep(event.target.value)}
              >
                {requestWorkflowSteps.map((step) => (
                  <option key={step} value={step}>
                    {toStepLabel(step)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label>Push Message Template</Label>
              <Textarea
                value={selectedTemplate.push || ""}
                onChange={(event) => {
                  const push = event.target.value;
                  setConfig((previous) => ({
                    ...previous,
                    notifications: {
                      ...previous.notifications,
                      workflowStepTemplates: {
                        new_connection: {
                          ...previous.notifications.workflowStepTemplates
                            .new_connection,
                          [selectedStep]: {
                            ...(previous.notifications.workflowStepTemplates
                              .new_connection?.[selectedStep] || {}),
                            push,
                          },
                        },
                      },
                    },
                  }));
                }}
                rows={3}
                placeholder="Message shown in in-app push notifications"
              />
            </div>

            <div className="space-y-1">
              <Label>Email Message Template</Label>
              <Textarea
                value={selectedTemplate.email || ""}
                onChange={(event) => {
                  const email = event.target.value;
                  setConfig((previous) => ({
                    ...previous,
                    notifications: {
                      ...previous.notifications,
                      workflowStepTemplates: {
                        new_connection: {
                          ...previous.notifications.workflowStepTemplates
                            .new_connection,
                          [selectedStep]: {
                            ...(previous.notifications.workflowStepTemplates
                              .new_connection?.[selectedStep] || {}),
                            email,
                          },
                        },
                      },
                    },
                  }));
                }}
                rows={5}
                placeholder="Email body for this workflow step"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              You can use placeholders: {"{{customerName}}"},{" "}
              {"{{statusLabel}}"}, {"{{reason}}"}, {"{{waterConnectionCode}}"},{" "}
              {"{{customerCode}}"}.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />{" "}
          {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </form>
  );
}
