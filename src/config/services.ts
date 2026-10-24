import type { Service } from "@/types/service";

export const services: Service[] = [
  {
    id: "exterior-cleaning",
    name: "Exterior Cleaning",
    price: 349,
    description: "Exterior-focused car care at your residential society.",
  },
  {
    id: "interior-exterior-cleaning",
    name: "Exterior + Interior Cleaning",
    price: 499,
    description: "Interior and exterior car care at your residential society.",
    featured: true,
  },
  {
    id: "premium-cleaning",
    name: "Premium Cleaning",
    price: 799,
    description: "Our premium car-care service, delivered at your society.",
  },
];