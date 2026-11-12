# GitHub Pages handoff

The generated real pilot is static and ready to serve from its meta/site directory. The source repository root is the synthetic fixture; publishing that root alone will not include the real pilot. Prepare the approved generated site as a deployment artifact when publication is requested. All assets use relative paths, so both a user site and `https://<owner>.github.io/<repository>/` work. Hash routes require no rewrite rule. `.nojekyll` disables Jekyll processing.

No GitHub repository, remote, push, public publication, custom domain or QR card has been created in this task. The user requested an Avalon draft first.

When publication is requested, create/select the repository, publish the approved generated site through a Pages artifact or deployment branch, with its index.html at the served root. Use the resulting literal base URL for the two cards:

- General card: `<base>/`
- Poster-session card: `<base>/#hga`

The current-view copy button can preserve a selected metric, comparison view, alignment, ROI, overlap scope hemisphere, direction selection and event-relative time. Never print a loopback/file URL onto cards. Finalize authors, poster PDF and synthetic-versus-real presentation before treating this as the final project page.

For local remote-host development, forward port 4173 using the SSH connection for this host, then open the forwarded URL on the same client. A loopback URL on the compute host is not a mobile/public preview. No long-running preview server is left behind by automated QA.
