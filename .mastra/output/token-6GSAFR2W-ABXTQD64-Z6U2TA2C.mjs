import { r as require_token_util } from './chunk-OS7SAIRA.mjs';
import { _ as __commonJS, r as require_token_error } from './index.mjs';
import '@mastra/core/evals/scoreTraces';
import '@mastra/core/mastra';
import '@mastra/loggers';
import '@mastra/libsql';
import '@mastra/observability';
import '@mastra/core/workflows';
import 'zod';
import '@mastra/core/agent';
import '@mastra/memory';
import './tools/7593f7a3-7653-4484-86ec-46ad6ea747b4.mjs';
import '@mastra/core/tools';
import '@mastra/evals/scorers/prebuilt';
import '@mastra/evals/scorers/utils';
import '@mastra/core/evals';
import './tools/cff13dbd-6d27-485b-9630-9aebb0f89a27.mjs';
import './tools/50584fcd-e4c7-42f6-bb37-1de36a0f62e6.mjs';
import './tools/0f03b96b-7015-4477-9394-e9851aac8b72.mjs';
import './tools/05067bf4-03f2-4d81-8291-febaa880b4ec.mjs';
import './tools/48a19484-a6d8-40ad-aada-703c71b79604.mjs';
import './tools/aaee37df-5629-4cc2-b313-4fede5243596.mjs';
import './tools/e8cda81d-cf1b-454a-a12c-841cc7641868.mjs';
import 'nodemailer';
import './tools/6d798dfc-312a-4d20-b3a5-555173e90194.mjs';
import 'fs/promises';
import 'path';
import 'fs';
import 'url';
import 'https';
import 'http';
import 'http2';
import 'stream';
import 'crypto';
import 'process';
import '@mastra/core/utils/zod-to-json';
import '@mastra/core/workspace';
import '@mastra/core/processors';
import '@mastra/core/error';
import '@mastra/core/features';
import '@mastra/core/llm';
import '@mastra/core/request-context';
import '@mastra/core/utils';
import '@mastra/core/storage';
import '@mastra/core/a2a';
import 'stream/web';
import 'zod/v3';
import 'zod/v4';
import '@mastra/core/memory';
import 'child_process';
import 'module';
import 'util';
import 'os';
import '@mastra/core/server';
import 'buffer';
import './tools.mjs';

// ../memory/dist/token-6GSAFR2W-ABXTQD64.js
var require_token = __commonJS({
  "../../../node_modules/.pnpm/@vercel+oidc@3.0.5/node_modules/@vercel/oidc/dist/token.js"(exports$1, module) {
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    var token_exports = {};
    __export(token_exports, {
      refreshToken: () => refreshToken
    });
    module.exports = __toCommonJS(token_exports);
    var import_token_error = require_token_error();
    var import_token_util = require_token_util();
    async function refreshToken() {
      const { projectId, teamId } = (0, import_token_util.findProjectInfo)();
      let maybeToken = (0, import_token_util.loadToken)(projectId);
      if (!maybeToken || (0, import_token_util.isExpired)((0, import_token_util.getTokenPayload)(maybeToken.token))) {
        const authToken = (0, import_token_util.getVercelCliToken)();
        if (!authToken) {
          throw new import_token_error.VercelOidcTokenError(
            "Failed to refresh OIDC token: login to vercel cli"
          );
        }
        if (!projectId) {
          throw new import_token_error.VercelOidcTokenError(
            "Failed to refresh OIDC token: project id not found"
          );
        }
        maybeToken = await (0, import_token_util.getVercelOidcToken)(authToken, projectId, teamId);
        if (!maybeToken) {
          throw new import_token_error.VercelOidcTokenError("Failed to refresh OIDC token");
        }
        (0, import_token_util.saveToken)(maybeToken, projectId);
      }
      process.env.VERCEL_OIDC_TOKEN = maybeToken.token;
      return;
    }
  }
});
var token6GSAFR2W = require_token();

export { token6GSAFR2W as default };
