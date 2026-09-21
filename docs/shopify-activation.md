# Shopify central app activation

Code-ready is not the same as publicly approved or connected.

Central app: Ecom Panel (`426309615617`), organization `207561466`.
Public distribution is selected. Registration/payment/review are intentionally deferred.

## Prepared flow

1. An existing panel client clicks Connect. With `SHOPIFY_APP_INSTALL_URL` configured,
   Shopify handles store selection/install; otherwise the panel asks only for the shop domain.
2. Shopify opens the app URL with `shop`. Set the app URL to
   `https://founder-weekly-omega.vercel.app/api/oauth/shopify` (the versioned TOML contains this).
3. If the panel session is absent, login preserves only a validated internal Shopify return path.
4. OAuth starts with new state bound to that user and shop. The callback verifies state,
   user, shop and Shopify HMAC before exchanging the code.
5. The encrypted token is saved in the current workspace. Only a confirmed database save
   returns success and starts the initial sync. Authorization does not count as a data sync.

## Activation checklist (not completed by committing this file)

- Release `shopify.app.toml` to the existing Shopify app. It includes the app entry URL,
  callback, read-only scopes, compliance webhook subscriptions and uninstall subscription.
  The earlier dashboard version uses `/integrations`; it must be updated for automatic continuation.
- Configure production `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_SCOPES`,
  and the verified public install/listing URL in `SHOPIFY_APP_INSTALL_URL`.
  Do not use the organization-restricted Dev Dashboard install link as a public client link.
- Keep the secret server-only and out of Git. Redeploy after environment changes.
- Complete Shopify registration and review; request protected customer data and historical
  order access as required. Do not promise a year of orders without `read_all_orders` approval.
- Test with an authorized store: Connect, approve, encrypted persistence, initial sync,
  logout/login, account isolation, decline/cancel, disconnect and uninstall.

Automated tests use fake credentials and a database double; they do not demonstrate live
Shopify approval, installation or data retrieval.

References:
- https://shopify.dev/docs/apps/build/authentication-authorization/authenticate-standalone-apps
- https://shopify.dev/docs/apps/launch/distribution/select-distribution-method
- https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration
