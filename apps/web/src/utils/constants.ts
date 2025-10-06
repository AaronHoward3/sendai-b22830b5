export const SYS_PLANS = [
    { 
      key: 'PAYG', title: 'Pay As You Go', priceLabel: '$9 one-time', blurb: 'Simple credits pack. No renewal.',
      priceId: import.meta.env.VITE_STRIPE_PRICE_PAYG as string | undefined,
      bullets: ['10 emails', '1 image', '20 revisions', '1 brand'],
      quotas: { 
        emails: 10, images: 1, revisions: 20, brands: 1 } 
      },
    { 
      key: 'STARTER', 
      title: 'Starter', priceLabel: '$19 / mo', blurb: 'For getting started with regular campaigns.',
      priceId: import.meta.env.VITE_STRIPE_PRICE_STARTER as string | undefined,
      bullets: ['30 emails', '5 images', '60 revisions', '2 brands'],
      quotas: { 
        emails: 30, images: 5, revisions: 60, brands: 2 } 
      },
    { 
      key: 'GROWTH', title: 'Growth', priceLabel: '$49 / mo', blurb: 'For growing teams and higher volume.',
      priceId: import.meta.env.VITE_STRIPE_PRICE_GROWTH as string | undefined,
      bullets: ['120 emails', '25 images', '300 revisions', '5 brands'],
      quotas: { 
        emails: 300/2, images: 25, revisions: 300, brands: 5 } 
      },
    { 
      key: 'SCALE', title: 'Scale', priceLabel: '$99 / mo', blurb: 'For scale and frequent iterations.',
      priceId: import.meta.env.VITE_STRIPE_PRICE_SCALE as string | undefined,
      bullets: ['300 emails', '75 images', '900 revisions', '15 brands'],
      quotas: { 
        emails: 300, images: 75, revisions: 900, brands: 15 } 
      },
];
export const API_ROOT = '/api';