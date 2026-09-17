import { LoginForm } from "./login-form";

/*
 * Renderizado en cada petición, no en el build.
 *
 * La CSP lleva un nonce distinto por carga y Next lo aplica a sus scripts
 * durante el renderizado en servidor. Una página generada al compilar no puede
 * llevar el nonce de una petición que todavía no ha ocurrido: sus scripts
 * saldrían sin marcar, el navegador los bloquearía y el formulario no llegaría
 * a hidratarse.
 */
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm />;
}
