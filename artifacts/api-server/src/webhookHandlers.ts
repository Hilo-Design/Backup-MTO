import { eq } from 'drizzle-orm';
import { db, planSettingsTable } from '@workspace/db';
import { getStripeSync } from './stripeClient';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // stripe-replit-sync verifies the signature and syncs data to stripe.* tables.
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    // Parse the verified event and update plan_settings.
    // For subscription events: throw on failure so the webhook endpoint returns
    // a non-2xx status and Stripe retries — preventing silent entitlement loss.
    const event = JSON.parse(payload.toString());
    const isSubscriptionEvent = [
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'checkout.session.completed',
    ].includes(event.type);

    try {
      await WebhookHandlers.handleSubscriptionEvent(event);
    } catch (err) {
      if (isSubscriptionEvent) {
        throw new Error(
          'Plan entitlement update failed for ' + event.type + ': ' +
          (err instanceof Error ? err.message : String(err))
        );
      }
      console.error('Non-critical webhook handler error:', err);
    }
  }

  static async handleSubscriptionEvent(event: { type: string; data: { object: any } }): Promise<void> {
    const { type, data } = event;

    const eventObject = data.object;
    const customerId = typeof eventObject.customer === 'string'
      ? eventObject.customer
      : null;

    // Webhooks are not authenticated as an app user. Resolve the plan by the
    // Stripe customer recorded during checkout instead of updating the first
    // row in the table (which would leak entitlements across users).
    const [plan] = customerId
      ? await db
          .select()
          .from(planSettingsTable)
          .where(eq(planSettingsTable.stripeCustomerId, customerId))
          .limit(1)
      : [];
    if (!plan) return;

    if (type === 'customer.subscription.created' || type === 'customer.subscription.updated') {
      const sub = data.object;

      // Verify this event belongs to our stored customer (ownership check).
      // Allow if we haven't stored a customer yet (first purchase).
      if (plan.stripeCustomerId && sub.customer && plan.stripeCustomerId !== sub.customer) {
        throw new Error(
          `Customer mismatch: event customer ${sub.customer} does not match stored customer ${plan.stripeCustomerId}`
        );
      }

      const isActive = sub.status === 'active' || sub.status === 'trialing';
      const renewalDate = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString().slice(0, 10)
        : null;

      await db
        .update(planSettingsTable)
        .set({
          plan: isActive ? 'pro' : 'free',
          stripeCustomerId: sub.customer ?? plan.stripeCustomerId,
          stripeSubscriptionId: sub.id,
          renewalDate,
          updatedAt: new Date(),
        })
        .where(eq(planSettingsTable.id, plan.id));

    } else if (type === 'customer.subscription.deleted') {
      const sub = data.object;

      // Only reset the plan if the deleted subscription belongs to our customer.
      if (plan.stripeCustomerId && sub.customer && plan.stripeCustomerId !== sub.customer) {
        return; // ignore events from other customers
      }

      await db
        .update(planSettingsTable)
        .set({
          plan: 'free',
          renewalDate: null,
          updatedAt: new Date(),
        })
        .where(eq(planSettingsTable.id, plan.id));

    } else if (type === 'checkout.session.completed') {
      const session = data.object;
      if (session.customer) {
        // Verify customer ownership — only update if this is our customer or we have no customer yet.
        if (plan.stripeCustomerId && plan.stripeCustomerId !== session.customer) {
          throw new Error(
            `Customer mismatch on checkout: ${session.customer} vs stored ${plan.stripeCustomerId}`
          );
        }
        await db
          .update(planSettingsTable)
          .set({ stripeCustomerId: session.customer, updatedAt: new Date() })
          .where(eq(planSettingsTable.id, plan.id));
      }
    }
  }
}
