import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Creating Svasth Pro product in Stripe...');

    // Check if already exists
    const existing = await stripe.products.search({
      query: "name:'Svasth Pro' AND active:'true'",
    });
    if (existing.data.length > 0) {
      console.log('Svasth Pro already exists:', existing.data[0].id);
      // List its prices
      const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
      prices.data.forEach(p =>
        console.log(`  Price: ${p.id}  ${p.unit_amount} ${p.currency} / ${(p.recurring as any)?.interval}`)
      );
      return;
    }

    const product = await stripe.products.create({
      name: 'Svasth Pro',
      description: 'Unlimited AI advisor checks, 12-week trend analysis, and an ad-free experience.',
    });
    console.log('Created product:', product.id);

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 29900, // ₹299 in paise (Stripe INR uses smallest currency unit)
      currency: 'inr',
      recurring: { interval: 'month' },
    });
    console.log(`Created price: ₹299/month  (${price.id})`);

    console.log('\n✓ Done! Webhooks will sync this to the database automatically.');
  } catch (err: any) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createProducts();
