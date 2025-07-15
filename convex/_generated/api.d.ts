/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as chatSystem from "../chatSystem.js";
import type * as constants from "../constants.js";
import type * as helpers from "../helpers.js";
import type * as identifyPlant from "../identifyPlant.js";
import type * as index from "../index.js";
import type * as medicinalQA from "../medicinalQA.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  chatSystem: typeof chatSystem;
  constants: typeof constants;
  helpers: typeof helpers;
  identifyPlant: typeof identifyPlant;
  index: typeof index;
  medicinalQA: typeof medicinalQA;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
