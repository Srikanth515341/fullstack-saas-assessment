import { eq, and, gte, count, isNotNull } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { meteredUsage, teams } from '@/lib/db/schema';
import { stripe } from './stripe';

// Stripe's usage-based billing event name for this app's single metered
// dimension: tasks created. Kept as a constant rather than per-team
// configuration since this app only meters one thing.
export const METER_EVENT_NAME = 'task_created';

// The local ledger is the source of truth for "how much has this team
// used" — it's written unconditionally. Reporting to Stripe is best-effort
// on top of that: if the team isn't on a metered plan yet, or Stripe's
// Billing Meters aren't configured on this account, the local write still
// succeeds and the row is just never marked `reportedToStripeAt`. That's
// what makes this safe to run against a Stripe test account that hasn't
// (or can't) set up metered billing.
export async function recordUsage(teamId: number, eventType: string = METER_EVENT_NAME) {
  const [row] = await db
    .insert(meteredUsage)
    .values({ teamId, eventType, quantity: 1 })
    .returning();

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team?.stripeCustomerId) {
    return row;
  }

  try {
    await stripe.billing.meterEvents.create({
      event_name: eventType,
      payload: {
        stripe_customer_id: team.stripeCustomerId,
        value: '1'
      }
    });

    await db
      .update(meteredUsage)
      .set({ reportedToStripeAt: new Date() })
      .where(eq(meteredUsage.id, row.id));
  } catch (error) {
    // Expected and harmless if this Stripe account has no Billing Meter
    // named `task_created` yet (see lib/payments/setup-metered-billing.ts).
    // The local usage row above already recorded the real usage either way.
    console.warn(
      `Stripe meter event reporting failed for team ${teamId} (usage was still recorded locally):`,
      error instanceof Error ? error.message : error
    );
  }

  return row;
}

// Looks up the metered price created by `ensureMeteredBillingSetup()`
// (lib/payments/setup-metered-billing.ts), if it exists. Returns null
// rather than throwing when metered billing hasn't been set up on this
// Stripe account — callers should treat that as "skip the add-on," not an
// error, so checkout keeps working on accounts where this was never run.
export async function getMeteredPriceId(): Promise<string | null> {
  try {
    const meters = await stripe.billing.meters.list({ status: 'active' });
    const meter = meters.data.find((m) => m.event_name === METER_EVENT_NAME);
    if (!meter) {
      return null;
    }

    const prices = await stripe.prices.list({ active: true, limit: 100 });
    const price = prices.data.find((p) => p.recurring?.meter === meter.id);
    return price?.id ?? null;
  } catch (error) {
    console.warn('Could not look up metered price:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function getUsageSummaryForTeam(teamId: number) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [{ total }] = await db
    .select({ total: count() })
    .from(meteredUsage)
    .where(and(eq(meteredUsage.teamId, teamId), gte(meteredUsage.createdAt, periodStart)));

  const [{ reportedTotal }] = await db
    .select({ reportedTotal: count() })
    .from(meteredUsage)
    .where(
      and(
        eq(meteredUsage.teamId, teamId),
        gte(meteredUsage.createdAt, periodStart),
        isNotNull(meteredUsage.reportedToStripeAt)
      )
    );

  return {
    periodStart,
    totalEvents: total,
    reportedToStripe: reportedTotal
  };
}
