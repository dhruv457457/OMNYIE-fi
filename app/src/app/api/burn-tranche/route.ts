// burn_tranche requires the user as signer, so it cannot be executed server-side.
// The burn is bundled into the same client-signed transaction as the withdraw instruction.
// This route is kept as a stub for future use (e.g. admin burn, analytics).
export async function POST() {
  return Response.json(
    { error: "burn_tranche must be signed by the user — use the client-side withdraw flow" },
    { status: 400 }
  );
}
