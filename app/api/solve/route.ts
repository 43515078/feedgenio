import { NextResponse } from "next/server";
import { solveFormula } from "@/lib/solver";
import { defaultRequirement, type Requirement } from "@/lib/requirements";
import type { Ingredient } from "@/lib/ingredients";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ingredients = body.ingredients as Ingredient[];
    const requirement = (body.requirement || defaultRequirement) as Requirement;

    const result = solveFormula(ingredients, requirement);

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { feasible: false, message: "Error calculando la fórmula." },
      { status: 500 }
    );
  }
}
