AI-Nutrition V17 — Performance + Interface + Subscriptions

PERFORMANCE
- Replaced broad allData()/clientData() usage on visible pages with focused loaders.
- Admin client list now fetches only 7-day nutrition/activity data and builds maps once instead of filtering the full meal array per client repeatedly.
- Client home fetches only 7 days, one digest, one weight and current profile/settings/subscription.
- Client progress fetches only 14 days and bounded weight/digest history.
- Client nutrition history is bounded to 45 days instead of loading the entire account history.
- Client support is bounded to 250 messages.
- Admin dialogs load recent support messages first and only then fetch profiles for the chat IDs actually present.
- Admin command palette no longer loads hundreds of client profiles on every admin page; clients are fetched lazily only when search opens.
- Bot canonical client-state endpoint no longer calls heavy clientData().
- Added focused database indexes in 007_performance_indexes.sql.

INTERFACE / INFORMATION ARCHITECTURE
Admin sidebar:
- Overview
- Clients
- Dialogs
- Activity
- Analytics
- Food Cache
- Subscriptions
- Mailings

Client sidebar:
- Home
- Nutrition
- Progress
- Subscription
- Support
- Profile

ADMIN
- Faster clients page with search and filters for goal, plan and activity.
- Client list shows today + active nutrition days instead of loading lifetime meal-session history.
- Client detail is bounded to 14 days and shows focused nutrition, profile, signals, calendar, weight and selected-day meals.
- Dedicated Activity page for churn/inactivity operations.
- Dedicated Food Cache page so analytics stays business-focused.
- Dialogs use Telegram avatars, unread-first ordering and lighter profile/message queries.
- Subscriptions page now has business metrics, plan structure and active subscriber list.

CLIENT
- Home shows data freshness and a clear subscription teaser.
- Profile keeps Telegram synchronization and freshness information.
- Progress shows data freshness and focused 7/14-day trends.
- New Subscription page with Basic/Premium comparison.
- Mobile navigation scrolls horizontally instead of squeezing too many tabs.

PLAN STRUCTURE
BASIC
- Photo/manual food tracking
- Calories/macros and meal history
- Daily targets and remaining macros
- Basic weight/calorie progress
- Profile/goals
- Service support

PREMIUM
- Everything in Basic
- AI daily summary
- Next-meal recommendations
- Advanced 7/14-day analysis
- Signals for protein/calorie/consistency issues
- Priority recognition for complex products
- Personalized weekly trends
- Priority support

DEPLOY
1. Run supabase/migrations/007_performance_indexes.sql in Supabase SQL Editor.
2. Deploy the V17 site package to GitHub/Vercel.
3. Existing 006_telegram_avatars.sql must already be applied for Telegram avatar refresh/freshness fields.

VALIDATION
- TypeScript/TSX source was syntax-parsed with the installed TypeScript compiler: 0 syntax errors.
- Full next build could not be executed in this environment because npm dependency installation timed out.
