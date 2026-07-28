import { stripe } from './stripe';
import { METER_EVENT_NAME } from './metered-usage';

// Idempotent — safe to call more than once. Creates a Stripe Billing Meter
// and a metered Price for "tasks created" usage if they don't already
// exist. This is the one piece of #22 that needs a real Stripe API call to
// verify; if this account/API version can't create Billing Meters for any
// reason, the rest of the app keeps working regardless — recordUsage() in
// metered-usage.ts already writes to the local usage ledger unconditionally
// and only logs a warning if Stripe reporting isn't available.
export async function ensureMeteredBillingSetup() {
  const meters = await stripe.billing.meters.list({ status: 'active' });
  let meter = meters.data.find((m) => m.event_name === METER_EVENT_NAME);

  if (!meter) {
    meter = await stripe.billing.meters.create({
      display_name: 'Tasks Created',
      event_name: METER_EVENT_NAME,
      default_aggregation: { formula: 'sum' },
      customer_mapping: { type: 'by_id', event_payload_key: 'stripe_customer_id' }
    });
    console.log(`Created Stripe Billing Meter: ${meter.id}`);
  } else {
    console.log(`Stripe Billing Meter already exists: ${meter.id}`);
  }

  const products = await stripe.products.list({ active: true });
  let product = products.data.find((p) => p.name === 'Task Overage');

  if (!product) {
    product = await stripe.products.create({
      name: 'Task Overage',
      description: 'Metered add-on: $0.01 per task created beyond the plan limit'
    });
    console.log(`Created Stripe product: ${product.id}`);
  } else {
    console.log(`Stripe product already exists: ${product.id}`);
  }

  const prices = await stripe.prices.list({ product: product.id, active: true });
  let price = prices.data.find((p) => p.recurring?.meter === meter!.id);

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: 'usd',
      unit_amount_decimal: '1', // $0.01 per task, in cents
      recurring: {
        interval: 'month',
        usage_type: 'metered',
        meter: meter.id
      }
    });
    console.log(`Created metered price: ${price.id}`);
  } else {
    console.log(`Metered price already exists: ${price.id}`);
  }

  return { meter, product, price };
}

if (require.main === module) {
  ensureMeteredBillingSetup()
    .then((result) => {
      console.log('Metered billing setup complete:', {
        meterId: result.meter.id,
        productId: result.product.id,
        priceId: result.price.id
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error('Metered billing setup failed:', error);
      process.exit(1);
    });
}
