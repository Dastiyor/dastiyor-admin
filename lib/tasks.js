import { HttpError } from "./api";

export const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
export const URGENCIES = ["low", "normal", "urgent"];
export const BUDGET_TYPES = ["fixed", "negotiable"];
export const MAX_FEATURED = 3;

/** "1 500 TJS" -> 1500. Keeps budgetAmountNum (used for sorting) in step with the text. */
export function budgetToNum(text) {
  if (text == null || text === "") return null;
  const n = parseFloat(String(text).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

function oneOf(value, allowed, label) {
  if (!allowed.includes(value)) throw new HttpError(400, `Invalid ${label}`);
  return value;
}

/** Validate and map a task body to Prisma data. `partial` skips required checks (PUT). */
export function taskData(body, { partial = false } = {}) {
  const data = {};
  const text = (key, required) => {
    if (body[key] === undefined) {
      if (required && !partial) throw new HttpError(400, `${key} is required`);
      return;
    }
    const v = String(body[key] ?? "").trim();
    if (required && !v) throw new HttpError(400, `${key} is required`);
    data[key] = v || null;
  };
  text("title", true);
  text("description", true);
  text("category", true);
  text("city", true);
  text("subcategory", false);
  text("address", false);
  if (body.budgetAmount !== undefined) {
    data.budgetAmount = body.budgetAmount === "" || body.budgetAmount == null ? null : String(body.budgetAmount).trim();
    data.budgetAmountNum = budgetToNum(data.budgetAmount);
  }
  if (body.budgetType !== undefined) data.budgetType = oneOf(body.budgetType, BUDGET_TYPES, "budget type");
  else if (!partial) data.budgetType = "negotiable";
  if (body.urgency !== undefined) data.urgency = oneOf(body.urgency, URGENCIES, "urgency");
  if (body.status !== undefined) data.status = oneOf(body.status, TASK_STATUSES, "status");
  if (body.dueDate !== undefined) {
    if (!body.dueDate) data.dueDate = null;
    else if (Number.isNaN(Date.parse(body.dueDate))) throw new HttpError(400, "Invalid due date");
    else data.dueDate = new Date(body.dueDate);
  }
  if (body.userId) data.userId = String(body.userId).trim();
  else if (!partial) throw new HttpError(400, "userId is required");
  return data;
}
