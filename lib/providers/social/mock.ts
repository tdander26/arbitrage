import type { SocialProvider } from "@/lib/providers/types";
import { generateBundle } from "@/lib/providers/mock/generate";

export const mockSocialProvider: SocialProvider = {
  id: "mock",
  async getSocial(symbol) {
    return generateBundle(symbol).social;
  },
};
