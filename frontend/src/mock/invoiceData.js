// Mock data for Invoice Home clone

// Colores disponibles para las plantillas
export const templateColors = [
  { id: 'black', name: 'Negro', hex: '#1f2937' },
  { id: 'gray', name: 'Gris', hex: '#6b7280' },
  { id: 'red', name: 'Rojo', hex: '#DC2626' },
  { id: 'pink', name: 'Rosado', hex: '#ec4899' },
  { id: 'purple', name: 'Morado', hex: '#7c3aed' },
  { id: 'orange', name: 'Naranja', hex: '#ea580c' },
  { id: 'yellow', name: 'Amarillo', hex: '#ca8a04' },
  { id: 'blue', name: 'Azul', hex: '#2563EB' },
  { id: 'cyan', name: 'Cyan', hex: '#0891b2' },
  { id: 'green', name: 'Verde', hex: '#059669' },
  { id: 'lime', name: 'Lima', hex: '#84cc16' },
];

// Plantillas base (solo 5 diseños únicos)
export const mockTemplates = [
  {
    id: 1,
    name: "Clásica",
    thumbnail: null,
    color: "#1f2937",
    style: "classic",
    type: "default",
    supportsColor: true
  },
  {
    id: 2,
    name: "Moderno",
    thumbnail: "https://customer-assets.emergentagent.com/job_4b4e60b7-72b2-4913-be5c-ff8a02d8cf3d/artifacts/ljexcauz_modelo-cotizacion-es-moderno-rojo-750px.png",
    color: "#558B2F",
    style: "moderno",
    type: "moderno",
    supportsColor: true
  },
  {
    id: 3,
    name: "Olas",
    thumbnail: "https://customer-assets.emergentagent.com/job_b3f4ff57-e03f-4202-b03a-ed6cf31eff1d/artifacts/a9i7im3s_modelo-cotizacion-es-buena-onda-750px.png",
    color: "#4AABE3",
    style: "wave",
    type: "wave",
    supportsColor: true
  },
  {
    id: 4,
    name: "Dexter",
    thumbnail: "https://customer-assets.emergentagent.com/job_4b4e60b7-72b2-4913-be5c-ff8a02d8cf3d/artifacts/aegsn5y2_modelo-cotizacion-es-dexter-750px.png",
    color: "#1565C0",
    style: "colorful",
    type: "dexter",
    supportsColor: true
  },
  {
    id: 5,
    name: "Cuenta de Cobro",
    thumbnail: "https://static.prod-images.emergentagent.com/jobs/380f7905-e22e-4890-bf32-ad048c328c8c/images/21106796b14a0c297a5cce514001ee66d41cc9354b26183075cfce3e6c6e17fb.png",
    color: "#84cc16",
    style: "cuenta_cobro",
    type: "cuenta_cobro",
    supportsColor: true,
    documentTypeOnly: "Cuenta de Cobro"
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