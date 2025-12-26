import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/DataTable";
import { Plus, Search, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Package, Undo2, Barcode, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("brand-asc");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isTransactionDetailOpen, setIsTransactionDetailOpen] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [returnProductSearchTerm, setReturnProductSearchTerm] = useState("");
  const [transactionToDelete, setTransactionToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const [transactionFormData, setTransactionFormData] = useState({
    productId: "",
    type: "IN",
    quantity: "",
    reason: "",
    supplierId: "",
    batchNumber: "",
    unitCost: "",
    warehouseLocation: "",
    notes: "",
  });

  const [returnFormData, setReturnFormData] = useState({
    productId: "",
    customerId: "",
    orderId: "",
    quantity: "",
    reason: "",
    condition: "defective",
    refundAmount: "",
    restockable: true,
    notes: "",
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<any[]>({
    queryKey: ["/api/inventory-transactions"],
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
  });

  const { data: lowStockProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/products/low-stock"],
  });

  const { data: productReturns = [] } = useQuery<any[]>({
    queryKey: ["/api/product-returns"],
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/inventory-transactions', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products/low-stock'] });
      setIsTransactionDialogOpen(false);
      setTransactionFormData({
        productId: "",
        type: "IN",
        quantity: "",
        reason: "",
        supplierId: "",
        batchNumber: "",
        unitCost: "",
        warehouseLocation: "",
        notes: "",
      });
      toast({
        title: "Success",
        description: "Inventory transaction created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create transaction",
        variant: "destructive",
      });
    },
  });

  const createReturnMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/product-returns', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-returns'] });
      setIsReturnDialogOpen(false);
      setReturnFormData({
        productId: "",
        customerId: "",
        orderId: "",
        quantity: "",
        reason: "",
        condition: "defective",
        refundAmount: "",
        restockable: true,
        notes: "",
      });
      toast({
        title: "Success",
        description: "Product return created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create return",
        variant: "destructive",
      });
    },
  });

  const processReturnMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest('PATCH', `/api/product-returns/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/product-returns'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Success",
        description: "Product return processed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process return",
        variant: "destructive",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/inventory-transactions/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products/low-stock'] });
      setIsDeleteDialogOpen(false);
      setTransactionToDelete(null);
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
    },
  });

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantity = parseInt(transactionFormData.quantity);
    const unitCost = parseFloat(transactionFormData.unitCost);
    
    if (!transactionFormData.productId || !transactionFormData.reason) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid quantity greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    const transactionData: any = {
      productId: transactionFormData.productId,
      type: transactionFormData.type,
      quantity,
      reason: transactionFormData.reason,
    };
    
    if (transactionFormData.supplierId) transactionData.supplierId = transactionFormData.supplierId;
    if (transactionFormData.batchNumber) transactionData.batchNumber = transactionFormData.batchNumber;
    if (!isNaN(unitCost)) transactionData.unitCost = unitCost;
    if (transactionFormData.warehouseLocation) transactionData.warehouseLocation = transactionFormData.warehouseLocation;
    if (transactionFormData.notes) transactionData.notes = transactionFormData.notes;
    
    createTransactionMutation.mutate(transactionData);
  };

  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantity = parseInt(returnFormData.quantity);
    const refundAmount = parseFloat(returnFormData.refundAmount);
    
    if (!returnFormData.productId || !returnFormData.reason) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid quantity",
        variant: "destructive",
      });
      return;
    }
    
    const returnData: any = {
      productId: returnFormData.productId,
      quantity,
      reason: returnFormData.reason,
      condition: returnFormData.condition,
      restockable: returnFormData.restockable,
    };
    
    if (returnFormData.customerId) returnData.customerId = returnFormData.customerId;
    if (returnFormData.orderId) returnData.orderId = returnFormData.orderId;
    if (!isNaN(refundAmount)) returnData.refundAmount = refundAmount;
    if (returnFormData.notes) returnData.notes = returnFormData.notes;
    
    createReturnMutation.mutate(returnData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSortedProducts = (productsToSort: any[]) => {
    return productsToSort.sort((a: any, b: any) => {
      switch (sortBy) {
        case "brand-asc":
          return a.brand.localeCompare(b.brand);
        case "brand-desc":
          return b.brand.localeCompare(a.brand);
        case "stock-high":
          return (b.stockQty || 0) - (a.stockQty || 0);
        case "stock-low":
          return (a.stockQty || 0) - (b.stockQty || 0);
        case "price-high":
          return (b.sellingPrice || 0) - (a.sellingPrice || 0);
        case "price-low":
          return (a.sellingPrice || 0) - (b.sellingPrice || 0);
        case "category-asc":
          return (a.category || "").localeCompare(b.category || "");
        default:
          return 0;
      }
    });
  };

  const getTransactionBadge = (type: string) => {
    const variants: Record<string, { variant: string; icon: any; label: string; color: string }> = {
      IN: { variant: "outline", icon: ArrowUpCircle, label: "IN", color: "text-green-600" },
      OUT: { variant: "outline", icon: ArrowDownCircle, label: "OUT", color: "text-red-600" },
      RETURN: { variant: "outline", icon: Undo2, label: "RETURN", color: "text-blue-600" },
      ADJUSTMENT: { variant: "outline", icon: Package, label: "ADJUST", color: "text-orange-600" },
    };
    
    const config = variants[type] || variants.IN;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant as any} className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getReturnStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      processed: "outline",
    };
    
    return (
      <Badge variant={variants[status] as any}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const filteredTransactions = transactions.filter((transaction: any) => {
    const productName = transaction.productId?.productName || transaction.productId?.name || transaction.productId?.model || "";
    const reason = transaction.reason || "";
    return productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           reason.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (transactionsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground mt-1">Track stock movements, manage returns, and monitor inventory levels</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={isTransactionDialogOpen} onOpenChange={(open) => {
            setIsTransactionDialogOpen(open);
            if (!open) setProductSearchTerm("");
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-transaction" className="hidden">
                <Plus className="h-4 w-4 mr-2" />
                New Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Inventory Transaction</DialogTitle>
                <DialogDescription>
                  Record stock movement with supply details
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTransaction} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="productId">Product *</Label>
                    <Select
                      value={transactionFormData.productId}
                      onValueChange={(value) => setTransactionFormData({ ...transactionFormData, productId: value })}
                    >
                      <SelectTrigger data-testid="select-product">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent className="p-0">
                        <div className="sticky top-0 z-10 bg-popover p-2 border-b">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search products..."
                              className="pl-8 h-8"
                              value={productSearchTerm}
                              onChange={(e) => setProductSearchTerm(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              data-testid="input-search-product"
                            />
                          </div>
                        </div>
                        {products
                          .filter((product: any) => {
                            const displayName = (product.productName || product.name || product.model || "").toLowerCase();
                            const brand = (product.brand || "").toLowerCase();
                            const search = productSearchTerm.toLowerCase();
                            return displayName.includes(search) || brand.includes(search);
                          })
                          .map((product: any) => (
                          <SelectItem key={product._id} value={product._id}>
                            {product.productName || product.name || product.model || "Unknown"} - {product.brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Transaction Type *</Label>
                    <Select
                      value={transactionFormData.type}
                      onValueChange={(value) => setTransactionFormData({ ...transactionFormData, type: value })}
                    >
                      <SelectTrigger data-testid="select-transaction-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IN">Stock In</SelectItem>
                        <SelectItem value="OUT">Stock Out</SelectItem>
                        <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                        <SelectItem value="RETURN">Return</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={transactionFormData.quantity}
                      onChange={(e) => setTransactionFormData({ ...transactionFormData, quantity: e.target.value })}
                      required
                      data-testid="input-transaction-quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitCost">Unit Cost</Label>
                    <Input
                      id="unitCost"
                      type="number"
                      step="0.01"
                      value={transactionFormData.unitCost}
                      onChange={(e) => setTransactionFormData({ ...transactionFormData, unitCost: e.target.value })}
                      data-testid="input-unit-cost"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason *</Label>
                  <Textarea
                    id="reason"
                    value={transactionFormData.reason}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, reason: e.target.value })}
                    required
                    data-testid="input-transaction-reason"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input
                    id="batchNumber"
                    value={transactionFormData.batchNumber}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, batchNumber: e.target.value })}
                    data-testid="input-batch-number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warehouseLocation">Warehouse Location</Label>
                  <Input
                    id="warehouseLocation"
                    value={transactionFormData.warehouseLocation}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, warehouseLocation: e.target.value })}
                    data-testid="input-warehouse-location"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={transactionFormData.notes}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, notes: e.target.value })}
                    data-testid="input-transaction-notes"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsTransactionDialogOpen(false)}
                    data-testid="button-cancel-transaction"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createTransactionMutation.isPending}
                    data-testid="button-submit-transaction"
                  >
                    {createTransactionMutation.isPending ? 'Creating...' : 'Create Transaction'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isReturnDialogOpen} onOpenChange={(open) => {
            setIsReturnDialogOpen(open);
            if (!open) setReturnProductSearchTerm("");
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-new-return">
                <Undo2 className="h-4 w-4 mr-2" />
                Product Return
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Product Return</DialogTitle>
                <DialogDescription>
                  Record a product return from customer
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateReturn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="returnProductId">Product *</Label>
                  <Select
                    value={returnFormData.productId}
                    onValueChange={(value) => setReturnFormData({ ...returnFormData, productId: value })}
                  >
                    <SelectTrigger data-testid="select-return-product">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent className="p-0">
                      <div className="sticky top-0 z-10 bg-popover p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search products..."
                            className="pl-8 h-8"
                            value={returnProductSearchTerm}
                            onChange={(e) => setReturnProductSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            data-testid="input-search-return-product"
                          />
                        </div>
                      </div>
                      {products
                        .filter((product: any) => {
                          const displayName = (product.productName || product.name || product.model || "").toLowerCase();
                          const brand = (product.brand || "").toLowerCase();
                          const search = returnProductSearchTerm.toLowerCase();
                          return displayName.includes(search) || brand.includes(search);
                        })
                        .map((product: any) => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.productName || product.name || product.model || "Unknown"} - {product.brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="returnQuantity">Quantity *</Label>
                    <Input
                      id="returnQuantity"
                      type="number"
                      value={returnFormData.quantity}
                      onChange={(e) => setReturnFormData({ ...returnFormData, quantity: e.target.value })}
                      required
                      data-testid="input-return-quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condition">Condition *</Label>
                    <Select
                      value={returnFormData.condition}
                      onValueChange={(value) => setReturnFormData({ ...returnFormData, condition: value })}
                    >
                      <SelectTrigger data-testid="select-return-condition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="defective">Defective</SelectItem>
                        <SelectItem value="damaged">Damaged</SelectItem>
                        <SelectItem value="wrong_item">Wrong Item</SelectItem>
                        <SelectItem value="not_as_described">Not as Described</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="returnReason">Reason *</Label>
                  <Textarea
                    id="returnReason"
                    value={returnFormData.reason}
                    onChange={(e) => setReturnFormData({ ...returnFormData, reason: e.target.value })}
                    required
                    data-testid="input-return-reason"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="refundAmount">Refund Amount</Label>
                    <Input
                      id="refundAmount"
                      type="number"
                      step="0.01"
                      value={returnFormData.refundAmount}
                      onChange={(e) => setReturnFormData({ ...returnFormData, refundAmount: e.target.value })}
                      data-testid="input-refund-amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="restockable">Restockable</Label>
                    <Select
                      value={returnFormData.restockable ? "true" : "false"}
                      onValueChange={(value) => setReturnFormData({ ...returnFormData, restockable: value === "true" })}
                    >
                      <SelectTrigger data-testid="select-restockable">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="returnNotes">Additional Notes</Label>
                  <Textarea
                    id="returnNotes"
                    value={returnFormData.notes}
                    onChange={(e) => setReturnFormData({ ...returnFormData, notes: e.target.value })}
                    data-testid="input-return-notes"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsReturnDialogOpen(false)}
                    data-testid="button-cancel-return"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createReturnMutation.isPending}
                    data-testid="button-submit-return"
                  >
                    {createReturnMutation.isPending ? 'Creating...' : 'Create Return'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <div className="w-full overflow-x-auto">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="products" data-testid="tab-products">Products Catalog</TabsTrigger>
            <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
            <TabsTrigger value="low-stock" data-testid="tab-low-stock">
              Low Stock Alerts
              {lowStockProducts.length > 0 && (
                <Badge variant="destructive" className="ml-2">{lowStockProducts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="returns" data-testid="tab-returns">Product Returns</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="products" className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="sort-select" className="text-sm text-muted-foreground mb-2 block">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort-select" className="w-full" data-testid="select-sort-inventory">
                  <SelectValue placeholder="Select sort option..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brand-asc">Brand (A-Z)</SelectItem>
                  <SelectItem value="brand-desc">Brand (Z-A)</SelectItem>
                  <SelectItem value="stock-high">Stock Level (High to Low)</SelectItem>
                  <SelectItem value="stock-low">Stock Level (Low to High)</SelectItem>
                  <SelectItem value="price-high">Price (High to Low)</SelectItem>
                  <SelectItem value="price-low">Price (Low to High)</SelectItem>
                  <SelectItem value="category-asc">Category (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="category-filter" className="text-sm text-muted-foreground mb-2 block">Filter by Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category-filter" className="w-full" data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Array.from(new Set(products.map((p: any) => p.category).filter(Boolean))).sort().map((category: any) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Catalog ({selectedCategory === "all" ? products.length : products.filter((p: any) => p.category === selectedCategory).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {getSortedProducts(selectedCategory === "all" ? products : products.filter((p: any) => p.category === selectedCategory)).map((product: any) => (
                  <Card key={product._id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`card-product-${product._id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base line-clamp-2">{product.productName || product.name || product.model || "Unknown"}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">{product.brand}</p>
                        </div>
                        <Badge 
                          variant={product.status === 'in_stock' ? 'default' : product.status === 'low_stock' ? 'secondary' : 'destructive'}
                          className="shrink-0"
                        >
                          {product.status === 'in_stock' ? 'In Stock' : product.status === 'low_stock' ? 'Low' : 'Out'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Category:</span>
                        <span className="font-medium">{product.category}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Stock:</span>
                        <span className={`font-bold ${product.stockQty <= product.minStockLevel ? 'text-red-600' : 'text-green-600'}`}>
                          {product.stockQty} units
                        </span>
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground line-through">₹{product.mrp.toLocaleString()}</p>
                            <p className="text-lg font-bold text-primary">₹{product.sellingPrice.toLocaleString()}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {product.discount.toFixed(1)}% off
                          </Badge>
                        </div>
                      </div>
                      {product.warehouseLocation && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                          <Package className="h-3 w-3" />
                          <span>{product.warehouseLocation}</span>
                        </div>
                      )}
                      {product.barcode && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Barcode className="h-3 w-3" />
                          <span className="font-mono">{product.barcode}</span>
                        </div>
                      )}
                      {product.warranty && product.warranty !== 'N/A' && (
                        <div className="text-xs text-muted-foreground">
                          Warranty: {product.warranty}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {(selectedCategory === "all" ? products.length : products.filter((p: any) => p.category === selectedCategory).length) === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No products found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-transactions"
            />
          </div>

          <DataTable
            columns={[
              { 
                header: "Product", 
                accessor: (row) => row.productId?.productName || row.productId?.name || row.productId?.model || "N/A",
              },
              {
                header: "Type",
                accessor: (row) => getTransactionBadge(row.type),
              },
              { 
                header: "Quantity", 
                accessor: (row) => (
                  <span className="font-medium">
                    {row.previousStock !== undefined && row.newStock !== undefined
                      ? `${row.previousStock} → ${row.newStock}`
                      : row.quantity
                    }
                  </span>
                ),
              },
              { header: "Reason", accessor: "reason" },
              { 
                header: "Supplier", 
                accessor: (row) => row.supplierId ? (
                  <div className="space-y-1">
                    <div className="font-medium">{row.supplierId.name}</div>
                    {row.supplierId.contact && (
                      <div className="text-xs text-muted-foreground">{row.supplierId.contact}</div>
                    )}
                    {row.supplierId.email && (
                      <div className="text-xs text-muted-foreground">{row.supplierId.email}</div>
                    )}
                  </div>
                ) : "-",
              },
              { 
                header: "Batch", 
                accessor: (row) => row.batchNumber || "-",
              },
              { 
                header: "Date", 
                accessor: (row) => format(new Date(row.createdAt || row.date), 'MMM dd, yyyy'),
              },
              {
                header: "Action",
                accessor: (row) => (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTransactionToDelete(row);
                      setIsDeleteDialogOpen(true);
                    }}
                    data-testid={`button-delete-transaction-${row._id}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                ),
              },
            ]}
            data={filteredTransactions}
            onRowClick={(row) => {
              setSelectedTransaction(row);
              setIsTransactionDetailOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4">
          {lowStockProducts.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {lowStockProducts.map((product: any) => (
                <Card key={product._id} className="" data-testid={`low-stock-${product._id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.productName || product.name || product.model || "Unknown"}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{product.brand}</p>
                      </div>
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Current Stock:</span>
                      <Badge variant="destructive">{product.stockQty}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Min Level:</span>
                      <span className="font-medium">{product.minStockLevel}</span>
                    </div>
                    {product.warehouseLocation && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Location:</span>
                        <span className="text-sm">{product.warehouseLocation}</span>
                      </div>
                    )}
                    <Button 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={() => {
                        setTransactionFormData({
                          ...transactionFormData,
                          productId: product._id,
                          type: "IN",
                        });
                        setIsTransactionDialogOpen(true);
                      }}
                      data-testid={`button-restock-${product._id}`}
                    >
                      Restock Now
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">All products are adequately stocked</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          <DataTable
            columns={[
              { 
                header: "Product", 
                accessor: (row) => row.productId?.productName || row.productId?.name || row.productId?.model || "N/A",
              },
              { 
                header: "Quantity", 
                accessor: "quantity",
                className: "text-right",
              },
              { 
                header: "Condition", 
                accessor: (row) => (
                  <Badge variant="outline">{row.condition}</Badge>
                ),
              },
              { header: "Reason", accessor: "reason" },
              { 
                header: "Status", 
                accessor: (row) => getReturnStatusBadge(row.status),
              },
              { 
                header: "Refund", 
                accessor: (row) => row.refundAmount ? formatCurrency(row.refundAmount) : "-",
              },
              { 
                header: "Restockable", 
                accessor: (row) => row.restockable ? "Yes" : "No",
              },
              { 
                header: "Date", 
                accessor: (row) => format(new Date(row.returnDate), 'MMM dd, yyyy'),
              },
              {
                header: "Actions",
                accessor: (row) => (
                  row.status === 'pending' ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => processReturnMutation.mutate({
                          id: row._id,
                          data: { status: 'processed', restockable: row.restockable }
                        })}
                        data-testid={`button-process-${row._id}`}
                      >
                        Process
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => processReturnMutation.mutate({
                          id: row._id,
                          data: { status: 'rejected' }
                        })}
                        data-testid={`button-reject-${row._id}`}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : <span className="text-sm text-muted-foreground">-</span>
                ),
              },
            ]}
            data={productReturns}
            onRowClick={(row) => console.log("Return:", row)}
          />
        </TabsContent>
      </Tabs>

      {/* Transaction Detail Dialog */}
      <Dialog open={isTransactionDetailOpen} onOpenChange={setIsTransactionDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Complete information about this inventory transaction
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Transaction Info</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Type:</span>
                        <span>{getTransactionBadge(selectedTransaction.type)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Date:</span>
                        <span className="text-sm font-medium">
                          {format(new Date(selectedTransaction.createdAt || selectedTransaction.date), 'PPP')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">User:</span>
                        <span className="text-sm font-medium">
                          {selectedTransaction.userId?.name || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Product Info</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Product:</span>
                        <span className="text-sm font-medium">
                          {selectedTransaction.productId?.productName || selectedTransaction.productId?.name || selectedTransaction.productId?.model || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Brand:</span>
                        <span className="text-sm">
                          {selectedTransaction.productId?.brand || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Quantity:</span>
                        <span className="text-sm font-medium">
                          {selectedTransaction.quantity}
                        </span>
                      </div>
                      {selectedTransaction.previousStock !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Stock Change:</span>
                          <span className="text-sm font-medium">
                            {selectedTransaction.previousStock} → {selectedTransaction.newStock}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedTransaction.supplierId && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Supplier Details</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Name:</span>
                          <span className="text-sm font-medium">
                            {selectedTransaction.supplierId.name}
                          </span>
                        </div>
                        {selectedTransaction.supplierId.contact && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Contact:</span>
                            <span className="text-sm">
                              {selectedTransaction.supplierId.contact}
                            </span>
                          </div>
                        )}
                        {selectedTransaction.supplierId.email && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Email:</span>
                            <span className="text-sm">
                              {selectedTransaction.supplierId.email}
                            </span>
                          </div>
                        )}
                        {selectedTransaction.supplierId.gstNumber && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">GST:</span>
                            <span className="text-sm">
                              {selectedTransaction.supplierId.gstNumber}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Additional Details</h3>
                    <div className="space-y-2">
                      {selectedTransaction.batchNumber && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Batch Number:</span>
                          <span className="text-sm font-medium">
                            {selectedTransaction.batchNumber}
                          </span>
                        </div>
                      )}
                      {selectedTransaction.unitCost && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Unit Cost:</span>
                          <span className="text-sm font-medium">
                            {formatCurrency(selectedTransaction.unitCost)}
                          </span>
                        </div>
                      )}
                      {selectedTransaction.warehouseLocation && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Location:</span>
                          <span className="text-sm">
                            {selectedTransaction.warehouseLocation}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {selectedTransaction.reason && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Reason</h3>
                  <p className="text-sm bg-muted p-3 rounded-md">
                    {selectedTransaction.reason}
                  </p>
                </div>
              )}

              {selectedTransaction.notes && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
                  <p className="text-sm bg-muted p-3 rounded-md">
                    {selectedTransaction.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (transactionToDelete?._id) {
                  deleteTransactionMutation.mutate(transactionToDelete._id);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
              data-testid="button-confirm-delete-transaction"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
