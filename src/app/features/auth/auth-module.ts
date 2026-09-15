import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CompleteRegistration } from "./pages/complete-registration/complete-registration";
import { LbLogin } from "../lb-login/lb-login";
import { MsalRedirect } from "./pages/msal-redirect/msal-redirect";
import { ActivarContratista } from "./pages/activar-contratista/activar-contratista";

// El login legacy (Abril: tabs Personal/Contratistas/Clínica + Microsoft SSO) queda en
// ./pages/login/login como referencia — ya no está enrutado. Todo el mundo entra por
// LbLogin (mascota Las Bravas), la base del login nuevo.
const routes: Routes = [
  { path: "complete-registration", component: CompleteRegistration },
  { path: "set-password", component: ActivarContratista },
  { path: "login", component: LbLogin },
  { path: "msal-redirect", component: MsalRedirect },
]

@NgModule({
  declarations: [],
  imports: [
    RouterModule.forChild(routes), CommonModule
  ],
  exports: [RouterModule] 
})
export class AuthModule { }
