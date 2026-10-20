export const SERVICE_MIN_IMAGES = 1;

export const SERVICE_WIZARD_STEPS = [
  { id: 'basics', title: 'Basics' },
  { id: 'catalog', title: 'Catalog' },
  { id: 'booking', title: 'Booking' },
  { id: 'pricing', title: 'Pricing & SEO' },
  { id: 'review', title: 'Review' },
] as const;

export type ServiceWizardStepId = (typeof SERVICE_WIZARD_STEPS)[number]['id'];
