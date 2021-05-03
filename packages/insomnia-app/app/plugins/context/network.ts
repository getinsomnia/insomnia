import { send } from '../../network/network';
import type { Request } from '../../models/request';
import * as models from '../../models';
import type { ExtraRenderInfo } from '../../common/render';
export function init(
  activeEnvironmentId: string | null,
): {
  network: Record<string, any>;
} {
  const network = {
    async sendRequest(request: Request, extraInfo?: ExtraRenderInfo) {
      const responsePatch = await send(request._id, activeEnvironmentId || undefined, extraInfo);
      const settings = await models.settings.getOrCreate();
      return models.response.create(responsePatch, settings.maxHistoryResponses);
    },
  };
  return {
    network,
  };
}
