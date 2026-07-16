import { SetupWizard } from "./setup-wizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Set up Headtower",
};

/**
 * First-run wizard entry. Prefills the Headscale URL when one was provided via
 * the env bootstrap but the key is still missing, so a partial env setup is easy
 * to finish in the UI.
 */
export default function SetupPage() {
  const initialUrl = process.env.HEADSCALE_URL?.trim() ?? "";
  const encryptsSecrets = Boolean(process.env.HEADTOWER_SECRET?.trim());
  // When HEADTOWER_SETUP_TOKEN is set, the setup actions require it - so the
  // wizard must collect it. The token itself never leaves the server; only this
  // boolean does.
  const requiresToken = Boolean(process.env.HEADTOWER_SETUP_TOKEN?.trim());
  return (
    <SetupWizard
      initialUrl={initialUrl}
      encryptsSecrets={encryptsSecrets}
      requiresToken={requiresToken}
    />
  );
}
