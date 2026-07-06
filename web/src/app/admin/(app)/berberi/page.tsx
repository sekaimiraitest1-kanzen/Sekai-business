import { getBarberProfiles } from "./actions";
import { BerberiClient } from "./berberi-client";

export default async function BerberiPage() {
  const barbers = await getBarberProfiles();
  return <BerberiClient barbers={barbers} />;
}
