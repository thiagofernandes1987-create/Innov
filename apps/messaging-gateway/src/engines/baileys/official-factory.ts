import type {
  AuthenticationState,
  UserFacingSocketConfig,
  WASocket
} from "@whiskeysockets/baileys";
import type { BaileysSocketFactory, BaileysSocketPort } from "./contracts.js";
import { BaileysAdapterError, normalizeBaileysError } from "./errors.js";

export type OfficialBaileysModule = {
  makeWASocket(config: UserFacingSocketConfig): WASocket;
};

export type OfficialBaileysModuleLoader = () => Promise<OfficialBaileysModule>;

export type OfficialBaileysNetworkAuthorization =
  | "DENIED"
  | "AUTHORIZED_TEST_DOUBLE"
  | "AUTHORIZED_FUTURE_RUNTIME";

export function createOfficialBaileysSocketFactory(input: {
  authResolver: (channelAccountId: string) => Promise<AuthenticationState>;
  authorization: (channelAccountId: string) => OfficialBaileysNetworkAuthorization;
  moduleLoader?: OfficialBaileysModuleLoader;
  socketConfig?: Omit<UserFacingSocketConfig, "auth">;
}): BaileysSocketFactory {
  const loadModule = input.moduleLoader ?? (async () => {
    const module = await import("@whiskeysockets/baileys");
    return { makeWASocket: module.makeWASocket };
  });

  return async ({ channelAccountId }): Promise<BaileysSocketPort> => {
    const authorization = input.authorization(channelAccountId);
    if (
      authorization !== "AUTHORIZED_TEST_DOUBLE" &&
      authorization !== "AUTHORIZED_FUTURE_RUNTIME"
    ) {
      throw new BaileysAdapterError(
        "EXTERNAL_SOCKET_BLOCKED",
        "Criação de socket externo bloqueada pelo gate operacional.",
        false
      );
    }

    try {
      const [auth, module] = await Promise.all([
        input.authResolver(channelAccountId),
        loadModule()
      ]);
      const config: UserFacingSocketConfig = {
        ...(input.socketConfig ?? {}),
        auth,
        printQRInTerminal: false,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        emitOwnEvents: false
      };
      return module.makeWASocket(config) as unknown as BaileysSocketPort;
    } catch (error) {
      throw normalizeBaileysError(error, "SOCKET_FACTORY_FAILED");
    }
  };
}
