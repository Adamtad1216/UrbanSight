import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, Upload, Download } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { Tool, ToolPagination } from "@/types/tool";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ToolFormState = {
  code: string;
  description: string;
  source: "Warehouse" | "Store" | "Local" | "Service";
  measurement: string;
  stockPrice: string;
  customerPrice: string;
};

const defaultFormState: ToolFormState = {
  code: "",
  description: "",
  source: "Warehouse",
  measurement: "piece",
  stockPrice: "",
  customerPrice: "",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export default function ToolsManagementPage() {
  const { toast } = useToast();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<ToolPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [formState, setFormState] = useState<ToolFormState>(defaultFormState);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    successCount: number;
    failedCount: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);

  const loadTools = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiRequest<{
        tools: Tool[];
        pagination: ToolPagination;
      }>(
        `/tools?q=${encodeURIComponent(search)}&page=${page}&limit=10&includeInactive=true`,
      );
      setTools(response.tools);
      setPagination(response.pagination);
    } catch (error) {
      toast({
        title: "Failed to load tools",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => {
    loadTools();
  }, [loadTools]);

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingTool(null);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (tool: Tool) => {
    setEditingTool(tool);
    setFormState({
      code: tool.code,
      description: tool.description,
      source: tool.source,
      measurement: tool.measurement,
      stockPrice: String(tool.stockPrice),
      customerPrice: String(tool.customerPrice),
    });
    setFormOpen(true);
  };

  const submitForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      code: formState.code.trim(),
      description: formState.description.trim(),
      source: formState.source,
      measurement: formState.measurement.trim(),
      stockPrice: Number(formState.stockPrice),
      customerPrice: Number(formState.customerPrice),
    };

    if (!payload.code || !payload.description || !payload.measurement) {
      toast({
        title: "Missing data",
        description: "Code, description, and measurement are required.",
        variant: "destructive",
      });
      return;
    }

    if (Number.isNaN(payload.stockPrice) || Number.isNaN(payload.customerPrice)) {
      toast({
        title: "Invalid prices",
        description: "Enter valid numeric prices.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      if (editingTool) {
        await apiRequest(`/tools/${editingTool._id}`, {
          method: "PATCH",
          body: payload,
        });
        toast({ title: "Tool updated" });
      } else {
        await apiRequest("/tools", {
          method: "POST",
          body: payload,
        });
        toast({ title: "Tool created" });
      }

      setFormOpen(false);
      resetForm();
      await loadTools();
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const softDelete = async (tool: Tool) => {
    try {
      await apiRequest(`/tools/${tool._id}`, { method: "DELETE" });
      toast({ title: "Tool deactivated" });
      await loadTools();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    }
  };

  const pageLabel = useMemo(
    () => `Page ${pagination.page} of ${pagination.totalPages}`,
    [pagination.page, pagination.totalPages],
  );

  const submitImport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!importFile) {
      toast({
        title: "No file selected",
        description: "Choose a .xlsx or .csv file to import.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", importFile);

    try {
      setImporting(true);
      const response = await apiRequest<{
        successCount: number;
        failedCount: number;
        errors: Array<{ row: number; message: string }>;
      }>("/tools/import", {
        method: "POST",
        body: formData,
      });

      setImportSummary(response);
      toast({
        title: "Import completed",
        description: `${response.successCount} tools imported successfully, ${response.failedCount} failed`,
      });
      await loadTools();
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tools Management</h1>
          <p className="text-sm text-muted-foreground">Manage tool catalog used by surveyors.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <a href="/tool-import-template.csv" download>
              <Download className="h-4 w-4" /> Download Template
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setImportSummary(null);
              setImportFile(null);
              setImportOpen(true);
            }}
            className="gap-2"
          >
            <Upload className="h-4 w-4" /> Import Tools
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" /> Add Tool
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="pl-9"
          placeholder="Search code, description, source..."
        />
      </div>

      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Measurement</TableHead>
              <TableHead>Stock Price</TableHead>
              <TableHead>Customer Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  Loading tools...
                </TableCell>
              </TableRow>
            ) : tools.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No tools found.
                </TableCell>
              </TableRow>
            ) : (
              tools.map((tool) => (
                <TableRow key={tool._id}>
                  <TableCell className="font-medium">{tool.code}</TableCell>
                  <TableCell>{tool.description}</TableCell>
                  <TableCell>{tool.source}</TableCell>
                  <TableCell>{tool.measurement}</TableCell>
                  <TableCell>{formatMoney(tool.stockPrice)}</TableCell>
                  <TableCell>{formatMoney(tool.customerPrice)}</TableCell>
                  <TableCell>{tool.isActive ? "Active" : "Inactive"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(tool)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {tool.isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => softDelete(tool)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{pageLabel}</span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((previous) => Math.max(previous - 1, 1))}
            disabled={pagination.page <= 1}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setPage((previous) => Math.min(previous + 1, pagination.totalPages))
            }
            disabled={pagination.page >= pagination.totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingTool ? "Edit Tool" : "Add Tool"}</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={submitForm}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="tool-code">Code</Label>
                <Input
                  id="tool-code"
                  value={formState.code}
                  onChange={(event) =>
                    setFormState((previous) => ({ ...previous, code: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tool-source">Source</Label>
                <Select
                  value={formState.source}
                  onValueChange={(value: ToolFormState["source"]) =>
                    setFormState((previous) => ({ ...previous, source: value }))
                  }
                >
                  <SelectTrigger id="tool-source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Warehouse">Warehouse</SelectItem>
                    <SelectItem value="Store">Store</SelectItem>
                    <SelectItem value="Local">Local</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="tool-description">Description</Label>
                <Input
                  id="tool-description"
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tool-measurement">Measurement</Label>
                <Input
                  id="tool-measurement"
                  value={formState.measurement}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      measurement: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tool-stock">Stock Price</Label>
                <Input
                  id="tool-stock"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formState.stockPrice}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      stockPrice: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tool-customer">Customer Price</Label>
                <Input
                  id="tool-customer"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formState.customerPrice}
                  onChange={(event) =>
                    setFormState((previous) => ({
                      ...previous,
                      customerPrice: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingTool ? "Save Changes" : "Create Tool"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import Tools</DialogTitle>
          </DialogHeader>

          <form className="space-y-4" onSubmit={submitImport}>
            <div className="space-y-2">
              <Label htmlFor="tools-import-file">Excel/CSV File</Label>
              <Input
                id="tools-import-file"
                type="file"
                accept=".xlsx,.csv"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setImportFile(file);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Required headers: Code, Description, Source, Qty, Measurement, Stock Price,
                Customer Price
              </p>
            </div>

            {importSummary && (
              <div className="rounded-xl border p-3 text-sm">
                <p className="font-medium">
                  {importSummary.successCount} tools imported successfully,
                  {" "}
                  {importSummary.failedCount} failed.
                </p>
                {importSummary.errors.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto text-xs text-muted-foreground">
                    {importSummary.errors.slice(0, 10).map((errorItem) => (
                      <p key={`${errorItem.row}-${errorItem.message}`}>
                        Row {errorItem.row}: {errorItem.message}
                      </p>
                    ))}
                    {importSummary.errors.length > 10 && (
                      <p>+{importSummary.errors.length - 10} more errors</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setImportOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={importing || !importFile} className="gap-2">
                <Upload className="h-4 w-4" />
                {importing ? "Uploading..." : "Upload File"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
