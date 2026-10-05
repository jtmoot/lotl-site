// Stop Cloudflare Workers Builds from deploying a non-main branch to production.
//
// Workers Builds runs this repo's build, then `wrangler deploy`, on EVERY
// branch push, so a stale branch can overwrite the live site right after a
// merge to main (it did on 2026-10-04). Failing the build here means there is
// nothing to deploy. Local builds and GitHub CI never set WORKERS_CI_BRANCH,
// so they are unaffected.
//
// The proper fix lives in the Cloudflare dashboard (Workers Builds: turn off
// non-production branch builds, or set that deploy command to
// `npx wrangler versions upload`). Once that is done this guard is redundant.
const branch = process.env.WORKERS_CI_BRANCH;
if (branch && branch !== 'main') {
  console.error(`Branch "${branch}" is not main: refusing to build so it cannot be deployed to production.`);
  process.exit(1);
}
