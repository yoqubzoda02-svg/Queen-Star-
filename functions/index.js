const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const STATUS_LABEL = {
  delivery: 'Ваш заказ выехал! 🚚',
  done: 'Заказ доставлен! Спасибо за покупку 🎉',
  cancelled: 'Заказ отменён',
};

// Fires whenever an order document changes; sends a push only when the
// `status` field actually changed to one the customer cares about, and only
// to customers who enabled notifications (have a saved fcmTokens array).
exports.orderStatusPush = onDocumentUpdated('shop_orders/{orderId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();
  if (!after || before.status === after.status) return;

  const label = STATUS_LABEL[after.status];
  if (!label) return;

  const phoneId = (after.customerPhone || '').replace(/\D/g, '');
  if (!phoneId) return;

  const customerSnap = await db.doc(`shop_customers/${phoneId}`).get();
  const tokens = customerSnap.exists ? (customerSnap.data().fcmTokens || []) : [];
  if (!tokens.length) return;

  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title: 'Queen Star', body: `${after.productName} — ${label}` },
  });

  // Drop tokens that are no longer valid (uninstalled app, revoked permission, etc.)
  const dead = [];
  res.responses.forEach((r, i) => {
    if (!r.success && ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(r.error?.code)) {
      dead.push(tokens[i]);
    }
  });
  if (dead.length) {
    await db.doc(`shop_customers/${phoneId}`).update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...dead),
    });
  }
});
