import { resetTo } from "./navigationRef";

export function routeAfterAuthChange() {
  resetTo("Gate");
}

export function routeToEmployerHome() {
  resetTo("EmployerRoot");
}