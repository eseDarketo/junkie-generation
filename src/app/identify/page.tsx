// ============================================================
// /identify — Guest self-identification page
// ============================================================
// Guests open this on their phone to find themselves among
// captured faces, then get redirected to /share/[id].
// See docs/specs/features/IDENTIFY_PAGE.md

import IdentifyStation from '@/components/IdentifyStation';

export const metadata = {
  title: 'PartyFace — Find Yourself',
  description: 'Use your camera to find your singing avatar',
};

export default function IdentifyPage() {
  return <IdentifyStation />;
}
