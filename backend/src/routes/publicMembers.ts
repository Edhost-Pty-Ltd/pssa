import { Router } from "express";
import { z } from "zod";
import { notFound } from "../lib/http.js";
import { publicMember, searchPublicMembers } from "../lib/publicRegisterQueries.js";

/** Public member register. Pending applicants are omitted. Status is the live status. */
export const publicMembersRouter = Router();

const searchSchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

publicMembersRouter.get("/members", async (req, res) => {
  const query = searchSchema.parse(req.query);
  res.json(await searchPublicMembers(query));
});

publicMembersRouter.get("/members/:id", async (req, res) => {
  const member = await publicMember(String(req.params.id));
  if (!member) throw notFound("Member not found.");
  res.json({ member });
});