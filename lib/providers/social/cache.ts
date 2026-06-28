import type { SocialProvider, SocialSeries } from "@/lib/providers/types";
import { readCache } from "@/lib/db/jsonStore";
import { mockSocialProvider } from "@/lib/providers/social/mock";

export const cacheSocialProvider: SocialProvider = {
  id: "cache",
  async getSocial(symbol) {
    const cached = await readCache<SocialSeries>(symbol, "social");
    if (cached && cached.points.length) return cached;
    return mockSocialProvider.getSocial(symbol);
  },
};
