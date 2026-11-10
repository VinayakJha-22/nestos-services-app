
import { redirect } from "next/navigation";
import { getOperationsUser } from "@/lib/operations/auth";
import LoginForm from "./login-form";

export const instant = false;

export default async function OperationsLoginPage() {
  const user = await getOperationsUser();

  if (user) {
    redirect("/operations");
  }

  return <LoginForm />;
}
