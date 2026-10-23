"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/data/auth";
import { SIGN_IN_PATH } from "@/domain/auth/access";

export async function signOutAction() {
  await signOut();
  redirect(SIGN_IN_PATH);
}
