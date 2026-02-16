// Mock data for Invoice Home clone

export const mockTemplates = [
  {
    id: 1,
    name: "Modern Blue",
    thumbnail: "https://images.unsplash.com/photo-1554224311-beee460ae6ba?w=400&h=500&fit=crop",
    color: "#2563eb",
    style: "modern",
    type: "default"
  },
  {
    id: 2,
    name: "Professional Green",
    thumbnail: "https://images.unsplash.com/photo-1554224311-beee460ae6ba?w=400&h=500&fit=crop",
    color: "#059669",
    style: "professional",
    type: "default"
  },
  {
    id: 3,
    name: "Classic Black",
    thumbnail: "https://images.unsplash.com/photo-1554224311-beee460ae6ba?w=400&h=500&fit=crop",
    color: "#1f2937",
    style: "classic",
    type: "default"
  },
  {
    id: 4,
    name: "Creative Purple",
    thumbnail: "https://images.unsplash.com/photo-1554224311-beee460ae6ba?w=400&h=500&fit=crop",
    color: "#7c3aed",
    style: "creative",
    type: "default"
  },
  {
    id: 5,
    name: "Elegant Orange",
    thumbnail: "https://images.unsplash.com/photo-1554224311-beee460ae6ba?w=400&h=500&fit=crop",
    color: "#ea580c",
    style: "elegant",
    type: "default"
  },
  {
    id: 6,
    name: "Simple Gray",
    thumbnail: "https://images.unsplash.com/photo-1554224311-beee460ae6ba?w=400&h=500&fit=crop",
    color: "#6b7280",
    style: "simple",
    type: "default"
  },
  {
    id: 7,
    name: "Olas Azules",
    thumbnail: "https://customer-assets.emergentagent.com/job_b3f4ff57-e03f-4202-b03a-ed6cf31eff1d/artifacts/a9i7im3s_modelo-cotizacion-es-buena-onda-750px.png",
    color: "#4AABE3",
    style: "wave",
    type: "wave"
  }
];

export const mockInvoice = {
  id: "INV-001",
  number: "001",
  date: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  status: "draft",
  from: {
    name: "Your Company Name",
    email: "company@example.com",
    phone: "+1 (555) 123-4567",
    address: "123 Business St",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "USA"
  },
  to: {
    name: "Client Name",
    email: "client@example.com",
    phone: "+1 (555) 987-6543",
    address: "456 Client Ave",
    city: "Los Angeles",
    state: "CA",
    zip: "90001",
    country: "USA"
  },
  items: [
    {
      id: 1,
      description: "Web Design Services",
      quantity: 1,
      rate: 1500.00,
      amount: 1500.00
    },
    {
      id: 2,
      description: "Logo Design",
      quantity: 1,
      rate: 500.00,
      amount: 500.00
    },
    {
      id: 3,
      description: "SEO Optimization",
      quantity: 3,
      rate: 200.00,
      amount: 600.00
    }
  ],
  subtotal: 2600.00,
  taxRate: 10,
  tax: 260.00,
  total: 2860.00,
  notes: "Thank you for your business!",
  terms: "Payment due within 30 days",
  template: 1
};

export const mockInvoices = [
  {
    id: "INV-001",
    number: "001",
    clientName: "Acme Corporation",
    date: "2025-01-15",
    dueDate: "2025-02-14",
    total: 2860.00,
    status: "paid"
  },
  {
    id: "INV-002",
    number: "002",
    clientName: "Tech Solutions Inc",
    date: "2025-01-20",
    dueDate: "2025-02-19",
    total: 4250.00,
    status: "pending"
  },
  {
    id: "INV-003",
    number: "003",
    clientName: "Creative Agency",
    date: "2025-01-25",
    dueDate: "2025-02-24",
    total: 1750.00,
    status: "draft"
  },
  {
    id: "INV-004",
    number: "004",
    clientName: "Global Enterprises",
    date: "2025-02-01",
    dueDate: "2025-03-03",
    total: 5680.00,
    status: "overdue"
  }
];

export const getInvoiceById = (id) => {
  return mockInvoices.find(inv => inv.id === id) || mockInvoice;
};

export const getTemplateById = (id) => {
  return mockTemplates.find(temp => temp.id === id) || mockTemplates[0];
};