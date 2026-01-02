# Authentication System Setup

## Database Setup

Run this SQL manually in your PostgreSQL database to create the auth tables:

```sql
-- See db/user-auth-tables.sql
```

Or use a PostgreSQL client:
```bash
psql $DATABASE_URL < db/user-auth-tables.sql
```

## Authentication Flow

1. **Sign Up** (`/signup`)
   - User creates account with email/password
   - Account is created in database
   - User is redirected to `/pricing`

2. **Choose Plan** (`/pricing`)
   - User selects a plan
   - For Enterprise: can enter promo code
   - Redirected to Stripe checkout
   - Email is pre-filled from signup

3. **Stripe Checkout**
   - User completes payment
   - On success: redirected to `/login?checkout=success`

4. **Login** (`/login`)
   - User logs in with email/password
   - System checks for active subscription
   - If active: redirected to CRM with JWT token
   - If no subscription: error message

## Environment Variables

Required in Vercel:
- `JWT_SECRET` - Secret key for JWT tokens
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `DATABASE_URL` - PostgreSQL connection string

## API Endpoints

- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/stripe/create-checkout-session` - Create Stripe checkout

## Next Steps

To fully wire up Stripe to CRM:
1. Set up Stripe webhook endpoint (`/api/stripe/webhook`)
2. Listen for `checkout.session.completed` event
3. Create Subscription record linking user to Stripe
4. Create Workspace and WorkspaceUser for new subscribers
