/** Suggests the customer knowledge base to use based on a free-text customer/tenant name. */
export function detectKbFromCustomer(customer?: string | null): 'none' | 'pil' | 'apical' {
  const name = customer?.toLowerCase() ?? '';
  if (!name) return 'none';
  if (name.includes('apical') || name.includes('ats')) return 'apical';
  if (name.includes('pil') || name.includes('pacific interlink')) return 'pil';
  return 'none';
}
