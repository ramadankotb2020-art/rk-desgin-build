import { isAuthenticated, json } from "../_utils.js";

export async function onRequestGet({ request, env }) {
  const authed = await isAuthenticated(request, env);
  return json({ authenticated: authed });
}
